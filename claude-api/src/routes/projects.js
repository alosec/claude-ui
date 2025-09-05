import express from 'express';
import Joi from 'joi';
import sessionStore from '../services/session-store.js';
import { join } from 'path';
import { mkdir, rmdir } from 'fs/promises';
import { existsSync } from 'fs';
import winston from 'winston';

const router = express.Router();

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'projects-router' }
});

// Validation schemas
const querySchema = Joi.object({
  sort: Joi.string().valid('name', 'lastModified', 'sessionCount', 'totalSize').default('lastModified'),
  order: Joi.string().valid('asc', 'desc').default('desc'),
  limit: Joi.number().integer().min(1).max(1000).default(100)
});

const createProjectSchema = Joi.object({
  name: Joi.string().regex(/^[a-zA-Z0-9_-]+$/).required(),
  description: Joi.string().optional()
});

const projectDetailsSchema = Joi.object({
  includeSessions: Joi.boolean().default(true),
  sessionLimit: Joi.number().integer().min(1).max(1000).default(50)
});

/**
 * GET /api/v1/projects
 * List all projects
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

    const { sort, order, limit } = value;
    const startTime = Date.now();

    const projects = await sessionStore.getProjects(req.claudeProjectsPath);

    // Apply sorting
    projects.sort((a, b) => {
      let aVal, bVal;
      
      switch (sort) {
        case 'name':
          aVal = a.name.toLowerCase();
          bVal = b.name.toLowerCase();
          break;
        case 'lastModified':
          aVal = new Date(a.lastModified);
          bVal = new Date(b.lastModified);
          break;
        case 'sessionCount':
          aVal = a.sessionCount;
          bVal = b.sessionCount;
          break;
        case 'totalSize':
          aVal = a.totalSize;
          bVal = b.totalSize;
          break;
        default:
          aVal = new Date(a.lastModified);
          bVal = new Date(b.lastModified);
      }

      if (typeof aVal === 'string') {
        return order === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      } else {
        return order === 'asc' ? aVal - bVal : bVal - aVal;
      }
    });

    // Apply limit
    const limitedProjects = projects.slice(0, limit);

    const executionTime = Date.now() - startTime;

    res.json({
      success: true,
      data: {
        projects: limitedProjects,
        total: projects.length,
        showing: limitedProjects.length
      },
      meta: {
        timestamp: new Date().toISOString(),
        executionTimeMs: executionTime
      }
    });

  } catch (error) {
    logger.error('Failed to list projects', { error: error.message });
    next(error);
  }
});

/**
 * GET /api/v1/projects/:name
 * Get specific project details with sessions
 */
router.get('/:name', async (req, res, next) => {
  try {
    const { name } = req.params;
    const { error, value } = projectDetailsSchema.validate(req.query);
    
    if (error) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: error.details[0].message
        }
      });
    }

    const { includeSessions, sessionLimit } = value;
    const startTime = Date.now();

    const projectPath = join(req.claudeProjectsPath, name);
    
    if (!existsSync(projectPath)) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'PROJECT_NOT_FOUND',
          message: `Project '${name}' not found`
        }
      });
    }

    // Get project basic info
    const projects = await sessionStore.getProjects(req.claudeProjectsPath);
    const project = projects.find(p => p.name === name);

    if (!project) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'PROJECT_NOT_FOUND',
          message: `Project '${name}' not found`
        }
      });
    }

    let sessions = [];
    if (includeSessions) {
      const allSessions = await sessionStore.getProjectSessions(projectPath);
      sessions = allSessions.slice(0, sessionLimit);
    }

    const executionTime = Date.now() - startTime;

    res.json({
      success: true,
      data: {
        ...project,
        sessions,
        sessionsShowing: sessions.length,
        totalSessions: project.sessionCount
      },
      meta: {
        timestamp: new Date().toISOString(),
        executionTimeMs: executionTime
      }
    });

  } catch (error) {
    logger.error('Failed to get project details', { 
      projectName: req.params.name,
      error: error.message 
    });
    next(error);
  }
});

/**
 * POST /api/v1/projects
 * Create a new project directory
 */
router.post('/', async (req, res, next) => {
  try {
    const { error, value } = createProjectSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: error.details[0].message
        }
      });
    }

    const { name, description } = value;
    const startTime = Date.now();

    const projectPath = join(req.claudeProjectsPath, name);
    
    if (existsSync(projectPath)) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'PROJECT_EXISTS',
          message: `Project '${name}' already exists`
        }
      });
    }

    // Create project directory
    await mkdir(projectPath, { recursive: true });

    // Create project metadata file (optional)
    if (description) {
      const metadataPath = join(projectPath, '.project.json');
      const metadata = {
        name,
        description,
        created: new Date().toISOString(),
        version: '1.0.0'
      };
      
      await import('fs/promises').then(fs => 
        fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2))
      );
    }

    // Get the created project info
    const projects = await sessionStore.getProjects(req.claudeProjectsPath);
    const createdProject = projects.find(p => p.name === name);

    const executionTime = Date.now() - startTime;

    res.status(201).json({
      success: true,
      data: {
        ...createdProject,
        description
      },
      meta: {
        timestamp: new Date().toISOString(),
        executionTimeMs: executionTime
      }
    });

  } catch (error) {
    logger.error('Failed to create project', { 
      projectName: req.body.name,
      error: error.message 
    });
    next(error);
  }
});

