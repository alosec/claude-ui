import express from 'express';
import Joi from 'joi';
import claudeCli from '../services/claude-cli.js';
import sessionStore from '../services/session-store.js';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import winston from 'winston';

const router = express.Router();

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'chat-router' }
});

// Validation schemas
const chatSchema = Joi.object({
  message: Joi.string().required(),
  sessionId: Joi.string().uuid().optional(),
  project: Joi.string().optional(),
  stream: Joi.boolean().default(false),
  model: Joi.string().optional(),
  flags: Joi.array().items(Joi.string()).optional(),
  outputFormat: Joi.string().valid('text', 'json', 'stream-json').default('json'),
  inputFormat: Joi.string().valid('text', 'stream-json').default('text'),
  resume: Joi.boolean().default(false),
  verbose: Joi.boolean().default(false)
});

const sessionChatSchema = Joi.object({
  message: Joi.string().required(),
  stream: Joi.boolean().default(false),
  flags: Joi.array().items(Joi.string()).optional(),
  outputFormat: Joi.string().valid('text', 'json', 'stream-json').default('json'),
  inputFormat: Joi.string().valid('text', 'stream-json').default('text')
});

/**
 * POST /api/v1/chat
 * Start a new conversation or continue existing one
 */
router.post('/', async (req, res, next) => {
  try {
    const { error, value } = chatSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: error.details[0].message
        }
      });
    }

    const {
      message,
      sessionId,
      project,
      stream,
      model,
      flags = [],
      outputFormat,
      inputFormat,
      resume,
      verbose
    } = value;

    const startTime = Date.now();
    let projectPath = null;

    // Determine project path
    if (project) {
      projectPath = join(req.claudeProjectsPath, project);
    } else if (sessionId) {
      // Find project containing this session
      const sessions = await sessionStore.findSessions(req.claudeProjectsPath, {
        sessionId,
        limit: 1
      });
      
      if (sessions.length > 0) {
        projectPath = join(sessions[0].filePath, '../');
      }
    }

    // Build CLI flags
    const cliFlags = [...flags];
    if (model) {
      cliFlags.push('--model', model);
    }

    // Execute Claude CLI command
    const claudeOptions = {
      message,
      sessionId: resume ? sessionId : undefined,
      projectPath,
      flags: cliFlags,
      stream,
      outputFormat,
      inputFormat,
      verbose: verbose || stream
    };

    if (stream) {
      // Set up streaming response
      res.writeHead(200, {
        'Content-Type': 'application/x-ndjson',
        'Transfer-Encoding': 'chunked',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      });

      try {
        const result = await claudeCli.executeCommand(claudeOptions);
        
        if (result.stream) {
          result.stream.on('data', (chunk) => {
            res.write(JSON.stringify({
              type: 'data',
              content: chunk,
              timestamp: new Date().toISOString()
            }) + '\n');
          });

          result.stream.on('end', () => {
            const executionTime = Date.now() - startTime;
            res.write(JSON.stringify({
              type: 'end',
              executionTimeMs: executionTime,
              timestamp: new Date().toISOString()
            }) + '\n');
            res.end();
          });

          result.stream.on('error', (error) => {
            res.write(JSON.stringify({
              type: 'error',
              error: error.message,
              timestamp: new Date().toISOString()
            }) + '\n');
            res.end();
          });
        } else {
          // Non-streaming result
          res.write(JSON.stringify({
            type: 'complete',
            data: result,
            timestamp: new Date().toISOString()
          }) + '\n');
          res.end();
        }
      } catch (error) {
        res.write(JSON.stringify({
          type: 'error',
          error: error.message,
          timestamp: new Date().toISOString()
        }) + '\n');
        res.end();
      }
    } else {
      // Non-streaming response
      const result = await claudeCli.executeCommand(claudeOptions);
      const executionTime = Date.now() - startTime;

      res.json({
        success: true,
        data: {
          response: result.output,
          sessionId: result.sessionId || sessionId,
          executionTimeMs: result.executionTimeMs,
          processId: result.processId
        },
        meta: {
          timestamp: new Date().toISOString(),
          executionTimeMs: executionTime,
          stream: false,
          claudeFlags: cliFlags
        }
      });
    }

  } catch (error) {
    if (stream && res.headersSent) {
      res.write(JSON.stringify({
        type: 'error',
        error: error.message,
        timestamp: new Date().toISOString()
      }) + '\n');
      res.end();
    } else {
      logger.error('Chat request failed', { error: error.message });
      next(error);
    }
  }
});

/**
 * POST /api/v1/sessions/:id/chat
 * Send message to specific session
 */
