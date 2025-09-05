import jq from 'node-jq';
import { createReadStream } from 'fs';
import { Transform } from 'stream';
import { pipeline } from 'stream/promises';
import winston from 'winston';

// Create logger based on environment
const logger = (() => {
  if (process.env.NODE_ENV === 'test') {
    return winston.createLogger({
      level: 'error',
      format: winston.format.json(),
      defaultMeta: { service: 'jq-processor' },
      transports: [],
      silent: true
    });
  }
  
  return winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    ),
    defaultMeta: { service: 'jq-processor' },
    transports: [
      new winston.transports.Console()
    ]
  });
})();

class JQProcessor {
  constructor() {
    this.queryCache = new Map();
    this.maxCacheSize = 100;
    this.queryTimeoutMs = 30000; // 30 second timeout
  }

  /**
   * Validate and compile a jq query
   * @param {string} query - The jq query string
   * @returns {Promise<void>}
   */
  async validateQuery(query) {
    if (!query || typeof query !== 'string') {
      throw new Error('Query must be a non-empty string');
    }

    // Basic security checks
    if (query.includes('..') || query.includes('/') || query.includes('\\')) {
      throw new Error('Query contains potentially dangerous path traversal');
    }

    // Check for system commands or shell execution
    const dangerousPatterns = [
      /system\s*\(/,
      /exec\s*\(/,
      /import\s+/,
      /include\s+/,
      /@sh\b/,
      /@base64d\b/
    ];

    if (dangerousPatterns.some(pattern => pattern.test(query))) {
      throw new Error('Query contains potentially dangerous operations');
    }

    // Test compilation with appropriate dummy data to catch syntax errors
    try {
      // Test with both object and array data structures since queries can expect either
      const testObject = { type: "test", message: "test data" };
      const testArray = [testObject, { type: "test2", message: "more test data" }];
      
      // Always test basic identity first
      await jq.run('.', testObject, { input: 'json' });
      
      // Try the query with object first, then array if it fails
      try {
        await jq.run(query, testObject, { input: 'json' });
      } catch (objectError) {
        // If query failed on object, try with array (for queries like .[] that expect arrays)
        try {
          await jq.run(query, testArray, { input: 'json' });
        } catch (arrayError) {
          // If both fail, report the original error (more likely to be relevant)
          throw objectError;
        }
      }
    } catch (error) {
      throw new Error(`jq query syntax error: ${error.message}`);
    }
  }

  /**
   * Execute a jq query on JSON data
   * @param {string} query - The jq query string
   * @param {any} data - The input data
   * @param {Object} options - Processing options
   * @returns {Promise<any>}
   */
  async runQuery(query, data, options = {}) {
    const startTime = Date.now();
    
    try {
      await this.validateQuery(query);

      const cacheKey = this.getCacheKey(query, options);
      
      // Set up jq options - use 'compact' output to handle multiple results properly
      const jqOptions = {
        input: 'json',
        output: 'compact',  // Changed from 'json' to handle multiple results
        ...options.jqOptions
      };

      // Add timeout wrapper
      const queryPromise = jq.run(query, data, jqOptions);
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Query timeout')), this.queryTimeoutMs);
      });

      const rawResult = await Promise.race([queryPromise, timeoutPromise]);
      
      // Parse the result properly - compact output returns newline-separated JSON
      let result;
      if (typeof rawResult === 'string' && rawResult.trim()) {
        const lines = rawResult.trim().split('\n');
        if (lines.length === 1) {
          // Single result
          try {
            result = JSON.parse(lines[0]);
          } catch (parseError) {
            result = rawResult; // Return as-is if not JSON
          }
        } else if (lines.length > 1) {
          // Multiple results - return as array
          result = lines.map(line => {
            try {
              return JSON.parse(line);
            } catch (parseError) {
              return line; // Return as-is if not JSON
            }
          });
        } else {
          result = null;
        }
      } else if (rawResult === '' || rawResult === null || rawResult === undefined) {
        // Empty result - return empty array for queries that should return multiple items
        if (query.includes('[]') || query.includes('select')) {
          result = [];
        } else {
          result = null;
        }
      } else {
        result = rawResult;
      }
      
      const executionTime = Date.now() - startTime;
      
      logger.debug('jq query executed', {
        query: query.substring(0, 100) + (query.length > 100 ? '...' : ''),
        executionTimeMs: executionTime,
        resultType: typeof result,
        resultLength: Array.isArray(result) ? result.length : 'N/A'
      });

      return result;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      
      logger.error('jq query failed', {
        query: query.substring(0, 100) + (query.length > 100 ? '...' : ''),
        error: error.message,
        executionTimeMs: executionTime
      });

      throw new Error(`jq query execution failed: ${error.message}`);
    }
  }