/**
 * DELETE /api/v1/projects/:name
 * Delete a project and all its sessions
 */
router.delete('/:name', async (req, res, next) => {
  try {
    const { name } = req.params;
    const { force = false } = req.query;
    
    const startTime = Date.now();
    const projectPath = join(req.claudeProjectsPath, name);
    
    if (!existsSync(projectPath)) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'PROJECT_NOT_FOUND',
          message: `Project '${name}' not found`
        }
      });
    }

    // Get project sessions before deletion
    const sessions = await sessionStore.getProjectSessions(projectPath);
    
    if (sessions.length > 0 && !force) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'PROJECT_NOT_EMPTY',
          message: `Project '${name}' contains ${sessions.length} sessions. Use ?force=true to delete anyway.`
        }
      });
    }

    // Delete all session files first
    for (const session of sessions) {
      await sessionStore.deleteSession(session.filePath);
    }

    // Delete project directory
    await rmdir(projectPath);

    const executionTime = Date.now() - startTime;

    res.json({
      success: true,
      data: {
        projectName: name,
        deleted: true,
        sessionsDeleted: sessions.length
      },
      meta: {
        timestamp: new Date().toISOString(),
        executionTimeMs: executionTime
      }
    });

  } catch (error) {
    logger.error('Failed to delete project', { 
      projectName: req.params.name,
      error: error.message 
    });
    next(error);
  }
});

/**
 * GET /api/v1/projects/:name/sessions
 * Get all sessions for a specific project
 */
router.get('/:name/sessions', async (req, res, next) => {
  try {
    const { name } = req.params;
    const { 
      limit = 50, 
      offset = 0,
      sort = 'modified',
      order = 'desc'
    } = req.query;

    const startTime = Date.now();
    const projectPath = join(req.claudeProjectsPath, name);
    
    if (!existsSync(projectPath)) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'PROJECT_NOT_FOUND',
          message: `Project '${name}' not found`
        }
      });
    }

    const allSessions = await sessionStore.getProjectSessions(projectPath);

    // Apply sorting
    allSessions.sort((a, b) => {
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
        default:
          aVal = new Date(a.modified);
          bVal = new Date(b.modified);
      }

      return order === 'asc' ? aVal - bVal : bVal - aVal;
    });

    // Apply pagination
    const paginatedSessions = allSessions.slice(parseInt(offset), parseInt(offset) + parseInt(limit));

    const executionTime = Date.now() - startTime;

    res.json({
      success: true,
      data: {
        projectName: name,
        sessions: paginatedSessions,
        pagination: {
          total: allSessions.length,
          limit: parseInt(limit),
          offset: parseInt(offset),
          hasMore: parseInt(offset) + parseInt(limit) < allSessions.length
        }
      },
      meta: {
        timestamp: new Date().toISOString(),
        executionTimeMs: executionTime
      }
    });

  } catch (error) {
    logger.error('Failed to get project sessions', { 
      projectName: req.params.name,
      error: error.message 
    });
    next(error);
  }
});

/**
 * GET /api/v1/projects/:name/stats
 * Get project statistics
 */
router.get('/:name/stats', async (req, res, next) => {
  try {
    const { name } = req.params;
    const startTime = Date.now();
    
    const projectPath = join(req.claudeProjectsPath, name);
    
    if (!existsSync(projectPath)) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'PROJECT_NOT_FOUND',
          message: `Project '${name}' not found`
        }
      });
    }

    const sessions = await sessionStore.getProjectSessions(projectPath);
    
    // Calculate statistics
    const stats = {
      sessionCount: sessions.length,
      totalSize: sessions.reduce((sum, s) => sum + s.size, 0),
      oldestSession: sessions.length > 0 ? new Date(Math.min(...sessions.map(s => s.created))) : null,
      newestSession: sessions.length > 0 ? new Date(Math.max(...sessions.map(s => s.modified))) : null,
      averageSessionSize: sessions.length > 0 ? Math.round(sessions.reduce((sum, s) => sum + s.size, 0) / sessions.length) : 0,
      sizeDistribution: {
        small: sessions.filter(s => s.size < 10000).length,  // < 10KB
        medium: sessions.filter(s => s.size >= 10000 && s.size < 100000).length, // 10KB-100KB
        large: sessions.filter(s => s.size >= 100000).length  // > 100KB
      }
    };

    const executionTime = Date.now() - startTime;

    res.json({
      success: true,
      data: {
        projectName: name,
        statistics: stats
      },
      meta: {
        timestamp: new Date().toISOString(),
        executionTimeMs: executionTime
      }
    });

  } catch (error) {
    logger.error('Failed to get project statistics', { 
      projectName: req.params.name,
      error: error.message 
    });
    next(error);
  }
});

export default router;