router.post('/:id/chat', async (req, res, next) => {
  try {
    const { id: sessionId } = req.params;
    const { error, value } = sessionChatSchema.validate(req.body);
    
    if (error) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: error.details[0].message
        }
      });
    }

    if (!sessionId || !/^[a-f0-9-]{36}$/.test(sessionId)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_SESSION_ID',
          message: 'Session ID must be a valid UUID'
        }
      });
    }

    const {
      message,
      stream,
      flags = [],
      outputFormat,
      inputFormat
    } = value;

    const startTime = Date.now();

    // Find the session and its project
    const sessions = await sessionStore.findSessions(req.claudeProjectsPath, {
      sessionId,
      limit: 1
    });

    if (sessions.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'SESSION_NOT_FOUND',
          message: `Session ${sessionId} not found`
        }
      });
    }

    const session = sessions[0];
    const projectPath = join(session.filePath, '../');

    // Execute Claude CLI command with session resume
    const claudeOptions = {
      message,
      sessionId,
      projectPath,
      flags,
      stream,
      outputFormat,
      inputFormat,
      verbose: stream
    };

    if (stream) {
      // Set up streaming response
      res.writeHead(200, {
        'Content-Type': 'application/x-ndjson',
        'Transfer-Encoding': 'chunked',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Session-Id': sessionId
      });

      // Send initial metadata
      res.write(JSON.stringify({
        type: 'start',
        sessionId,
        timestamp: new Date().toISOString()
      }) + '\n');

      try {
        const result = await claudeCli.executeCommand(claudeOptions);
        
        if (result.stream) {
          result.stream.on('data', (chunk) => {
            res.write(JSON.stringify({
              type: 'data',
              content: chunk,
              timestamp: new Date().toISOString()
            }) + '\n');
          });

          result.stream.on('end', () => {
            const executionTime = Date.now() - startTime;
            res.write(JSON.stringify({
              type: 'end',
              sessionId,
              executionTimeMs: executionTime,
              timestamp: new Date().toISOString()
            }) + '\n');
            res.end();
          });

          result.stream.on('error', (error) => {
            res.write(JSON.stringify({
              type: 'error',
              sessionId,
              error: error.message,
              timestamp: new Date().toISOString()
            }) + '\n');
            res.end();
          });
        }
      } catch (error) {
        res.write(JSON.stringify({
          type: 'error',
          sessionId,
          error: error.message,
          timestamp: new Date().toISOString()
        }) + '\n');
        res.end();
      }
    } else {
      // Non-streaming response
      const result = await claudeCli.executeCommand(claudeOptions);
      const executionTime = Date.now() - startTime;

      res.json({
        success: true,
        data: {
          sessionId,
          response: result.output,
          executionTimeMs: result.executionTimeMs,
          processId: result.processId
        },
        meta: {
          timestamp: new Date().toISOString(),
          executionTimeMs: executionTime,
          project: session.project,
          stream: false
        }
      });
    }

  } catch (error) {
    if (stream && res.headersSent) {
      res.write(JSON.stringify({
        type: 'error',
        sessionId: req.params.id,
        error: error.message,
        timestamp: new Date().toISOString()
      }) + '\n');
      res.end();
    } else {
      logger.error('Session chat request failed', { 
        sessionId: req.params.id,
        error: error.message 
      });
      next(error);
    }
  }
});

/**
 * POST /api/v1/chat/new
 * Start a new conversation with specific parameters
 */
router.post('/new', async (req, res, next) => {
  try {
    const { error, value } = chatSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: error.details[0].message
        }
      });
    }

    const {
      message,
      project,
      model,
      flags = []
    } = value;

    const startTime = Date.now();
    const newSessionId = uuidv4();

    // Determine project path
    let projectPath = null;
    if (project) {
      projectPath = join(req.claudeProjectsPath, project);
    }

    // Build CLI flags for new session
    const cliFlags = [...flags];
    if (model) {
      cliFlags.push('--model', model);
    }

    // Force session ID for new conversation
    cliFlags.push('--session-id', newSessionId);

    // Create new conversation
    const result = await claudeCli.executeCommand({
      message,
      projectPath,
      flags: cliFlags,
      stream: false,
      outputFormat: 'json',
      verbose: false
    });

    const executionTime = Date.now() - startTime;

    res.json({
      success: true,
      data: {
        sessionId: newSessionId,
        response: result.output,
        created: true,
        executionTimeMs: result.executionTimeMs,
        processId: result.processId
      },
      meta: {
        timestamp: new Date().toISOString(),
        executionTimeMs: executionTime,
        project: project || null,
        claudeFlags: cliFlags
      }
    });

  } catch (error) {
    logger.error('New chat request failed', { error: error.message });
    next(error);
  }
});

/**
 * GET /api/v1/chat/status
 * Get Claude CLI status and active processes
 */
router.get('/status', async (req, res, next) => {
  try {
    const startTime = Date.now();

    // Test Claude CLI availability
    const isAvailable = await claudeCli.testClaudeAvailability();
    const processStats = claudeCli.getProcessStats();

    const executionTime = Date.now() - startTime;

    res.json({
      success: true,
      data: {
        claudeCliAvailable: isAvailable,
        activeProcesses: processStats.activeProcesses,
        maxConcurrentProcesses: processStats.maxConcurrentProcesses,
        processIds: processStats.processIds
      },
      meta: {
        timestamp: new Date().toISOString(),
        executionTimeMs: executionTime
      }
    });

  } catch (error) {
    logger.error('Failed to get chat status', { error: error.message });
    next(error);
  }
});

/**
 * POST /api/v1/chat/kill/:processId
 * Kill a running chat process
 */
router.post('/kill/:processId', async (req, res, next) => {
  try {
    const { processId } = req.params;
    const startTime = Date.now();

    const killed = claudeCli.killProcess(processId);
    const executionTime = Date.now() - startTime;

    if (killed) {
      res.json({
        success: true,
        data: {
          processId,
          killed: true
        },
        meta: {
          timestamp: new Date().toISOString(),
          executionTimeMs: executionTime
        }
      });
    } else {
      res.status(404).json({
        success: false,
        error: {
          code: 'PROCESS_NOT_FOUND',
          message: `Process ${processId} not found or already terminated`
        }
      });
    }

  } catch (error) {
    logger.error('Failed to kill chat process', { 
      processId: req.params.processId,
      error: error.message 
    });
    next(error);
  }
});

export default router;