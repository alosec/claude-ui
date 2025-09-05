import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import claudeCli from '../../src/services/claude-cli.js';
import { spawn } from 'child_process';

// Get the mocked spawn function
const mockSpawn = spawn;

describe('ClaudeCLI', () => {
  let mockChildProcess;

  beforeEach(() => {
    // Reset the mock and create a new mock child process
    mockSpawn.mockReset();
    mockChildProcess = {
      stdout: { on: jest.fn() },
      stderr: { on: jest.fn() },
      stdin: { write: jest.fn(), end: jest.fn() },
      on: jest.fn(),
      kill: jest.fn()
    };
    mockSpawn.mockReturnValue(mockChildProcess);
    
    // Clear any active processes
    claudeCli.cleanup();
  });

  afterEach(() => {
    claudeCli.cleanup();
  });

  describe('buildClaudeArgs', () => {
    test('should build basic args correctly', () => {
      const args = claudeCli.buildClaudeArgs({
        outputFormat: 'json',
        inputFormat: 'text'
      });

      expect(args).toContain('-p');
      expect(args).toContain('--output-format');
      expect(args).toContain('json');
    });

    test('should include session ID when provided', () => {
      const sessionId = 'test-session-123';
      const args = claudeCli.buildClaudeArgs({
        sessionId,
        outputFormat: 'text'
      });

      expect(args).toContain('-r');
      expect(args).toContain(sessionId);
    });

    test('should include verbose flag for streaming', () => {
      const args = claudeCli.buildClaudeArgs({
        stream: true,
        outputFormat: 'stream-json',
        verbose: true
      });

      expect(args).toContain('--verbose');
    });

    test('should include additional flags', () => {
      const flags = ['--model', 'claude-3-opus', '--debug'];
      const args = claudeCli.buildClaudeArgs({
        flags,
        outputFormat: 'json'
      });

      expect(args).toContain('--model');
      expect(args).toContain('claude-3-opus');
      expect(args).toContain('--debug');
    });
  });

  describe('executeNonStreamingCommand', () => {
    test('should execute simple command successfully', async () => {
      const testResponse = '{"result": "4", "session_id": "test-123"}';
      
      // Setup mock to simulate successful execution
      mockChildProcess.on.mockImplementation((event, callback) => {
        if (event === 'close') {
          setTimeout(() => callback(0), 10); // Exit code 0
        }
      });
      
      mockChildProcess.stdout.on.mockImplementation((event, callback) => {
        if (event === 'data') {
          setTimeout(() => callback(Buffer.from(testResponse)), 5);
        }
      });

      mockChildProcess.stderr.on.mockImplementation((event, callback) => {
        if (event === 'data') {
          setTimeout(() => callback(Buffer.from('')), 5);
        }
      });

      const resultPromise = claudeCli.executeCommand({
        message: '2+2',
        stream: false,
        outputFormat: 'json'
      });

      const result = await resultPromise;

      expect(result.success).toBe(true);
      expect(result.output).toBeDefined();
      expect(mockSpawn).toHaveBeenCalledWith('claude', expect.arrayContaining(['-p']), expect.any(Object));
    });

    test('should handle process failure', async () => {
      // Setup mock to simulate process failure
      mockChildProcess.on.mockImplementation((event, callback) => {
        if (event === 'close') {
          setTimeout(() => callback(1), 10); // Exit code 1
        }
      });
      
      mockChildProcess.stderr.on.mockImplementation((event, callback) => {
        if (event === 'data') {
          setTimeout(() => callback(Buffer.from('Error: Command failed')), 5);
        }
      });

      await expect(claudeCli.executeCommand({
        message: 'invalid command',
        stream: false
      })).rejects.toThrow('Claude CLI process failed');
    });

    test('should handle spawn errors', async () => {
      mockSpawn.mockImplementation(() => {
        const process = {
          ...mockChildProcess,
          on: jest.fn((event, callback) => {
            if (event === 'error') {
              setImmediate(() => callback(new Error('spawn ENOENT')));
            }
          })
        };
        return process;
      });

      await expect(claudeCli.executeCommand({
        message: 'test',
        stream: false
      })).rejects.toThrow('Failed to spawn Claude CLI process');
    }, 8000);

    test('should timeout long-running processes', async () => {
      // Set a very short timeout for testing
      const originalTimeout = claudeCli.processTimeoutMs;
      claudeCli.processTimeoutMs = 10;

      try {
        // Setup mock that never completes
        mockChildProcess.on.mockImplementation(() => {
          // Never call the callback
        });

        await expect(claudeCli.executeCommand({
          message: 'long running task',
          stream: false
        })).rejects.toThrow('Claude CLI process timeout');

        expect(mockChildProcess.kill).toHaveBeenCalledWith('SIGTERM');
      } finally {
        claudeCli.processTimeoutMs = originalTimeout;
      }
    });
  });

  describe('executeStreamingCommand', () => {
    test('should handle streaming output', async () => {
      const streamData = [
        '{"type": "data", "content": "Hello"}\\n',
        '{"type": "data", "content": " world"}\\n',
        '{"type": "end"}\\n'
      ];

      // Setup mock to simulate streaming
      mockChildProcess.on.mockImplementation((event, callback) => {
        if (event === 'close') {
          setTimeout(() => callback(0), 100);
        }
      });

      let dataCallbackIndex = 0;
      mockChildProcess.stdout.on.mockImplementation((event, callback) => {
        if (event === 'data') {
          const sendData = () => {
            if (dataCallbackIndex < streamData.length) {
              callback(Buffer.from(streamData[dataCallbackIndex]));
              dataCallbackIndex++;
              if (dataCallbackIndex < streamData.length) {
                setImmediate(sendData);
              }
            }
          };
          setImmediate(sendData);
        }
      });

      const result = await claudeCli.executeCommand({
        message: 'streaming test',
        stream: true,
        outputFormat: 'stream-json'
      });

      expect(result.success).toBe(true);
      expect(result.stream).toBeDefined();
      expect(typeof result.stream.on).toBe('function');
    }, 8000);
  });

  describe('process management', () => {
    test('should track active processes', async () => {
      // Setup a process that hangs
      mockChildProcess.on.mockImplementation(() => {
        // Don't call any callbacks to keep process active
      });

      const commandPromise = claudeCli.executeCommand({
        message: 'test',
        stream: false
      });

      // Give it a moment to start
      await new Promise(resolve => setTimeout(resolve, 10));

      const stats = claudeCli.getProcessStats();
      expect(stats.activeProcesses).toBe(1);
      expect(stats.processIds).toHaveLength(1);

      // Cleanup
      claudeCli.cleanup();
    });

    test('should enforce maximum concurrent processes', async () => {
      const originalMax = claudeCli.maxConcurrentProcesses;
      claudeCli.maxConcurrentProcesses = 1;

      try {
        // Start first process
        mockChildProcess.on.mockImplementation(() => {
          // Don't complete to keep active
        });

        const promise1 = claudeCli.executeCommand({
          message: 'test1',
          stream: false
        });

        // Give first process time to start
        await new Promise(resolve => setTimeout(resolve, 10));

        // Try to start second process - should fail
        await expect(claudeCli.executeCommand({
          message: 'test2',
          stream: false
        })).rejects.toThrow('Maximum concurrent processes reached');

      } finally {
        claudeCli.maxConcurrentProcesses = originalMax;
        claudeCli.cleanup();
      }
    });

    test('should kill processes by ID', () => {
      const processId = 'test-process-123';
      const mockProcess = { kill: jest.fn() };
      
      // Directly add to active processes for testing
      claudeCli.activeProcesses.set(processId, mockProcess);

      const result = claudeCli.killProcess(processId);
      
      expect(result).toBe(true);
      expect(mockProcess.kill).toHaveBeenCalledWith('SIGTERM');
      expect(claudeCli.getProcessStats().activeProcesses).toBe(0);
    });

    test('should return false when killing non-existent process', () => {
      const result = claudeCli.killProcess('non-existent-process');
      expect(result).toBe(false);
    });
  });

  describe('conversation management', () => {
    test('should create new conversation', async () => {
      const sessionId = 'new-session-123';
      const testResponse = `{"result": "Hello!", "session_id": "${sessionId}"}`;

      // Setup successful execution mock
      mockChildProcess.on.mockImplementation((event, callback) => {
        if (event === 'close') {
          setTimeout(() => callback(0), 10);
        }
      });
      
      mockChildProcess.stdout.on.mockImplementation((event, callback) => {
        if (event === 'data') {
          setTimeout(() => callback(Buffer.from(testResponse)), 5);
        }
      });

      mockChildProcess.stderr.on.mockImplementation((event, callback) => {
        if (event === 'data') {
          setTimeout(() => callback(Buffer.from('')), 5);
        }
      });

      const result = await claudeCli.createConversation({
        projectPath: '/test/project',
        initialMessage: 'Hello',
        model: 'claude-3-opus'
      });

      expect(result).toBe(sessionId);
      expect(mockSpawn).toHaveBeenCalledWith(
        'claude',
        expect.arrayContaining(['--model', 'claude-3-opus']),
        expect.any(Object)
      );
    });

    test('should continue existing conversation', async () => {
      const sessionId = 'existing-session-123';
      const testResponse = '{"result": "Continued conversation"}';

      // Setup successful execution mock
      mockChildProcess.on.mockImplementation((event, callback) => {
        if (event === 'close') {
          setTimeout(() => callback(0), 10);
        }
      });
      
      mockChildProcess.stdout.on.mockImplementation((event, callback) => {
        if (event === 'data') {
          setTimeout(() => callback(Buffer.from(testResponse)), 5);
        }
      });

      const result = await claudeCli.continueConversation(sessionId, 'Continue please');

      expect(result.success).toBe(true);
      expect(mockSpawn).toHaveBeenCalledWith(
        'claude',
        expect.arrayContaining(['-r', sessionId]),
        expect.any(Object)
      );
    });
  });

  describe('testClaudeAvailability', () => {
    test('should return true when Claude CLI is available', async () => {
      // Mock successful help command
      mockChildProcess.on.mockImplementation((event, callback) => {
        if (event === 'close') {
          setTimeout(() => callback(0), 10);
        }
      });
      
      mockChildProcess.stdout.on.mockImplementation((event, callback) => {
        if (event === 'data') {
          setTimeout(() => callback(Buffer.from('Claude CLI help text')), 5);
        }
      });

      const isAvailable = await claudeCli.testClaudeAvailability();
      expect(isAvailable).toBe(true);
    });

    test('should return false when Claude CLI is not available', async () => {
      // Mock command failure
      mockChildProcess.on.mockImplementation((event, callback) => {
        if (event === 'error') {
          setTimeout(() => callback(new Error('Command not found')), 5);
        }
      });

      const isAvailable = await claudeCli.testClaudeAvailability();
      expect(isAvailable).toBe(false);
    });
  });
});