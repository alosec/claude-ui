import { readdir, readFile, stat, unlink, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join, basename } from 'path';
import { createReadStream } from 'fs';
import { Transform } from 'stream';
import { pipeline } from 'stream/promises';
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'session-store' }
});

class SessionStore {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Get all projects in the Claude projects directory
   * @param {string} projectsPath - Path to Claude projects directory
   * @returns {Promise<Array<Object>>}
   */
  async getProjects(projectsPath) {
    try {
      const entries = await readdir(projectsPath, { withFileTypes: true });
      const projects = [];

      for (const entry of entries) {
        if (entry.isDirectory()) {
          const projectPath = join(projectsPath, entry.name);
          const sessions = await this.getProjectSessions(projectPath);
          
          projects.push({
            name: entry.name,
            path: projectPath,
            sessionCount: sessions.length,
            lastModified: await this.getProjectLastModified(projectPath),
            totalSize: await this.getProjectSize(projectPath)
          });
        }
      }

      return projects.sort((a, b) => b.lastModified - a.lastModified);
    } catch (error) {
      logger.error('Failed to get projects', { error: error.message, projectsPath });
      throw new Error(`Failed to read projects directory: ${error.message}`);
    }
  }

  /**
   * Get all sessions for a specific project
   * @param {string} projectPath - Path to project directory
   * @returns {Promise<Array<Object>>}
   */
  async getProjectSessions(projectPath) {
    try {
      if (!existsSync(projectPath)) {
        return [];
      }

      const files = await readdir(projectPath);
      const sessions = [];

      for (const file of files) {
        if (file.endsWith('.jsonl')) {
          const filePath = join(projectPath, file);
          const stats = await stat(filePath);
          const sessionId = basename(file, '.jsonl');

          // Get basic session info from file stats
          const sessionInfo = {
            id: sessionId,
            filePath,
            size: stats.size,
            created: stats.birthtime,
            modified: stats.mtime,
            messageCount: null, // Will be populated on demand
            lastMessage: null
          };

          sessions.push(sessionInfo);
        }
      }

      return sessions.sort((a, b) => b.modified - a.modified);
    } catch (error) {
      logger.error('Failed to get project sessions', { error: error.message, projectPath });
      return [];
    }
  }

