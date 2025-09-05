import express from 'express';
import Joi from 'joi';
import jqProcessor from '../services/jq-processor.js';
import sessionStore from '../services/session-store.js';
import { join } from 'path';
import winston from 'winston';

const router = express.Router();

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'query-router' }
});

// Validation schemas
const querySchema = Joi.object({
  filter: Joi.string().required(),
  projects: Joi.array().items(Joi.string()).optional(),
  sessions: Joi.array().items(Joi.string().uuid()).optional(),
  limit: Joi.number().integer().min(1).max(10000).default(1000),
  timeout: Joi.number().integer().min(1000).max(120000).default(30000)
});

const patternsSchema = Joi.object({
  category: Joi.string().valid('messages', 'content', 'statistics', 'time', 'search').optional()
});

/**
 * POST /api/v1/query
 * Execute jq queries across sessions and projects
 */
router.post('/', async (req, res, next) => {
  try {
    const { error, value } = querySchema.validate(req.body);
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
      filter: jqQuery,
      projects = [],
      sessions = [],
      limit,
      timeout
    } = value;

    const startTime = Date.now();

    // Validate jq query
    try {
      await jqProcessor.validateQuery(jqQuery);
    } catch (validationError) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_JQ_QUERY',
          message: validationError.message
        }
      });
    }

    let filePaths = [];

    if (sessions.length > 0) {
      // Query specific sessions
      for (const sessionId of sessions) {
        const sessionResults = await sessionStore.findSessions(req.claudeProjectsPath, {
          sessionId,
          limit: 1
        });
        
        if (sessionResults.length > 0) {
          filePaths.push(sessionResults[0].filePath);
        }
      }
    } else if (projects.length > 0) {
      // Query specific projects
      for (const projectName of projects) {
        const projectPath = join(req.claudeProjectsPath, projectName);
        const projectSessions = await sessionStore.getProjectSessions(projectPath);
        filePaths.push(...projectSessions.map(s => s.filePath));
      }
    } else {
      // Query all projects
      const allProjects = await sessionStore.getProjects(req.claudeProjectsPath);
      for (const project of allProjects) {
        const projectSessions = await sessionStore.getProjectSessions(project.path);
        filePaths.push(...projectSessions.map(s => s.filePath));
      }
    }

    if (filePaths.length === 0) {
      return res.json({
        success: true,
        data: {
          results: [],
          filesProcessed: 0,
          totalLines: 0
        },
        meta: {
          timestamp: new Date().toISOString(),
          executionTimeMs: Date.now() - startTime,
          jqQuery,
          message: 'No matching sessions found'
        }
      });
    }

    // Apply limit to files if necessary
    if (filePaths.length > 100) {
      logger.warn('Large query detected, limiting to first 100 files', {
        requestedFiles: filePaths.length,
        jqQuery: jqQuery.substring(0, 100)
      });
      filePaths = filePaths.slice(0, 100);
    }

    // Execute jq query across files
    const queryResult = await jqProcessor.runMultiFileQuery(filePaths, jqQuery, {
      timeout
    });

    // Apply result limit
    const limitedResults = queryResult.results.slice(0, limit);

    const executionTime = Date.now() - startTime;

    res.json({
      success: true,
      data: {
        results: limitedResults,
        filesProcessed: queryResult.filesProcessed,
        totalLines: queryResult.totalLines,
        totalResults: queryResult.results.length,
        limitedResults: limitedResults.length,
        errors: queryResult.errors
      },
      meta: {
        timestamp: new Date().toISOString(),
        executionTimeMs: executionTime,
        jqQuery,
        projects: projects.length > 0 ? projects : undefined,
        sessions: sessions.length > 0 ? sessions : undefined
      }
    });

  } catch (error) {
    if (error.message.includes('jq query') || error.message.includes('timeout')) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'QUERY_EXECUTION_ERROR',
          message: error.message
        }
      });
    }

    logger.error('Query execution failed', { error: error.message });
    next(error);
  }
});

/**
 * GET /api/v1/query/patterns
 * Get available jq query patterns and examples
 */
