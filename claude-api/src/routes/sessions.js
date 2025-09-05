import express from 'express';
import Joi from 'joi';
import sessionStore from '../services/session-store.js';
import jqProcessor from '../services/jq-processor.js';
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
  defaultMeta: { service: 'sessions-router' }
});

// Validation schemas
const querySchema = Joi.object({
  project: Joi.string().optional(),
  limit: Joi.number().integer().min(1).max(1000).default(50),
  offset: Joi.number().integer().min(0).default(0),
  sort: Joi.string().valid('created', 'modified', 'size', 'messageCount').default('modified'),
  order: Joi.string().valid('asc', 'desc').default('desc'),
  search: Joi.string().optional(),
  type: Joi.string().valid('user', 'assistant', 'system', 'tool_use', 'tool_use_result').optional(),
  dateFrom: Joi.date().iso().optional(),
  dateTo: Joi.date().iso().optional()
});

const messagesQuerySchema = Joi.object({
  q: Joi.string().optional(), // jq query
  limit: Joi.number().integer().min(1).max(10000).default(100),
  offset: Joi.number().integer().min(0).default(0),
  type: Joi.string().valid('user', 'assistant', 'system', 'tool_use', 'tool_use_result').optional()
});

const createSessionSchema = Joi.object({
  project: Joi.string().required(),
  sessionId: Joi.string().uuid().optional(),
  initialMessages: Joi.array().items(Joi.object()).default([])
});

/**
 * GET /api/v1/sessions
 * List all sessions with filtering and pagination
 */
router.get('/', async (req, res, next) => {
  try {
    const { error, value } = querySchema.validate(req.query);
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
      project,
      limit,
      offset,
      sort,
      order,
      search,
      type,
      dateFrom,
      dateTo
    } = value;

    const startTime = Date.now();

    // Find sessions based on criteria
    const sessions = await sessionStore.findSessions(req.claudeProjectsPath, {
      projectName: project,
      messageContent: search,
      messageType: type,
      dateFrom,
      dateTo,
      limit: limit + offset // Get extra for offset handling
    });

    // Apply sorting
    sessions.sort((a, b) => {
      let aVal, bVal;
      
      switch (sort) {
        case 'created':
          aVal = new Date(a.created);
          bVal = new Date(b.created);
          break;
        case 'modified':
          aVal = new Date(a.modified);
          bVal = new Date(b.modified);
          break;
        case 'size':
          aVal = a.size;
          bVal = b.size;
          break;
        case 'messageCount':
          aVal = a.messageCount || 0;
          bVal = b.messageCount || 0;
          break;
        default:
          aVal = new Date(a.modified);
          bVal = new Date(b.modified);
      }

      return order === 'asc' ? aVal - bVal : bVal - aVal;
    });

    // Apply pagination
    const paginatedSessions = sessions.slice(offset, offset + limit);

    const executionTime = Date.now() - startTime;

    res.json({
      success: true,
      data: {
        sessions: paginatedSessions,
        pagination: {
          total: sessions.length,
          limit,
          offset,
          hasMore: offset + limit < sessions.length
        }
      },
      meta: {
        timestamp: new Date().toISOString(),
        executionTimeMs: executionTime
      }
    });

  } catch (error) {
    logger.error('Failed to list sessions', { error: error.message });
    next(error);
  }
});

/**
 * GET /api/v1/sessions/:id
 * Get specific session details
 */
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { project } = req.query;

    if (!id || !/^[a-f0-9-]{36}$/.test(id)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_SESSION_ID',
          message: 'Session ID must be a valid UUID'
        }
      });
    }

    const startTime = Date.now();

    // Find the session file
    let sessionFilePath;
    
    if (project) {
      // Look in specific project
      sessionFilePath = join(req.claudeProjectsPath, project, `${id}.jsonl`);
    } else {
      // Search all projects
      const sessions = await sessionStore.findSessions(req.claudeProjectsPath, {
        sessionId: id,
        limit: 1
      });
      
      if (sessions.length === 0) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'SESSION_NOT_FOUND',
            message: `Session ${id} not found`
          }
        });
      }
      
      sessionFilePath = sessions[0].filePath;
    }

    const sessionDetails = await sessionStore.getSessionDetails(sessionFilePath);
    const executionTime = Date.now() - startTime;

    res.json({
      success: true,
      data: sessionDetails,
      meta: {
        timestamp: new Date().toISOString(),
        executionTimeMs: executionTime
      }
    });

  } catch (error) {
    if (error.message.includes('ENOENT')) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'SESSION_NOT_FOUND',
          message: `Session ${req.params.id} not found`
        }
      });
    }
    
    logger.error('Failed to get session details', { 
      sessionId: req.params.id,
      error: error.message 
    });
    next(error);
  }
});

/**
 * GET /api/v1/sessions/:id/messages
 * Get session messages with optional jq filtering
 */