  /**
   * Get detailed session information
   * @param {string} sessionFilePath - Path to session JSONL file
   * @returns {Promise<Object>}
   */
  async getSessionDetails(sessionFilePath) {
    const cacheKey = `session:${sessionFilePath}`;
    
    // Check cache first
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }
    }

    try {
      const stats = await stat(sessionFilePath);
      const sessionId = basename(sessionFilePath, '.jsonl');

      // Read session messages
      const messages = await this.readSessionMessages(sessionFilePath);
      
      const sessionDetails = {
        id: sessionId,
        filePath: sessionFilePath,
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
        messageCount: messages.length,
        messages,
        firstMessage: messages[0] || null,
        lastMessage: messages[messages.length - 1] || null,
        types: this.getMessageTypes(messages),
        statistics: this.generateSessionStatistics(messages)
      };

      // Cache the result
      this.cache.set(cacheKey, {
        data: sessionDetails,
        timestamp: Date.now()
      });

      return sessionDetails;
    } catch (error) {
      logger.error('Failed to get session details', { 
        error: error.message, 
        sessionFilePath 
      });
      throw new Error(`Failed to read session: ${error.message}`);
    }
  }

  /**
   * Read all messages from a session JSONL file
   * @param {string} filePath - Path to session JSONL file
   * @param {Object} options - Reading options
   * @returns {Promise<Array<Object>>}
   */
  async readSessionMessages(filePath, options = {}) {
    const { limit, offset = 0 } = options;
    
    try {
      const fileContent = await readFile(filePath, 'utf8');
      const lines = fileContent.trim().split('\n').filter(line => line.trim());
      
      const messages = [];
      let lineNumber = 0;

      for (const line of lines) {
        lineNumber++;
        
        if (offset && lineNumber <= offset) {
          continue;
        }
        
        if (limit && messages.length >= limit) {
          break;
        }

        try {
          const message = JSON.parse(line);
          message._lineNumber = lineNumber;
          messages.push(message);
        } catch (error) {
          logger.warn('Failed to parse message line', {
            filePath,
            lineNumber,
            error: error.message,
            line: line.substring(0, 100) + (line.length > 100 ? '...' : '')
          });
        }
      }

      return messages;
    } catch (error) {
      logger.error('Failed to read session messages', { 
        error: error.message, 
        filePath 
      });
      throw new Error(`Failed to read session file: ${error.message}`);
    }
  }

  /**
   * Stream session messages with optional filtering
   * @param {string} filePath - Path to session JSONL file
   * @param {Function} filter - Optional filter function
   * @returns {Promise<Array<Object>>}
   */
  async streamSessionMessages(filePath, filter = null) {
    const messages = [];
    let lineNumber = 0;

    const transformStream = new Transform({
      objectMode: true,
      transform(chunk, encoding, callback) {
        lineNumber++;
        const line = chunk.toString().trim();
        
        if (!line) {
          callback();
          return;
        }

        try {
          const message = JSON.parse(line);
          message._lineNumber = lineNumber;
          
          if (!filter || filter(message)) {
            this.push(message);
          }
        } catch (error) {
          logger.warn('Failed to parse message line during streaming', {
            filePath,
            lineNumber,
            error: error.message
          });
        }
        
        callback();
      }
    });

    transformStream.on('data', (message) => {
      messages.push(message);
    });

    await pipeline(
      createReadStream(filePath, { encoding: 'utf8' }),
      new Transform({
        transform(chunk, encoding, callback) {
          const lines = chunk.toString().split('\n');
          for (const line of lines) {
            if (line.trim()) {
              this.push(line + '\n');
            }
          }
          callback();
        }
      }),
      transformStream
    );

    return messages;
  }

  /**
   * Find sessions matching criteria
   * @param {string} projectsPath - Path to Claude projects directory
   * @param {Object} criteria - Search criteria
   * @returns {Promise<Array<Object>>}
   */
  async findSessions(projectsPath, criteria = {}) {
    const {
      projectName,
      sessionId,
      messageContent,
      messageType,
      dateFrom,
      dateTo,
      limit = 100
    } = criteria;

    const results = [];
    const projects = await this.getProjects(projectsPath);

    for (const project of projects) {
      if (projectName && project.name !== projectName) {
        continue;
      }

      const sessions = await this.getProjectSessions(project.path);

      for (const session of sessions) {
        if (sessionId && session.id !== sessionId) {
          continue;
        }

        if (dateFrom && session.modified < new Date(dateFrom)) {
          continue;
        }

        if (dateTo && session.modified > new Date(dateTo)) {
          continue;
        }

        // If we need to check message content, load the messages
        if (messageContent || messageType) {
          try {
            const messages = await this.readSessionMessages(session.filePath);
            
            const matchingMessages = messages.filter(msg => {
              if (messageType && msg.type !== messageType) {
                return false;
              }
              
              if (messageContent) {
                const content = this.extractMessageContent(msg);
                if (!content || !content.toLowerCase().includes(messageContent.toLowerCase())) {
                  return false;
                }
              }
              
              return true;
            });

            if (matchingMessages.length > 0) {
              results.push({
                ...session,
                project: project.name,
                matchingMessages: matchingMessages.length,
                messages: matchingMessages.slice(0, 5) // Include first 5 matching messages
              });
            }
          } catch (error) {
            logger.error('Failed to search session messages', {
              sessionId: session.id,
              error: error.message
            });
          }
        } else {
          results.push({
            ...session,
            project: project.name
          });
        }

        if (results.length >= limit) {
          break;
        }
      }

      if (results.length >= limit) {
        break;
      }
    }

    return results;
  }

  /**
   * Delete a session
   * @param {string} sessionFilePath - Path to session JSONL file
   * @returns {Promise<boolean>}
   */
  async deleteSession(sessionFilePath) {
    try {
      await unlink(sessionFilePath);
      
      // Clear from cache
      const cacheKey = `session:${sessionFilePath}`;
      this.cache.delete(cacheKey);
      
      logger.info('Session deleted', { sessionFilePath });
      return true;
    } catch (error) {
      logger.error('Failed to delete session', { 
        error: error.message, 
        sessionFilePath 
      });
      throw new Error(`Failed to delete session: ${error.message}`);
    }
  }

  /**
   * Create a new session file
   * @param {string} projectPath - Path to project directory
   * @param {string} sessionId - Session ID
   * @param {Array<Object>} initialMessages - Initial messages
   * @returns {Promise<string>}
   */
  async createSession(projectPath, sessionId, initialMessages = []) {
    const sessionFilePath = join(projectPath, `${sessionId}.jsonl`);
    
    try {
      const jsonlContent = initialMessages
        .map(msg => JSON.stringify(msg))
        .join('\n');
      
      await writeFile(sessionFilePath, jsonlContent + (jsonlContent ? '\n' : ''));
      
      logger.info('Session created', { sessionId, sessionFilePath });
      return sessionFilePath;
    } catch (error) {
      logger.error('Failed to create session', { 
        error: error.message, 
        sessionId,
        sessionFilePath 
      });
      throw new Error(`Failed to create session: ${error.message}`);
    }
  }

  /**
   * Generate session statistics
   * @param {Array<Object>} messages - Session messages
   * @returns {Object}
   */
  generateSessionStatistics(messages) {
    const stats = {
      total: messages.length,
      types: {},
      timespan: null,
      averageMessageLength: 0,
      toolUses: 0,
      toolResults: 0
    };

    if (messages.length === 0) {
      return stats;
    }

    // Count by type
    messages.forEach(msg => {
      stats.types[msg.type] = (stats.types[msg.type] || 0) + 1;
      
      if (msg.tool_use) stats.toolUses++;
      if (msg.tool_use_result) stats.toolResults++;
    });

    // Calculate timespan
    const timestamps = messages
      .map(msg => new Date(msg.timestamp))
      .filter(date => !isNaN(date.getTime()));

    if (timestamps.length > 1) {
      const earliest = new Date(Math.min(...timestamps));
      const latest = new Date(Math.max(...timestamps));
      stats.timespan = {
        start: earliest,
        end: latest,
        durationMs: latest.getTime() - earliest.getTime()
      };
    }

    // Average message length
    const contentLengths = messages
      .map(msg => this.extractMessageContent(msg))
      .filter(content => content)
      .map(content => content.length);

    if (contentLengths.length > 0) {
      stats.averageMessageLength = Math.round(
        contentLengths.reduce((sum, len) => sum + len, 0) / contentLengths.length
      );
    }

    return stats;
  }

  /**
   * Extract text content from a message
   * @param {Object} message - Message object
   * @returns {string|null}
   */
  extractMessageContent(message) {
    if (message.message && message.message.content) {
      if (typeof message.message.content === 'string') {
        return message.message.content;
      } else if (Array.isArray(message.message.content)) {
        return message.message.content
          .map(block => block.text || block.content || '')
          .join(' ');
      }
    }
    
    return null;
  }

  /**
   * Get message types from a session
   * @param {Array<Object>} messages - Session messages
   * @returns {Object}
   */
  getMessageTypes(messages) {
    return messages.reduce((types, msg) => {
      types[msg.type] = (types[msg.type] || 0) + 1;
      return types;
    }, {});
  }

  /**
   * Get project last modified time
   * @param {string} projectPath - Path to project directory
   * @returns {Promise<Date>}
   */
  async getProjectLastModified(projectPath) {
    try {
      const files = await readdir(projectPath);
      let latestTime = new Date(0);

      for (const file of files) {
        if (file.endsWith('.jsonl')) {
          const filePath = join(projectPath, file);
          const stats = await stat(filePath);
          if (stats.mtime > latestTime) {
            latestTime = stats.mtime;
          }
        }
      }

      return latestTime;
    } catch (error) {
      return new Date(0);
    }
  }

  /**
   * Get total size of project files
   * @param {string} projectPath - Path to project directory
   * @returns {Promise<number>}
   */
  async getProjectSize(projectPath) {
    try {
      const files = await readdir(projectPath);
      let totalSize = 0;

      for (const file of files) {
        if (file.endsWith('.jsonl')) {
          const filePath = join(projectPath, file);
          const stats = await stat(filePath);
          totalSize += stats.size;
        }
      }

      return totalSize;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Clear the cache
   */
  clearCache() {
    this.cache.clear();
    logger.info('Session store cache cleared');
  }

  /**
   * Get cache statistics
   * @returns {Object}
   */
  getCacheStats() {
    return {
      entries: this.cache.size,
      cacheTimeoutMs: this.cacheTimeout
    };
  }
}

export default new SessionStore();