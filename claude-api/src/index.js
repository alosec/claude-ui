import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import winston from 'winston';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';
import os from 'os';

// Import routes
import sessionsRouter from './routes/sessions.js';
import projectsRouter from './routes/projects.js';
import chatRouter from './routes/chat.js';
import queryRouter from './routes/query.js';

// Configure logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'claude-api' },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
});

// Add console transport for development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

// Configuration
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Determine Claude projects path
const getClaudeProjectsPath = () => {
  if (process.env.CLAUDE_PROJECTS_PATH) {
    return process.env.CLAUDE_PROJECTS_PATH;
  }
  
  const homePath = os.homedir();
  const defaultPath = join(homePath, '.claude', 'projects');
  
  if (existsSync(defaultPath)) {
    return defaultPath;
  }
  
  throw new Error(`Claude projects directory not found. Please set CLAUDE_PROJECTS_PATH environment variable.`);
};

// Initialize Express app
const app = express();

// Security and performance middleware
app.use(helmet({
  contentSecurityPolicy: false, // Allow for API usage
}));

app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));

app.use(compression());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.RATE_LIMIT || 1000, // limit each IP to 1000 requests per windowMs
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests from this IP, please try again later'
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('Request processed', {
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
  });
  next();
});

// Add Claude projects path to request context
app.use((req, res, next) => {
  try {
    req.claudeProjectsPath = getClaudeProjectsPath();
    next();
  } catch (error) {
    logger.error('Failed to determine Claude projects path', { error: error.message });
    res.status(500).json({
      success: false,
      error: {
        code: 'CONFIGURATION_ERROR',
        message: 'Claude projects directory not accessible'
      }
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: NODE_ENV,
      uptime: process.uptime(),
      claudeProjectsPath: req.claudeProjectsPath
    }
  });
});

// API routes
app.use('/api/v1/sessions', sessionsRouter);
app.use('/api/v1/projects', projectsRouter);
app.use('/api/v1/chat', chatRouter);
app.use('/api/v1/query', queryRouter);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.originalUrl} not found`
    }
  });
});

// Global error handler
app.use((err, req, res, next) => {
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method
  });

  // Don't leak error details in production
  const isProduction = NODE_ENV === 'production';
  
  res.status(err.status || 500).json({
    success: false,
    error: {
      code: err.code || 'INTERNAL_SERVER_ERROR',
      message: isProduction ? 'An internal server error occurred' : err.message,
      ...(isProduction ? {} : { stack: err.stack })
    },
    meta: {
      timestamp: new Date().toISOString(),
      request_id: req.id
    }
  });
});

// Start server only if not in test mode or explicitly disabled
let server;
const shouldStartServer = NODE_ENV !== 'test' && 
                          !process.env.DISABLE_SERVER_START && 
                          !global.__JEST__ && 
                          process.env.NODE_ENV !== 'test';
if (shouldStartServer) {
  server = app.listen(PORT, () => {
    logger.info(`Claude API server started`, {
      port: PORT,
      environment: NODE_ENV,
      claudeProjectsPath: getClaudeProjectsPath()
    });
  });
}

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  if (server) {
    server.close(() => {
      logger.info('Process terminated');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  if (server) {
    server.close(() => {
      logger.info('Process terminated');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
});

export default app;