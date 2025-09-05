# Claude API - Technical Context

## Technology Stack

### Runtime Environment
- **Node.js 18+**: ES modules, modern async/await patterns, built-in fetch
- **Platform**: Linux/macOS/Windows compatibility with path handling
- **Memory Model**: Event-driven, non-blocking I/O for streaming operations

### Core Dependencies

#### Web Framework
- **Express.js 4.18+**: Mature HTTP server with extensive middleware ecosystem
- **Middleware Stack**: 
  - `helmet` - Security headers and protection
  - `cors` - Cross-origin resource sharing configuration
  - `compression` - Response compression for improved performance
  - `express-rate-limit` - DoS protection and resource management

#### Data Processing
- **node-jq 6.0+**: Native jq bindings for JSONL query processing
  - Provides direct access to jq's powerful JSON transformation capabilities
  - Supports complex filtering, aggregation, and data manipulation
  - Compiled query caching for performance optimization

#### Streaming and I/O
- **ndjson 2.0+**: Newline-delimited JSON processing
- **stream-json 1.8+**: Memory-efficient JSON parsing for large files
- **Native Node Streams**: Transform streams for data pipeline processing

#### Validation and Security
- **Joi 17.12+**: Schema validation for request/response data
- **Winston 3.11+**: Structured logging with multiple transport options
- **UUID 9.0+**: Session identifier generation and validation

### Development Tools

#### Testing Framework
- **Jest 29.7+**: Unit and integration testing with coverage reporting
- **Supertest 6.3+**: HTTP assertion library for API endpoint testing
- **Test Environment**: Isolated test databases and temporary file systems

#### Code Quality
- **ESLint 8.56+**: JavaScript linting with modern ES standards
- **Prettier 3.1+**: Code formatting and consistency enforcement
- **JSDoc**: Comprehensive documentation for all public APIs

## Infrastructure Requirements

### File System Dependencies
- **Claude Projects Directory**: `~/.claude/projects/` with read/write access
- **Session Files**: JSONL format with UTF-8 encoding
- **Temporary Storage**: OS temp directory for processing intermediate results
- **Log Directory**: Configurable logging output location

### Process Management
- **Child Processes**: Claude CLI spawning with stdio piping
- **Process Limits**: Configurable concurrent process thresholds
- **Resource Monitoring**: Memory and CPU usage tracking
- **Graceful Shutdown**: SIGTERM/SIGINT handling for clean termination

### Network Configuration
- **Port Binding**: Configurable HTTP server port (default: 3000)
- **CORS Policy**: Cross-origin request handling for web applications
- **Rate Limiting**: Per-IP request throttling with sliding window
- **Keep-Alive**: HTTP connection persistence for streaming operations

## Data Format Specifications

### JSONL Structure
Claude Code sessions stored as newline-delimited JSON:
```javascript
{"type":"user","timestamp":"2025-01-15T10:00:00Z","message":{"role":"user","content":"Hello"}}
{"type":"assistant","timestamp":"2025-01-15T10:00:05Z","message":{"role":"assistant","content":"Hi there!"}}
{"type":"tool_use","timestamp":"2025-01-15T10:01:00Z","tool_use":{"id":"toolu_123","name":"Read","parameters":{}}}
{"type":"tool_use_result","timestamp":"2025-01-15T10:01:02Z","tool_use_result":{"tool_use_id":"toolu_123","output":"File contents"}}
```

### API Response Format
Standardized response structure across all endpoints:
```javascript
{
  "success": boolean,
  "data": object | array,
  "error": {
    "code": string,
    "message": string,
    "details": object
  },
  "meta": {
    "timestamp": string,
    "executionTimeMs": number,
    "requestId": string
  }
}
```

