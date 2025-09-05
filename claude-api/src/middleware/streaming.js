import { Transform } from 'stream';
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'streaming-middleware' }
});

/**
 * Middleware for NDJSON streaming responses
 * @param {Object} options - Streaming options
 * @returns {Function}
 */
export function streamingMiddleware(options = {}) {
  const {
    bufferSize = 1024 * 16, // 16KB buffer
    flushInterval = 100, // Flush every 100ms
    compressionThreshold = 1024, // Compress responses > 1KB
    timeout = 30000 // 30 second timeout
  } = options;

  return (req, res, next) => {
    // Add streaming utilities to response object
    res.streamJson = (data, type = 'data') => {
      const chunk = JSON.stringify({
        type,
        data,
        timestamp: new Date().toISOString()
      }) + '\n';

      res.write(chunk);
    };

    res.streamError = (error, code = 'STREAM_ERROR') => {
      const chunk = JSON.stringify({
        type: 'error',
        error: {
          code,
          message: error.message || error,
          timestamp: new Date().toISOString()
        }
      }) + '\n';

      res.write(chunk);
    };

    res.streamEnd = (finalData = null) => {
      if (finalData) {
        res.streamJson(finalData, 'end');
      } else {
        const chunk = JSON.stringify({
          type: 'end',
          timestamp: new Date().toISOString()
        }) + '\n';
        
        res.write(chunk);
      }
      
      res.end();
    };

    // Setup streaming headers if not already set
    res.setupStreaming = (contentType = 'application/x-ndjson') => {
      if (!res.headersSent) {
        res.writeHead(200, {
          'Content-Type': contentType,
          'Transfer-Encoding': 'chunked',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
          'Connection': 'keep-alive',
          'X-Accel-Buffering': 'no', // Disable nginx buffering
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Expose-Headers': 'X-Stream-Id'
        });
      }
    };

    next();
  };
}

/**
 * Transform stream for processing JSONL data
 */
export class JSONLTransform extends Transform {
  constructor(options = {}) {
    super({
      objectMode: true,
      ...options
    });
    
    this.lineBuffer = '';
    this.lineCount = 0;
    this.errorCount = 0;
  }

  _transform(chunk, encoding, callback) {
    try {
      const data = chunk.toString();
      this.lineBuffer += data;

      const lines = this.lineBuffer.split('\n');
      this.lineBuffer = lines.pop() || ''; // Keep incomplete line

      for (const line of lines) {
        this.lineCount++;
        
        if (line.trim()) {
          try {
            const parsed = JSON.parse(line);
            this.push(parsed);
          } catch (parseError) {
            this.errorCount++;
            
            // Emit parse error but continue processing
            this.emit('parseError', {
              line: this.lineCount,
              content: line.substring(0, 100) + (line.length > 100 ? '...' : ''),
              error: parseError.message
            });
          }
        }
      }

      callback();
    } catch (error) {
      callback(error);
    }
  }

  _flush(callback) {
    // Process any remaining data in buffer
    if (this.lineBuffer.trim()) {
      this.lineCount++;
      
      try {
        const parsed = JSON.parse(this.lineBuffer);
        this.push(parsed);
      } catch (parseError) {
        this.errorCount++;
        
        this.emit('parseError', {
          line: this.lineCount,
          content: this.lineBuffer.substring(0, 100) + (this.lineBuffer.length > 100 ? '...' : ''),
          error: parseError.message
        });
      }
    }

    callback();
  }

  getStats() {
    return {
      linesProcessed: this.lineCount,
      errors: this.errorCount
    };
  }
}

/**
 * Transform stream for converting objects to NDJSON
 */
export class NDJSONTransform extends Transform {
  constructor(options = {}) {
    super({
      objectMode: true,
      ...options
    });
    
    this.objectCount = 0;
    this.addTimestamp = options.addTimestamp !== false;
    this.addMetadata = options.addMetadata || false;
  }

  _transform(chunk, encoding, callback) {
    try {
      let obj = chunk;
      
      // Add timestamp if requested
      if (this.addTimestamp && typeof obj === 'object' && obj !== null) {
        obj = {
          ...obj,
          _timestamp: new Date().toISOString()
        };
      }

      // Add metadata if requested
      if (this.addMetadata && typeof obj === 'object' && obj !== null) {
        obj = {
          ...obj,
          _meta: {
            sequence: this.objectCount,
            source: 'streaming-api'
          }
        };
      }

      const jsonLine = JSON.stringify(obj) + '\n';
      this.objectCount++;
      
      this.push(jsonLine);
      callback();
    } catch (error) {
      callback(error);
    }
  }

  getStats() {
    return {
      objectsProcessed: this.objectCount
    };
  }
}

/**
 * Rate limiting transform for streaming data
 */
