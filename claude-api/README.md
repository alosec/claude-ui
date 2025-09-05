# Claude API

REST API for CRUD operations on Claude Code session data with advanced jq querying and streaming chat functionality.

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm test
```

## API Endpoints

### Sessions
- `GET /api/v1/sessions` - List all sessions
- `GET /api/v1/sessions/:id` - Get session details
- `POST /api/v1/sessions` - Create new session
- `DELETE /api/v1/sessions/:id` - Delete session

### Chat
- `POST /api/v1/sessions/:id/chat` - Send message to session
- `POST /api/v1/chat` - Start new conversation

### Query
- `POST /api/v1/query` - Execute jq queries across data

## Examples

### Basic Session Query
```bash
curl http://localhost:3000/api/v1/sessions
```

### jq Query
```bash
curl -X POST http://localhost:3000/api/v1/query \
  -H "Content-Type: application/json" \
  -d '{"filter": ".[] | select(.type==\"user\")"}'
```

### Streaming Chat
```bash
curl -X POST http://localhost:3000/api/v1/sessions/123/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello", "stream": true}' \
  --no-buffer
```

## Configuration

Environment variables:
- `PORT` - Server port (default: 3000)
- `CLAUDE_PROJECTS_PATH` - Path to Claude projects directory
- `LOG_LEVEL` - Logging level (debug, info, warn, error)
- `NODE_ENV` - Environment (development, production, test)

See [API specification](../issues/01-claude-api.md) for complete documentation.