### Streaming Format (NDJSON)
Real-time chat responses delivered as newline-delimited JSON:
```javascript
{"type":"start","sessionId":"uuid","timestamp":"2025-01-15T10:00:00Z"}
{"type":"data","content":"Hello","timestamp":"2025-01-15T10:00:01Z"}  
{"type":"data","content":" world","timestamp":"2025-01-15T10:00:02Z"}
{"type":"end","usage":{"input_tokens":5,"output_tokens":2},"timestamp":"2025-01-15T10:00:03Z"}
```

## Performance Characteristics

### Throughput Specifications
- **Simple Queries**: < 100ms for basic session retrieval
- **Complex jq Operations**: < 2s for cross-session analysis  
- **Streaming Chat**: < 500ms initial response time
- **Concurrent Connections**: 50+ simultaneous users supported

### Resource Utilization
- **Base Memory**: < 512MB without active operations
- **Peak Memory**: Scales with concurrent query complexity
- **CPU Usage**: Primarily I/O bound with jq computational peaks
- **Disk I/O**: Optimized for sequential JSONL reading

### Scalability Patterns
- **Horizontal Scaling**: Stateless design enables load balancing
- **Caching Strategy**: Multi-level caching reduces file system load
- **Connection Pooling**: Efficient resource reuse for CLI operations
- **Backpressure Handling**: Stream throttling prevents memory exhaustion

## Security Architecture

### Input Validation
- **Schema Validation**: Joi schemas enforce data structure requirements
- **jq Query Sanitization**: Regex patterns prevent code injection
- **Path Traversal Protection**: Filesystem access restricted to allowed directories
- **Content-Type Validation**: Strict MIME type checking for uploads

### Process Isolation
- **CLI Sandboxing**: Child processes spawned with limited privileges
- **Resource Limits**: CPU time and memory constraints on operations
- **Timeout Enforcement**: Maximum execution time for all operations
- **Error Isolation**: Failures contained within request boundaries

### Network Security
- **HTTPS Support**: TLS termination at reverse proxy layer
- **Rate Limiting**: Configurable request throttling per client IP
- **CORS Policy**: Explicit origin allowlisting for browser security
- **Security Headers**: Helmet.js provides comprehensive header protection

## Development Environment

### Local Setup Requirements
- **Node.js**: Version 18.0.0 or higher with npm 9+
- **Claude CLI**: Installed and authenticated for chat functionality
- **File Permissions**: Read/write access to user's Claude projects directory
- **Port Availability**: Default port 3000 or configured alternative

### Environment Configuration
```bash
# Core Configuration
NODE_ENV=development|production|test
PORT=3000
LOG_LEVEL=debug|info|warn|error

# Claude Integration  
CLAUDE_PROJECTS_PATH=/path/to/.claude/projects
CLAUDE_CLI_TIMEOUT=30000

# Performance Tuning
RATE_LIMIT=1000
CACHE_TTL=300000
MAX_CONCURRENT_PROCESSES=10

# Security Settings
CORS_ORIGIN=*
ENABLE_HELMET=true
```

### Build and Deployment
- **Package Manager**: npm with package-lock.json for reproducible builds
- **Module Format**: ES6 modules with import/export syntax
- **Process Management**: PM2 or similar for production process monitoring  
- **Health Checks**: `/health` endpoint for load balancer integration

## External Dependencies

### Claude Code CLI
- **Installation**: Must be available in system PATH
- **Authentication**: User must have valid Claude subscription/token
- **Version Compatibility**: Tested with current stable Claude Code releases
- **Command Interface**: Standardized flags (`-p`, `-r`, `--output-format`)

### Operating System
- **File System**: POSIX-compatible path handling with cross-platform support
- **Process Management**: child_process module for CLI integration
- **Signal Handling**: SIGTERM/SIGINT for graceful shutdown
- **Temporary Storage**: OS-provided temp directory for intermediate files

### Network Dependencies
- **DNS Resolution**: Standard hostname resolution for external requests
- **TCP Networking**: HTTP server socket binding and management
- **Proxy Support**: Reverse proxy compatibility for production deployment
- **Load Balancing**: Session-agnostic design for horizontal scaling