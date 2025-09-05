import { spawn } from 'child_process';
import { Transform, Readable } from 'stream';
import { pipeline } from 'stream/promises';
import winston from 'winston';
import { v4 as uuidv4 } from 'uuid';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'claude-cli' }
});

class ClaudeCLI {
  constructor() {
    this.activeProcesses = new Map();
    this.processTimeoutMs = 120000; // 2 minutes
    this.maxConcurrentProcesses = 10;
  }

  /**
   * Execute a Claude CLI command with streaming output
   * @param {Object} options - Command options
   * @param {string} options.message - The message to send
   * @param {string} options.sessionId - Optional session ID to resume
   * @param {string} options.projectPath - Project path for context
   * @param {Array<string>} options.flags - Additional CLI flags
   * @param {boolean} options.stream - Whether to stream the response
   * @param {string} options.outputFormat - Output format (text, json, stream-json)
   * @param {string} options.inputFormat - Input format (text, stream-json)
   * @returns {Promise<Object>}
   */
  async executeCommand(options = {}) {
    const {
      message,
      sessionId,
      projectPath,
      flags = [],
      stream = false,
      outputFormat = 'json',
      inputFormat = 'text',
      verbose = false
    } = options;

    if (this.activeProcesses.size >= this.maxConcurrentProcesses) {
      throw new Error('Maximum concurrent processes reached');
    }

    const processId = uuidv4();
    const startTime = Date.now();

    try {
      const args = this.buildClaudeArgs({
        sessionId,
        flags,
        outputFormat,
        inputFormat,
        verbose,
        stream
      });

      logger.info('Starting Claude CLI process', {
        processId,
        args,
        projectPath,
        stream,
        outputFormat
      });

      const result = stream 
        ? await this.executeStreamingCommand(processId, args, message, projectPath)
        : await this.executeNonStreamingCommand(processId, args, message, projectPath);

      const executionTime = Date.now() - startTime;
      
      logger.info('Claude CLI process completed', {
        processId,
        executionTimeMs: executionTime,
        outputSize: result.output ? result.output.length : 0
      });

      return {
        success: true,
        processId,
        executionTimeMs: executionTime,
        ...result
      };

    } catch (error) {
      const executionTime = Date.now() - startTime;
      
      logger.error('Claude CLI process failed', {
        processId,
        error: error.message,
        executionTimeMs: executionTime
      });

      throw error;
    } finally {
      this.activeProcesses.delete(processId);
    }
  }

  /**
   * Build Claude CLI arguments array
   * @param {Object} options - CLI options
   * @returns {Array<string>}
   */
  buildClaudeArgs(options) {
    const { sessionId, flags, outputFormat, inputFormat, verbose, stream } = options;
    const args = [];

    // Core flags
    args.push('-p'); // Print mode

    // Session management
    if (sessionId) {
      args.push('-r', sessionId);
    }

    // Output format
    if (outputFormat && outputFormat !== 'text') {
      args.push('--output-format', outputFormat);
    }

    // Input format
    if (inputFormat && inputFormat !== 'text') {
      args.push('--input-format', inputFormat);
    }

    // Verbose mode for streaming
    if (verbose || (stream && outputFormat === 'stream-json')) {
      args.push('--verbose');
    }

    // Additional flags
    if (Array.isArray(flags)) {
      args.push(...flags);
    }

    return args;
  }

