# Claude API - CRUD Operations on Claude Code Data

## Overview

Create a comprehensive API server for CRUD operations on Claude Code session data stored in `~/.claude/projects/`, with advanced jq querying capabilities and streaming chat functionality.

## Requirements

### Core Features
- **Session Management**: Full CRUD operations on Claude Code sessions
- **Project Management**: Organize and query projects containing multiple sessions  
- **jq Integration**: Native jq query processing for complex data filtering
- **Streaming Chat**: Real-time conversation via Claude CLI integration
- **API Compatibility**: Anthropic API-compatible format support

### API Endpoints

#### Sessions API
```
GET    /api/v1/sessions              # List all sessions with pagination
GET    /api/v1/sessions/:id          # Get specific session details
POST   /api/v1/sessions              # Create new session
PUT    /api/v1/sessions/:id          # Update session metadata
DELETE /api/v1/sessions/:id          # Delete session

GET    /api/v1/sessions/:id/messages # Get session messages with jq filtering
POST   /api/v1/sessions/:id/chat     # Send message and get response
```

#### Projects API
```
GET    /api/v1/projects              # List all projects
GET    /api/v1/projects/:name        # Get project details and sessions
POST   /api/v1/projects              # Create new project
DELETE /api/v1/projects/:name        # Delete project
```

#### Query API
```
POST   /api/v1/query                 # Execute jq queries across sessions/projects
```

### jq Query Examples

```bash
# Get all user messages from a session
curl "localhost:3000/api/v1/sessions/123/messages?q='.[] | select(.type==\"user\")"

# Find sessions with specific keywords
curl -X POST localhost:3000/api/v1/query \
  -d '{"filter": ".[] | select(.message.content | test(\"kubernetes\"))", "projects": ["myproject"]}'

# Get conversation statistics
curl -X POST localhost:3000/api/v1/query \
  -d '{"filter": "group_by(.type) | map({type: .[0].type, count: length})"}'
```

### Streaming Chat Interface

#### Standard Chat
```bash
curl -X POST localhost:3000/api/v1/sessions/123/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "What is 2+2?", "stream": false}'
```

#### Streaming Chat (NDJSON)
```bash
curl -X POST localhost:3000/api/v1/sessions/123/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Explain async/await", "stream": true}' \
  --no-buffer
```

#### Claude CLI Integration
```bash
# Resume specific session via API
curl -X POST localhost:3000/api/v1/chat \
  -d '{"session_id": "123", "message": "Continue our discussion", "resume": true}'

# Start new session with project context  
curl -X POST localhost:3000/api/v1/chat \
  -d '{"project": "myproject", "message": "Help me debug", "claude_flags": ["-p"]}'
```

## Implementation Architecture

### Technology Stack
- **Runtime**: Node.js 18+
- **Framework**: Express.js with middleware
- **jq Processing**: `node-jq` package for native jq integration
- **Streaming**: NDJSON with proper backpressure handling
- **CLI Integration**: `child_process` with stdio streaming
- **Testing**: Jest with supertest for API testing

### Service Layer Architecture
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   API Routes    │────│   Services      │────│   Data Layer    │
│                 │    │                 │    │                 │
│ - sessions.js   │    │ - claude-cli.js │    │ - session-      │
│ - projects.js   │    │ - jq-processor  │    │   store.js      │
│ - chat.js       │    │ - streaming.js  │    │ - file-helpers  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Data Access Patterns
- **Session Store**: Direct JSONL file parsing with streaming readers
- **Project Discovery**: Filesystem scanning with caching
- **jq Processing**: Compiled query caching with memory limits
- **Streaming**: Transform streams with error handling and cleanup

## Testing Strategy

### Unit Tests
- **jq Processor**: Query compilation, execution, error handling
- **Claude CLI Wrapper**: Process spawning, flag handling, I/O streaming
- **Session Store**: File reading, parsing, data extraction
- **Utilities**: Path handling, validation, error formatting

### Integration Tests
- **Full API Workflow**: Create session → Send messages → Query data → Delete
- **Streaming Chat**: Real-time message exchange with proper cleanup
- **Error Scenarios**: Invalid sessions, malformed jq queries, CLI failures
- **Performance**: Large session handling, concurrent request handling

### Test Data
- **Sample Sessions**: Various conversation types and lengths
- **Edge Cases**: Empty sessions, corrupted JSONL, missing files
- **Performance Data**: Large sessions for load testing

## Security Considerations

### Input Validation
- **jq Query Sanitization**: Prevent code injection and resource exhaustion
- **File Path Validation**: Restrict access to Claude projects directory only
- **Rate Limiting**: Prevent API abuse and resource exhaustion

### Process Isolation
- **CLI Process Limits**: Timeout and memory constraints for spawned processes
- **Streaming Cleanup**: Proper resource cleanup on connection termination
- **Error Boundaries**: Isolate failures to prevent server crashes

## Performance Requirements

### Response Times
- **Simple Queries**: < 100ms for basic session retrieval
- **Complex jq Queries**: < 2s for cross-session analysis
- **Streaming Chat**: < 500ms initial response time

### Throughput
- **Concurrent Requests**: Support 50+ simultaneous connections
- **Large Sessions**: Handle sessions with 10k+ messages
- **Memory Usage**: < 512MB base memory footprint

## Installation and Usage

### Development Setup
```bash
cd claude-api
npm install
npm run dev    # Start development server on port 3000
npm test       # Run full test suite
npm run test:integration  # Integration tests only
```

### Production Deployment
```bash
npm run build
npm start      # Production server with PM2 process management
```

### Configuration
- **Environment Variables**: PORT, CLAUDE_PROJECTS_PATH, LOG_LEVEL
- **Rate Limiting**: Configurable per-IP and global limits
- **jq Security**: Query complexity limits and timeout controls

## API Response Formats

### Standard Response
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "timestamp": "2025-01-15T10:30:00Z",
    "request_id": "req_123",
    "execution_time_ms": 45
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "INVALID_JQ_QUERY", 
    "message": "jq query syntax error at line 1",
    "details": { ... }
  },
  "meta": {
    "timestamp": "2025-01-15T10:30:00Z",
    "request_id": "req_124"
  }
}
```

### Streaming Response (NDJSON)
```
{"type": "start", "session_id": "123"}
{"type": "data", "content": "The answer is"}
{"type": "data", "content": " 4"}
{"type": "end", "usage": {"input_tokens": 5, "output_tokens": 3}}
```

## Future Enhancements

- **WebSocket Support**: Real-time bidirectional communication
- **Authentication**: API key management and user sessions
- **Caching Layer**: Redis caching for frequent queries
- **Monitoring**: Metrics dashboard and performance monitoring
- **CLI Tool**: Companion CLI for API interaction