router.get('/patterns', async (req, res, next) => {
  try {
    const { error, value } = patternsSchema.validate(req.query);
    if (error) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: error.details[0].message
        }
      });
    }

    const { category } = value;
    const patterns = jqProcessor.getQueryPatterns();

    let filteredPatterns = patterns;

    if (category) {
      switch (category) {
        case 'messages':
          filteredPatterns = {
            userMessages: patterns.userMessages,
            assistantMessages: patterns.assistantMessages,
            systemMessages: patterns.systemMessages
          };
          break;
        case 'content':
          filteredPatterns = {
            messageContent: patterns.messageContent,
            toolUses: patterns.toolUses,
            toolResults: patterns.toolResults
          };
          break;
        case 'statistics':
          filteredPatterns = {
            messageCount: patterns.messageCount,
            sessionSummary: patterns.sessionSummary
          };
          break;
        case 'time':
          filteredPatterns = {
            recent: patterns.recent,
            today: patterns.today
          };
          break;
        case 'search':
          filteredPatterns = {
            contentSearch: patterns.contentSearch,
            toolSearch: patterns.toolSearch
          };
          break;
      }
    }

    // Add examples for each pattern
    const patternsWithExamples = {};
    for (const [name, pattern] of Object.entries(filteredPatterns)) {
      if (typeof pattern === 'function') {
        patternsWithExamples[name] = {
          description: `Dynamic pattern generator for ${name}`,
          example: pattern('example'),
          usage: `Call with parameter: ${name}("your_search_term")`
        };
      } else {
        patternsWithExamples[name] = {
          pattern,
          description: this.getPatternDescription(name),
          example: this.getPatternExample(name)
        };
      }
    }

    res.json({
      success: true,
      data: {
        patterns: patternsWithExamples,
        category: category || 'all'
      },
      meta: {
        timestamp: new Date().toISOString(),
        totalPatterns: Object.keys(patternsWithExamples).length
      }
    });

  } catch (error) {
    logger.error('Failed to get query patterns', { error: error.message });
    next(error);
  }
});

/**
 * POST /api/v1/query/validate
 * Validate a jq query without executing it
 */
router.post('/validate', async (req, res, next) => {
  try {
    const { filter: jqQuery } = req.body;

    if (!jqQuery || typeof jqQuery !== 'string') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_QUERY',
          message: 'jq query filter is required'
        }
      });
    }

    const startTime = Date.now();

    try {
      await jqProcessor.validateQuery(jqQuery);
      
      const executionTime = Date.now() - startTime;

      res.json({
        success: true,
        data: {
          valid: true,
          query: jqQuery
        },
        meta: {
          timestamp: new Date().toISOString(),
          executionTimeMs: executionTime
        }
      });

    } catch (validationError) {
      const executionTime = Date.now() - startTime;

      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_JQ_QUERY',
          message: validationError.message,
          query: jqQuery
        },
        meta: {
          timestamp: new Date().toISOString(),
          executionTimeMs: executionTime
        }
      });
    }

  } catch (error) {
    logger.error('Query validation failed', { error: error.message });
    next(error);
  }
});

/**
 * GET /api/v1/query/stats
 * Get jq processor statistics and performance metrics
 */
router.get('/stats', async (req, res, next) => {
  try {
    const cacheStats = jqProcessor.getCacheStats();
    
    res.json({
      success: true,
      data: {
        cache: cacheStats,
        queryTimeoutMs: jqProcessor.queryTimeoutMs,
        maxCacheSize: jqProcessor.maxCacheSize
      },
      meta: {
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('Failed to get query stats', { error: error.message });
    next(error);
  }
});

/**
 * POST /api/v1/query/cache/clear
 * Clear the jq processor cache
 */
router.post('/cache/clear', async (req, res, next) => {
  try {
    jqProcessor.clearCache();
    
    res.json({
      success: true,
      data: {
        cacheCleared: true
      },
      meta: {
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('Failed to clear query cache', { error: error.message });
    next(error);
  }
});

// Helper methods for pattern descriptions and examples
function getPatternDescription(name) {
  const descriptions = {
    userMessages: 'Filter messages sent by users',
    assistantMessages: 'Filter messages from Claude assistant',
    systemMessages: 'Filter system-generated messages',
    messageContent: 'Extract text content from messages',
    toolUses: 'Extract tool usage information',
    toolResults: 'Extract tool execution results',
    messageCount: 'Count messages by type',
    sessionSummary: 'Generate session statistics',
    recent: 'Filter messages from last 24 hours',
    today: 'Filter messages from today'
  };
  
  return descriptions[name] || 'Custom jq query pattern';
}

function getPatternExample(name) {
  const examples = {
    userMessages: 'curl -X POST /api/v1/query -d \'{"filter": ".[] | select(.type==\\"user\\")"}\'',
    assistantMessages: 'curl -X POST /api/v1/query -d \'{"filter": ".[] | select(.type==\\"assistant\\")"}\'',
    messageCount: 'curl -X POST /api/v1/query -d \'{"filter": "group_by(.type) | map({type: .[0].type, count: length})"}\'',
    sessionSummary: 'curl -X POST /api/v1/query -d \'{"filter": "{total: length, types: group_by(.type) | map({type: .[0].type, count: length})}"}\'',
    recent: 'curl -X POST /api/v1/query -d \'{"filter": ".[] | select(.timestamp > (now - 86400))"}\'',
    today: 'curl -X POST /api/v1/query -d \'{"filter": ".[] | select(.timestamp | strftime(\\"%Y-%m-%d\\") == (now | strftime(\\"%Y-%m-%d\\")))"}\''
  };
  
  return examples[name] || `curl -X POST /api/v1/query -d '{"filter": "${name}"}'`;
}

export default router;