  /**
   * Stream JSONL data through a jq query
   * @param {string} filePath - Path to JSONL file
   * @param {string} query - The jq query string
   * @param {Object} options - Processing options
   * @returns {Promise<Array>}
   */
  async streamQuery(filePath, query, options = {}) {
    await this.validateQuery(query);

    const results = [];
    const errors = [];
    let lineNumber = 0;

    // Adapt query for line-by-line processing
    // Remove array operators since we're processing individual objects
    let adaptedQuery = query;
    if (query.startsWith('.[] | ')) {
      adaptedQuery = query.substring(5); // Remove '.[] | ' prefix
    } else if (query === '.[]') {
      adaptedQuery = '.'; // Just return the object itself
    }

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
          const jsonData = JSON.parse(line);
          
          // Process each line with adapted jq query - use compact output
          jq.run(adaptedQuery, jsonData, { input: 'json', output: 'compact' })
            .then(rawResult => {
              // Handle the compact output format
              if (rawResult && typeof rawResult === 'string' && rawResult.trim()) {
                try {
                  const result = JSON.parse(rawResult.trim());
                  if (result !== null && result !== undefined) {
                    this.push(result);
                  }
                } catch (parseError) {
                  // If not valid JSON, push as-is
                  if (rawResult.trim()) {
                    this.push(rawResult.trim());
                  }
                }
              } else if (rawResult !== null && rawResult !== undefined && rawResult !== '') {
                this.push(rawResult);
              }
              callback();
            })
            .catch(error => {
              errors.push({
                line: lineNumber,
                error: error.message,
                data: line.substring(0, 100) + (line.length > 100 ? '...' : '')
              });
              callback();
            });
        } catch (error) {
          errors.push({
            line: lineNumber,
            error: `JSON parse error: ${error.message}`,
            data: line.substring(0, 100) + (line.length > 100 ? '...' : '')
          });
          callback();
        }
      }
    });

    transformStream.on('data', (data) => {
      results.push(data);
    });

    try {
      await pipeline(
        createReadStream(filePath, { encoding: 'utf8' }),
        new Transform({
          transform(chunk, encoding, callback) {
            // Split by lines, handling partial lines
            const lines = chunk.toString().split('\n');
            for (let i = 0; i < lines.length - 1; i++) {
              this.push(lines[i] + '\n');
            }
            // Keep the last partial line for next chunk
            if (lines[lines.length - 1]) {
              this._lastPartialLine = (this._lastPartialLine || '') + lines[lines.length - 1];
            }
            callback();
          },
          flush(callback) {
            if (this._lastPartialLine) {
              this.push(this._lastPartialLine);
            }
            callback();
          }
        }),
        transformStream
      );
    } catch (error) {
      throw new Error(`Stream processing failed: ${error.message}`);
    }

    if (errors.length > 0 && results.length === 0) {
      throw new Error(`All lines failed processing. First error: ${errors[0].error}`);
    }

    return {
      results,
      errors: errors.length > 0 ? errors : undefined,
      totalLines: lineNumber
    };
  }

  /**
   * Execute a jq query across multiple JSONL files
   * @param {Array<string>} filePaths - Array of JSONL file paths
   * @param {string} query - The jq query string
   * @param {Object} options - Processing options
   * @returns {Promise<Array>}
   */
  async runMultiFileQuery(filePaths, query, options = {}) {
    if (!Array.isArray(filePaths) || filePaths.length === 0) {
      throw new Error('filePaths must be a non-empty array');
    }

    // Check if this is an aggregation query that needs all data at once
    const isAggregationQuery = query.includes('group_by') || 
                               query.includes('sort_by') || 
                               query.includes('max_by') || 
                               query.includes('min_by') ||
                               query.includes('unique_by') ||
                               (query.includes('map(') && !query.startsWith('.[] |'));

    if (isAggregationQuery) {
      // For aggregation queries, we need to collect all data first
      const allData = [];
      let totalLines = 0;
      const allErrors = [];

      // Read all files and collect all JSONL entries
      for (const filePath of filePaths) {
        try {
          const { results, errors, totalLines: fileLines } = await this.streamQuery(filePath, '.', options);
          allData.push(...results);
          totalLines += fileLines;
          
          if (errors) {
            allErrors.push({
              file: filePath,
              errors
            });
          }
        } catch (error) {
          allErrors.push({
            file: filePath,
            errors: [{ error: error.message }]
          });
        }
      }

      // Now run the aggregation query on all collected data
      try {
        const aggregatedResult = await this.runQuery(query, allData);
        const results = Array.isArray(aggregatedResult) ? aggregatedResult : [aggregatedResult];
        
        return {
          results: results.filter(r => r !== null && r !== undefined),
          errors: allErrors.length > 0 ? allErrors : undefined,
          totalLines,
          filesProcessed: filePaths.length
        };
      } catch (error) {
        throw new Error(`Aggregation query failed: ${error.message}`);
      }
    } else {
      // For non-aggregation queries, use streaming approach
      const allResults = [];
      const allErrors = [];
      let totalLines = 0;

      for (const filePath of filePaths) {
        try {
          const { results, errors, totalLines: fileLines } = await this.streamQuery(filePath, query, options);
          
          allResults.push(...results);
          totalLines += fileLines;
          
          if (errors) {
            allErrors.push({
              file: filePath,
              errors
            });
          }
        } catch (error) {
          allErrors.push({
            file: filePath,
            errors: [{ error: error.message }]
          });
        }
      }

      return {
        results: allResults,
        errors: allErrors.length > 0 ? allErrors : undefined,
        totalLines,
        filesProcessed: filePaths.length
      };
    }
  }

  /**
   * Get commonly used jq query patterns
   * @returns {Object}
   */
  getQueryPatterns() {
    return {
      // Message filtering
      userMessages: '.[] | select(.type == "user")',
      assistantMessages: '.[] | select(.type == "assistant")',
      systemMessages: '.[] | select(.type == "system")',
      
      // Content extraction
      messageContent: '.[] | select(.message) | .message.content',
      toolUses: '.[] | select(.tool_use) | .tool_use',
      toolResults: '.[] | select(.tool_use_result) | .tool_use_result',
      
      // Statistics
      messageCount: 'group_by(.type) | map({type: .[0].type, count: length})',
      sessionSummary: '{total: length, types: group_by(.type) | map({type: .[0].type, count: length})}',
      
      // Time-based filtering
      recent: '.[] | select(.timestamp > (now - 86400))', // Last 24 hours
      today: '.[] | select(.timestamp | strftime("%Y-%m-%d") == (now | strftime("%Y-%m-%d")))',
      
      // Search patterns
      contentSearch: (term) => `.[] | select(.message.content | type == "string" and contains("${term}"))`,
      toolSearch: (toolName) => `.[] | select(.tool_use.name == "${toolName}")`
    };
  }

  /**
   * Generate cache key for query and options
   */
  getCacheKey(query, options) {
    return `${query}:${JSON.stringify(options)}`;
  }

  /**
   * Clear the query cache
   */
  clearCache() {
    this.queryCache.clear();
    logger.info('jq processor cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      size: this.queryCache.size,
      maxSize: this.maxCacheSize,
      hitRatio: this.cacheHits / (this.cacheHits + this.cacheMisses) || 0
    };
  }
}

export default new JQProcessor();