router.get('/:id/messages', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { error, value } = messagesQuerySchema.validate(req.query);
    
    if (error) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: error.details[0].message
        }
      });
    }

    const { q: jqQuery, limit, offset, type } = value;
    const startTime = Date.now();

    // Find the session file
    const sessions = await sessionStore.findSessions(req.claudeProjectsPath, {
      sessionId: id,
      limit: 1
    });

    if (sessions.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'SESSION_NOT_FOUND',
          message: `Session ${id} not found`
        }
      });
    }

    const sessionFilePath = sessions[0].filePath;
    let messages;

    if (jqQuery) {
      // Use jq processor for complex queries
      const { results } = await jqProcessor.streamQuery(sessionFilePath, jqQuery);
      messages = results;
    } else {
      // Simple filtering
      messages = await sessionStore.readSessionMessages(sessionFilePath, {
        limit: limit + offset,
        offset: 0
      });

      // Filter by type if specified
      if (type) {
        messages = messages.filter(msg => msg.type === type);
      }

      // Apply pagination
      messages = messages.slice(offset, offset + limit);
    }

    const executionTime = Date.now() - startTime;

    res.json({
      success: true,
      data: {
        sessionId: id,
        messages,
        pagination: {
          limit,
          offset,
          total: messages.length
        }
      },
      meta: {
        timestamp: new Date().toISOString(),
        executionTimeMs: executionTime,
        jqQuery: jqQuery || null
      }
    });

  } catch (error) {
    if (error.message.includes('jq query')) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_JQ_QUERY',
          message: error.message
        }
      });
    }

    logger.error('Failed to get session messages', {
      sessionId: req.params.id,
      error: error.message
    });
    next(error);
  }
});

/**
 * POST /api/v1/sessions
 * Create a new session
 */
router.post('/', async (req, res, next) => {
  try {
    const { error, value } = createSessionSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: error.details[0].message
        }
      });
    }

    const { project, sessionId = uuidv4(), initialMessages } = value;
    const startTime = Date.now();

    const projectPath = join(req.claudeProjectsPath, project);
    
    // Create the session file
    const sessionFilePath = await sessionStore.createSession(
      projectPath,
      sessionId,
      initialMessages
    );

    // Get the created session details
    const sessionDetails = await sessionStore.getSessionDetails(sessionFilePath);
    const executionTime = Date.now() - startTime;

    res.status(201).json({
      success: true,
      data: sessionDetails,
      meta: {
        timestamp: new Date().toISOString(),
        executionTimeMs: executionTime
      }
    });

  } catch (error) {
    logger.error('Failed to create session', { error: error.message });
    next(error);
  }
});

/**
 * DELETE /api/v1/sessions/:id
 * Delete a session
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { project } = req.query;

    if (!id || !/^[a-f0-9-]{36}$/.test(id)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_SESSION_ID',
          message: 'Session ID must be a valid UUID'
        }
      });
    }

    const startTime = Date.now();

    // Find the session file
    let sessionFilePath;
    
    if (project) {
      sessionFilePath = join(req.claudeProjectsPath, project, `${id}.jsonl`);
    } else {
      const sessions = await sessionStore.findSessions(req.claudeProjectsPath, {
        sessionId: id,
        limit: 1
      });
      
      if (sessions.length === 0) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'SESSION_NOT_FOUND',
            message: `Session ${id} not found`
          }
        });
      }
      
      sessionFilePath = sessions[0].filePath;
    }

    // Delete the session
    await sessionStore.deleteSession(sessionFilePath);
    const executionTime = Date.now() - startTime;

    res.json({
      success: true,
      data: {
        sessionId: id,
        deleted: true
      },
      meta: {
        timestamp: new Date().toISOString(),
        executionTimeMs: executionTime
      }
    });

  } catch (error) {
    if (error.message.includes('ENOENT')) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'SESSION_NOT_FOUND',
          message: `Session ${req.params.id} not found`
        }
      });
    }

    logger.error('Failed to delete session', {
      sessionId: req.params.id,
      error: error.message
    });
    next(error);
  }
});

/**
 * POST /api/v1/sessions/:id/messages
 * Add a message to an existing session (for manual session building)
 */
router.post('/:id/messages', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { message } = req.body;

    if (!message || typeof message !== 'object') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_MESSAGE',
          message: 'Message object is required'
        }
      });
    }

    // This would require implementing message appending to JSONL files
    // For now, return not implemented
    res.status(501).json({
      success: false,
      error: {
        code: 'NOT_IMPLEMENTED',
        message: 'Manual message addition not yet implemented. Use the chat endpoint instead.'
      }
    });

  } catch (error) {
    logger.error('Failed to add message to session', {
      sessionId: req.params.id,
      error: error.message
    });
    next(error);
  }
});

export default router;