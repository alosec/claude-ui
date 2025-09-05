# Claude API - Project Brief

## Overview
Claude API provides comprehensive CRUD operations on Claude Code session data with advanced jq querying capabilities and real-time streaming chat functionality. This system enables programmatic access to Claude Code conversations, data analysis, and API-compatible chat interactions.

## Core Requirements

### Primary Objectives
1. **Session Data Access**: Full CRUD operations on Claude Code JSONL session files stored in `~/.claude/projects/`
2. **Advanced Querying**: Native jq integration for complex data filtering and analysis across sessions
3. **Real-time Chat**: Streaming chat interface via Claude CLI integration with `-p` and `-r` flags
4. **API Compatibility**: Anthropic API-compatible format support for seamless integration

### Technical Specifications
- **Runtime**: Node.js 18+ with ES modules
- **Framework**: Express.js with comprehensive middleware stack
- **Data Processing**: Native jq via `node-jq` package for JSONL querying
- **Streaming**: NDJSON format with proper backpressure handling
- **CLI Integration**: Child process management for Claude CLI operations
- **Security**: Input validation, rate limiting, path traversal protection

## Architecture Components

### Service Layer
- **jq-processor.js**: Query validation, execution, and caching
- **claude-cli.js**: Process spawning and CLI flag management
- **session-store.js**: File system operations and data access
- **file-helpers.js**: Utility functions for safe file operations

### API Endpoints
- **Sessions API**: `/api/v1/sessions` - CRUD operations on individual sessions
- **Projects API**: `/api/v1/projects` - Project management and organization
- **Chat API**: `/api/v1/chat` - Real-time conversation interface
- **Query API**: `/api/v1/query` - jq query execution across data sets

### Streaming Infrastructure
- **NDJSON Support**: Line-by-line JSON streaming
- **Transform Streams**: Data processing pipelines with error handling
- **Rate Limiting**: Configurable throughput controls
- **Connection Management**: Proper cleanup and timeout handling

## Key Features Delivered

### Data Access
- Session enumeration with filtering and pagination
- Project-based organization and statistics
- Message-level querying with type filtering
- Cross-session data aggregation

### Query Capabilities  
- Pre-built query patterns for common operations
- Custom jq expression support with security validation
- Multi-file query execution with error handling
- Query result caching and performance optimization

### Chat Interface
- New conversation creation with configurable parameters
- Session resumption via UUID-based identification
- Streaming response delivery with real-time updates
- Process management for concurrent chat operations

### Production Readiness
- Comprehensive error handling and logging
- Security middleware (Helmet, CORS, rate limiting)
- Input validation with Joi schemas
- Health checks and monitoring endpoints

## Development Standards

### Code Quality
- ES6+ modules with strict type checking
- Comprehensive JSDoc documentation
- Error handling with structured logging
- Performance monitoring and metrics

### Testing Strategy
- Unit tests for all service components
- Integration tests for full API workflows
- Mock implementations for external dependencies
- Performance benchmarking for large data sets

### Security Measures
- jq query sanitization to prevent code injection
- File path validation against traversal attacks  
- Rate limiting to prevent resource exhaustion
- Input validation for all API parameters

## Deployment Configuration

### Environment Variables
- `CLAUDE_PROJECTS_PATH`: Location of Claude Code session data
- `PORT`: Server listening port (default: 3000)
- `LOG_LEVEL`: Logging verbosity control
- `RATE_LIMIT`: Requests per window configuration

### Dependencies
- **Core**: express, node-jq, winston, joi
- **Streaming**: ndjson, stream-json
- **Security**: helmet, cors, express-rate-limit
- **Development**: jest, supertest, eslint

## Success Metrics

### Performance Targets
- Simple queries: < 100ms response time
- Complex jq queries: < 2s execution time
- Streaming chat: < 500ms initial response
- Concurrent connections: 50+ simultaneous users

### Data Handling
- Large sessions: 10k+ messages per session
- Memory efficiency: < 512MB base footprint
- File operations: Proper cleanup and error recovery
- Query complexity: Timeout and resource limits

## Next Steps
Our immediate next step is to run comprehensive tests and evaluation:
1. Execute unit test suite to validate service layer functionality
2. Run integration tests to verify full API workflows
3. Performance testing with realistic data loads
4. Security validation of jq query processing
5. End-to-end testing of streaming chat functionality