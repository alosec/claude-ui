# Claude API - System Patterns and Architecture

## Architectural Patterns

### Service-Oriented Architecture
The Claude API follows a clean service-oriented pattern with clear separation of concerns:

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   API Routes    │────│   Services      │────│   Data Layer    │
│                 │    │                 │    │                 │
│ - sessions.js   │    │ - claude-cli.js │    │ - File System   │
│ - projects.js   │    │ - jq-processor  │    │ - JSONL Files   │
│ - chat.js       │    │ - session-store │    │ - Cache Layer   │
│ - query.js      │    │ - file-helpers  │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Data Flow Patterns

#### Query Processing Pipeline
1. **Request Validation**: Joi schema validation on all inputs
2. **Security Check**: jq query sanitization and path validation  
3. **Data Access**: File system operations with error handling
4. **Processing**: jq execution with timeout and resource limits
5. **Response Formatting**: Consistent JSON response structure

#### Streaming Chat Pipeline
1. **Session Resolution**: UUID-based session lookup across projects
2. **CLI Invocation**: Process spawning with proper flag configuration
3. **Stream Management**: NDJSON transform with backpressure handling
4. **Error Recovery**: Graceful handling of CLI failures and timeouts
5. **Cleanup**: Automatic process termination and resource cleanup

## Key Design Patterns

### Factory Pattern - Service Initialization
Services are instantiated as singletons with factory-like initialization:

```javascript
// Each service exports a configured instance
export default new JQProcessor();
export default new ClaudeCLI();
export default new SessionStore();
```

### Observer Pattern - Stream Processing
Streaming operations use event-driven patterns for data flow:

```javascript
result.stream.on('data', (chunk) => {
  res.write(JSON.stringify({ type: 'data', content: chunk }));
});
```

### Command Pattern - CLI Operations  
Claude CLI operations encapsulated as command objects with execution context:

```javascript
const claudeOptions = {
  message, sessionId, projectPath, flags,
  stream, outputFormat, inputFormat
};
```

### Strategy Pattern - Query Patterns
Pre-built jq patterns implemented as strategy objects:

```javascript
getQueryPatterns() {
  return {
    userMessages: '.[] | select(.type == "user")',
    contentSearch: (term) => `.[] | select(.message.content | contains("${term}"))`
  };
}
```

## Error Handling Patterns

### Hierarchical Error Handling
1. **Service Level**: Catch and transform domain-specific errors
2. **Route Level**: HTTP status code mapping and response formatting
3. **Application Level**: Global error handler with logging and cleanup
4. **Client Level**: Structured error responses with actionable messages

### Circuit Breaker Pattern
Resource-intensive operations (jq queries, CLI processes) implement timeout and failure thresholds:

```javascript
const timeoutPromise = new Promise((_, reject) => {
  setTimeout(() => reject(new Error('Query timeout')), this.queryTimeoutMs);
});
```

## Data Access Patterns

### Repository Pattern
Session data access abstracted through SessionStore with consistent interface:

```javascript
// Unified interface for different data operations
await sessionStore.getProjects(projectsPath);
await sessionStore.getSessionDetails(sessionFilePath);
await sessionStore.findSessions(projectsPath, criteria);
```

### Caching Strategy
Multi-level caching with TTL and invalidation:
- **Memory Cache**: Frequent session queries (5-minute TTL)
- **Query Cache**: Compiled jq patterns (persistent)
- **File Stats Cache**: Directory listings and metadata

### Streaming Data Access
Large dataset processing using Node.js streams:

```javascript
const transformStream = new Transform({
  objectMode: true,
  transform(chunk, encoding, callback) {
    // Process JSONL line-by-line without loading entire file
  }
});
```

## Security Patterns

### Input Sanitization
Multi-layer validation approach:
1. **Schema Validation**: Joi schemas for request structure
2. **Content Validation**: jq query syntax and security checks  
3. **Path Validation**: Filesystem traversal prevention
4. **Rate Limiting**: Request frequency and resource usage controls

### Principle of Least Privilege
- File system access restricted to Claude projects directory
- jq execution sandboxed with resource limits
- CLI processes spawned with minimal permissions
- Error messages sanitized to prevent information leakage

## Performance Patterns

### Lazy Loading
Data loaded on-demand to minimize memory usage:
- Session messages loaded only when requested
- Project statistics calculated when accessed
- Directory scanning cached but refreshed on demand

### Connection Pooling
Efficient resource management:
- CLI process reuse where possible
- Stream connection lifecycle management
- File handle cleanup and resource monitoring

### Pagination and Limiting
Large dataset handling:
- Cursor-based pagination for session lists
- Configurable limits on query results
- Streaming responses for real-time data delivery

## Integration Patterns

### Adapter Pattern - CLI Integration
Claude CLI wrapped with standardized interface:

```javascript
// Unified method signatures regardless of CLI flags
async executeCommand(options) {
  const args = this.buildClaudeArgs(options);
  return this.spawnProcess('claude', args, options);
}
```

### Facade Pattern - Complex Operations
High-level operations hide complexity of underlying services:

```javascript
// Single method encapsulates multi-step process
async findSessionsWithQuery(criteria, jqFilter) {
  const sessions = await this.findSessions(criteria);
  const filtered = await this.applyJQFilter(sessions, jqFilter);
  return this.formatResults(filtered);
}
```

## Monitoring and Observability

### Structured Logging
Winston-based logging with contextual information:
- Request correlation IDs
- Execution timing metrics
- Error classification and severity
- Performance bottleneck identification

### Health Check Patterns
Multi-dimensional health monitoring:
- System resource availability
- External dependency status (Claude CLI)
- Data integrity validation
- Performance threshold monitoring

## Extension Points

### Plugin Architecture
Service registration for extensibility:
- Custom query processors
- Additional data format support  
- External authentication providers
- Monitoring and metrics integrations

### Configuration Management
Environment-based configuration with validation:
- Development/staging/production profiles
- Feature flag support for gradual rollouts
- Resource limit adjustments
- Security policy customization