export class RateLimitTransform extends Transform {
  constructor(options = {}) {
    super({
      objectMode: true,
      ...options
    });
    
    this.rateLimit = options.rateLimit || 100; // items per second
    this.windowSize = options.windowSize || 1000; // 1 second window
    this.requestCounts = [];
    this.lastCleanup = Date.now();
  }

  _transform(chunk, encoding, callback) {
    const now = Date.now();
    
    // Cleanup old entries
    if (now - this.lastCleanup > this.windowSize) {
      const cutoff = now - this.windowSize;
      this.requestCounts = this.requestCounts.filter(timestamp => timestamp > cutoff);
      this.lastCleanup = now;
    }

    // Check rate limit
    if (this.requestCounts.length >= this.rateLimit) {
      const oldestRequest = this.requestCounts[0];
      const timeToWait = this.windowSize - (now - oldestRequest);
      
      if (timeToWait > 0) {
        // Emit rate limit warning
        this.emit('rateLimitWarning', {
          limit: this.rateLimit,
          windowSize: this.windowSize,
          currentCount: this.requestCounts.length,
          timeToWait
        });
        
        // Delay processing
        setTimeout(() => {
          this.requestCounts.push(now);
          this.push(chunk);
          callback();
        }, timeToWait);
        
        return;
      }
    }

    this.requestCounts.push(now);
    this.push(chunk);
    callback();
  }
}

/**
 * Error handling transform for streaming pipelines
 */
export class ErrorHandlingTransform extends Transform {
  constructor(options = {}) {
    super({
      objectMode: true,
      ...options
    });
    
    this.maxErrors = options.maxErrors || 10;
    this.errorCount = 0;
    this.continueOnError = options.continueOnError !== false;
  }

  _transform(chunk, encoding, callback) {
    try {
      // Process the chunk (placeholder for actual processing logic)
      this.push(chunk);
      callback();
    } catch (error) {
      this.errorCount++;
      
      const errorInfo = {
        error: error.message,
        chunk: typeof chunk === 'string' ? chunk.substring(0, 100) : '[object]',
        errorCount: this.errorCount,
        timestamp: new Date().toISOString()
      };

      this.emit('processingError', errorInfo);

      if (this.errorCount >= this.maxErrors) {
        callback(new Error(`Too many errors (${this.errorCount}), stopping stream`));
        return;
      }

      if (this.continueOnError) {
        callback(); // Continue processing
      } else {
        callback(error);
      }
    }
  }

  getErrorStats() {
    return {
      errorCount: this.errorCount,
      maxErrors: this.maxErrors
    };
  }
}

/**
 * Compression transform for streaming large responses
 */
export class CompressionTransform extends Transform {
  constructor(options = {}) {
    super(options);
    
    this.compressionThreshold = options.threshold || 1024;
    this.compressionLevel = options.level || 6;
    this.buffer = Buffer.alloc(0);
    this.totalBytes = 0;
  }

  _transform(chunk, encoding, callback) {
    this.totalBytes += chunk.length;
    
    if (this.totalBytes < this.compressionThreshold) {
      // Don't compress small responses
      this.push(chunk);
    } else {
      // Accumulate data for compression
      this.buffer = Buffer.concat([this.buffer, chunk]);
    }
    
    callback();
  }

  _flush(callback) {
    if (this.buffer.length > 0) {
      // Apply compression (placeholder - would use zlib in real implementation)
      this.push(this.buffer);
    }
    
    callback();
  }
}

/**
 * Utility function to create a streaming pipeline with error handling
 * @param {Array} transforms - Array of transform streams
 * @param {Object} options - Pipeline options
 * @returns {Transform}
 */
export function createStreamingPipeline(transforms, options = {}) {
  const { 
    errorHandler = null,
    timeout = 30000,
    autoCleanup = true 
  } = options;

  const pipeline = new Transform({
    objectMode: true
  });

  let currentStream = pipeline;
  
  // Chain transforms
  for (const transform of transforms) {
    currentStream = currentStream.pipe(transform);
    
    // Add error handling
    if (errorHandler) {
      transform.on('error', errorHandler);
    }
  }

  // Add timeout handling
  if (timeout) {
    const timeoutId = setTimeout(() => {
      pipeline.destroy(new Error('Streaming pipeline timeout'));
    }, timeout);

    pipeline.on('end', () => clearTimeout(timeoutId));
    pipeline.on('error', () => clearTimeout(timeoutId));
  }

  // Auto cleanup on completion
  if (autoCleanup) {
    pipeline.on('end', () => {
      transforms.forEach(transform => {
        if (transform.destroy && typeof transform.destroy === 'function') {
          transform.destroy();
        }
      });
    });
  }

  return pipeline;
}

export default {
  streamingMiddleware,
  JSONLTransform,
  NDJSONTransform,
  RateLimitTransform,
  ErrorHandlingTransform,
  CompressionTransform,
  createStreamingPipeline
};