  /**
   * Execute non-streaming Claude command
   * @param {string} processId - Process identifier
   * @param {Array<string>} args - Claude CLI arguments
   * @param {string} message - Message to send
   * @param {string} projectPath - Project directory
   * @returns {Promise<Object>}
   */
  async executeNonStreamingCommand(processId, args, message, projectPath) {
    return new Promise((resolve, reject) => {
      const childProcess = spawn('claude', args, {
        cwd: projectPath,
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env }
      });

      this.activeProcesses.set(processId, childProcess);

      let stdout = '';
      let stderr = '';
      
      // Set up timeout
      const timeout = setTimeout(() => {
        childProcess.kill('SIGTERM');
        reject(new Error('Claude CLI process timeout'));
      }, this.processTimeoutMs);

      childProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      childProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      childProcess.on('close', (code) => {
        clearTimeout(timeout);
        
        if (code === 0) {
          try {
            // Try to parse JSON output
            let parsedOutput = stdout;
            if (args.includes('--output-format') && args[args.indexOf('--output-format') + 1] === 'json') {
              parsedOutput = JSON.parse(stdout);
            }
            
            resolve({
              output: parsedOutput,
              rawOutput: stdout,
              stderr: stderr,
              exitCode: code
            });
          } catch (error) {
            resolve({
              output: stdout,
              rawOutput: stdout,
              stderr: stderr,
              exitCode: code,
              parseError: error.message
            });
          }
        } else {
          reject(new Error(`Claude CLI process failed with exit code ${code}: ${stderr}`));
        }
      });

      childProcess.on('error', (error) => {
        clearTimeout(timeout);
        reject(new Error(`Failed to spawn Claude CLI process: ${error.message}`));
      });

      // Send message to stdin
      if (message) {
        childProcess.stdin.write(message);
        childProcess.stdin.end();
      }
    });
  }

  /**
   * Execute streaming Claude command
   * @param {string} processId - Process identifier
   * @param {Array<string>} args - Claude CLI arguments
   * @param {string} message - Message to send
   * @param {string} projectPath - Project directory
   * @returns {Promise<Object>}
   */
  async executeStreamingCommand(processId, args, message, projectPath) {
    return new Promise((resolve, reject) => {
      const childProcess = spawn('claude', args, {
        cwd: projectPath,
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env }
      });

      this.activeProcesses.set(processId, childProcess);

      const chunks = [];
      let stderr = '';
      let isComplete = false;
      
      // Set up timeout
      const timeout = setTimeout(() => {
        if (!isComplete) {
          childProcess.kill('SIGTERM');
          reject(new Error('Claude CLI streaming process timeout'));
        }
      }, this.processTimeoutMs);

      // Create a readable stream for the response
      const responseStream = new Readable({
        objectMode: true,
        read() {}
      });

      childProcess.stdout.on('data', (data) => {
        const chunk = data.toString();
        chunks.push(chunk);
        
        // For streaming JSON, try to parse each line
        if (args.includes('stream-json')) {
          const lines = chunk.split('\n').filter(line => line.trim());
          for (const line of lines) {
            try {
              const parsed = JSON.parse(line);
              responseStream.push(parsed);
            } catch (error) {
              // Skip non-JSON lines (like debug output)
              continue;
            }
          }
        } else {
          responseStream.push(chunk);
        }
      });

      childProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      childProcess.on('close', (code) => {
        isComplete = true;
        clearTimeout(timeout);
        responseStream.push(null); // End the stream
        
        const fullOutput = chunks.join('');
        
        if (code === 0) {
          resolve({
            stream: responseStream,
            rawOutput: fullOutput,
            stderr: stderr,
            exitCode: code
          });
        } else {
          reject(new Error(`Claude CLI streaming process failed with exit code ${code}: ${stderr}`));
        }
      });

      childProcess.on('error', (error) => {
        isComplete = true;
        clearTimeout(timeout);
        responseStream.destroy(error);
        reject(new Error(`Failed to spawn Claude CLI streaming process: ${error.message}`));
      });

      // Send message to stdin
      if (message) {
        if (args.includes('stream-json') && args.includes('--input-format')) {
          // Send as streaming JSON format
          const streamInput = JSON.stringify({
            messages: [{ role: 'user', content: message }]
          });
          childProcess.stdin.write(streamInput);
        } else {
          childProcess.stdin.write(message);
        }
        childProcess.stdin.end();
      }
    });
  }

  /**
   * Kill a running process
   * @param {string} processId - Process identifier
   * @returns {boolean}
   */
  killProcess(processId) {
    const childProcess = this.activeProcesses.get(processId);
    if (childProcess) {
      childProcess.kill('SIGTERM');
      this.activeProcesses.delete(processId);
      logger.info('Killed Claude CLI process', { processId });
      return true;
    }
    return false;
  }

  /**
   * Get active process statistics
   * @returns {Object}
   */
  getProcessStats() {
    return {
      activeProcesses: this.activeProcesses.size,
      maxConcurrentProcesses: this.maxConcurrentProcesses,
      processIds: Array.from(this.activeProcesses.keys())
    };
  }

  /**
   * Test Claude CLI availability
   * @returns {Promise<boolean>}
   */
  async testClaudeAvailability() {
    try {
      const result = await this.executeCommand({
        message: 'test',
        flags: ['--help'],
        stream: false
      });
      return result.success;
    } catch (error) {
      logger.error('Claude CLI not available', { error: error.message });
      return false;
    }
  }

  /**
   * Create a conversation with specific settings
   * @param {Object} options - Conversation options
   * @returns {Promise<string>} Session ID
   */
  async createConversation(options = {}) {
    const {
      projectPath,
      initialMessage = 'Hello',
      model,
      settings
    } = options;

    const flags = [];
    
    if (model) {
      flags.push('--model', model);
    }
    
    if (settings) {
      flags.push('--settings', JSON.stringify(settings));
    }

    const result = await this.executeCommand({
      message: initialMessage,
      projectPath,
      flags,
      outputFormat: 'json',
      stream: false
    });

    // Extract session ID from response
    if (result.output && result.output.session_id) {
      return result.output.session_id;
    }

    throw new Error('Failed to extract session ID from Claude response');
  }

  /**
   * Continue an existing conversation
   * @param {string} sessionId - Session ID to resume
   * @param {string} message - Message to send
   * @param {Object} options - Additional options
   * @returns {Promise<Object>}
   */
  async continueConversation(sessionId, message, options = {}) {
    return this.executeCommand({
      message,
      sessionId,
      ...options
    });
  }

  /**
   * Cleanup all active processes
   */
  cleanup() {
    logger.info('Cleaning up Claude CLI processes', { 
      count: this.activeProcesses.size 
    });

    for (const [processId, childProcess] of this.activeProcesses) {
      try {
        childProcess.kill('SIGTERM');
        logger.info('Killed process during cleanup', { processId });
      } catch (error) {
        logger.error('Failed to kill process during cleanup', { 
          processId, 
          error: error.message 
        });
      }
    }
    
    this.activeProcesses.clear();
  }
}

export default new ClaudeCLI();