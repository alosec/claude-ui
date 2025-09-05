import { describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import { writeFile, mkdir, rmdir, unlink } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { existsSync } from 'fs';

// Import the app
import app from '../../src/index.js';

describe('Claude API Integration Tests', () => {
  let testProjectsPath;
  let testProjectName;
  let testSessionId;
  let server;

  beforeAll(async () => {
    // Create temporary directory for test projects
    testProjectsPath = join(tmpdir(), `claude-api-test-${Date.now()}`);
    testProjectName = 'test-project';
    testSessionId = '550e8400-e29b-41d4-a716-446655440000';

    await mkdir(testProjectsPath, { recursive: true });
    await mkdir(join(testProjectsPath, testProjectName), { recursive: true });

    // Set environment variable for tests
    process.env.CLAUDE_PROJECTS_PATH = testProjectsPath;

    // Create test session file
    const sampleSessionData = [
      '{"type":"user","timestamp":"2025-01-15T10:00:00Z","message":{"role":"user","content":"Hello, test session!"}}',
      '{"type":"assistant","timestamp":"2025-01-15T10:00:05Z","message":{"role":"assistant","content":"Hello! This is a test response."}}',
      '{"type":"user","timestamp":"2025-01-15T10:00:30Z","message":{"role":"user","content":"Can you help with testing?"}}',
      '{"type":"assistant","timestamp":"2025-01-15T10:00:35Z","message":{"role":"assistant","content":"Of course! I can help you with testing."}}',
      '{"type":"tool_use","timestamp":"2025-01-15T10:01:00Z","tool_use":{"id":"toolu_test","name":"TestTool","parameters":{"action":"test"}}}',
      '{"type":"tool_use_result","timestamp":"2025-01-15T10:01:02Z","tool_use_result":{"tool_use_id":"toolu_test","output":"Test completed successfully"}}'
    ].join('\\n');

    await writeFile(
      join(testProjectsPath, testProjectName, `${testSessionId}.jsonl`),
      sampleSessionData
    );

    // Start server
    server = app.listen(0); // Use random port
  });

  afterAll(async () => {
    // Cleanup
    if (server) {
      server.close();
    }
    
    if (testProjectsPath && existsSync(testProjectsPath)) {
      try {
        await rmdir(testProjectsPath, { recursive: true });
      } catch (error) {
        console.warn('Failed to cleanup test directory:', error.message);
      }
    }
  });

  describe('Health Check', () => {
    test('GET /health should return status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          status: 'healthy',
          environment: 'test',
          claudeProjectsPath: testProjectsPath
        }
      });
    });
  });

  describe('Projects API', () => {
    test('GET /api/v1/projects should list projects', async () => {
      const response = await request(app)
        .get('/api/v1/projects')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.projects).toHaveLength(1);
      expect(response.body.data.projects[0].name).toBe(testProjectName);
      expect(response.body.data.projects[0].sessionCount).toBe(1);
    });

    test('GET /api/v1/projects/:name should return project details', async () => {
      const response = await request(app)
        .get(`/api/v1/projects/${testProjectName}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(testProjectName);
      expect(response.body.data.sessions).toHaveLength(1);
      expect(response.body.data.sessions[0].id).toBe(testSessionId);
    });

    test('GET /api/v1/projects/:name should return 404 for non-existent project', async () => {
      const response = await request(app)
        .get('/api/v1/projects/non-existent')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('PROJECT_NOT_FOUND');
    });

    test('POST /api/v1/projects should create new project', async () => {
      const newProjectName = 'new-test-project';
      
      const response = await request(app)
        .post('/api/v1/projects')
        .send({
          name: newProjectName,
          description: 'Test project description'
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(newProjectName);

      // Verify project was created
      expect(existsSync(join(testProjectsPath, newProjectName))).toBe(true);
    });

    test('POST /api/v1/projects should reject invalid project names', async () => {
      const response = await request(app)
        .post('/api/v1/projects')
        .send({
          name: 'invalid name with spaces and @symbols'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    test('GET /api/v1/projects/:name/stats should return project statistics', async () => {
      const response = await request(app)
        .get(`/api/v1/projects/${testProjectName}/stats`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.statistics.sessionCount).toBe(1);
      expect(response.body.data.statistics.totalSize).toBeGreaterThan(0);
    });
  });

  describe('Sessions API', () => {
    test('GET /api/v1/sessions should list sessions', async () => {
      const response = await request(app)
        .get('/api/v1/sessions')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.sessions).toHaveLength(1);
      expect(response.body.data.sessions[0].id).toBe(testSessionId);
    });

    test('GET /api/v1/sessions/:id should return session details', async () => {
      const response = await request(app)
        .get(`/api/v1/sessions/${testSessionId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(testSessionId);
      expect(response.body.data.messageCount).toBe(6);
      expect(response.body.data.messages).toHaveLength(6);
    });

    test('GET /api/v1/sessions/:id should return 404 for non-existent session', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app)
        .get(`/api/v1/sessions/${nonExistentId}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('SESSION_NOT_FOUND');
    });

    test('GET /api/v1/sessions/:id/messages should return session messages', async () => {
      const response = await request(app)
        .get(`/api/v1/sessions/${testSessionId}/messages`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.messages).toHaveLength(6);
      expect(response.body.data.messages[0].type).toBe('user');
      expect(response.body.data.messages[1].type).toBe('assistant');
    });

    test('GET /api/v1/sessions/:id/messages should filter by type', async () => {
      const response = await request(app)
        .get(`/api/v1/sessions/${testSessionId}/messages?type=user`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.messages).toHaveLength(2);
      expect(response.body.data.messages.every(msg => msg.type === 'user')).toBe(true);
    });

    test('GET /api/v1/sessions/:id/messages should support jq queries', async () => {
      const response = await request(app)
        .get(`/api/v1/sessions/${testSessionId}/messages?q=.[] | select(.type=="tool_use")`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.messages).toHaveLength(1);
      expect(response.body.data.messages[0].type).toBe('tool_use');
      expect(response.body.meta.jqQuery).toBe('.[] | select(.type=="tool_use")');
    });

    test('POST /api/v1/sessions should create new session', async () => {
      const newSessionData = {
        project: testProjectName,
        initialMessages: [
          { type: 'user', message: { role: 'user', content: 'New session test' } }
        ]
      };

      const response = await request(app)
        .post('/api/v1/sessions')
        .send(newSessionData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toMatch(/^[a-f0-9-]{36}$/);
      expect(response.body.data.messageCount).toBe(1);
    });
  });

  describe('Query API', () => {
    test('POST /api/v1/query should execute jq queries', async () => {
      const queryData = {
        filter: '.[] | select(.type == "user")',
        projects: [testProjectName]
      };

      const response = await request(app)
        .post('/api/v1/query')
        .send(queryData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.results).toHaveLength(2);
      expect(response.body.data.results.every(result => result.type === 'user')).toBe(true);
      expect(response.body.data.filesProcessed).toBe(1);
    });

    test('POST /api/v1/query should handle complex aggregation queries', async () => {
      const queryData = {
        filter: 'group_by(.type) | map({type: .[0].type, count: length})',
        projects: [testProjectName]
      };

      const response = await request(app)
        .post('/api/v1/query')
        .send(queryData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data.results)).toBe(true);
      expect(response.body.data.results.length).toBeGreaterThan(0);
      
      // Should have counts for different message types
      const userCount = response.body.data.results.find(r => r.type === 'user');
      const assistantCount = response.body.data.results.find(r => r.type === 'assistant');
      
      expect(userCount).toBeDefined();
      expect(assistantCount).toBeDefined();
      expect(userCount.count).toBe(2);
      expect(assistantCount.count).toBe(2);
    });

    test('POST /api/v1/query should reject invalid jq queries', async () => {
      const queryData = {
        filter: '.invalid[syntax',
        projects: [testProjectName]
      };

      const response = await request(app)
        .post('/api/v1/query')
        .send(queryData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_JQ_QUERY');
    });

    test('GET /api/v1/query/patterns should return query patterns', async () => {
      const response = await request(app)
        .get('/api/v1/query/patterns')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.patterns).toHaveProperty('userMessages');
      expect(response.body.data.patterns).toHaveProperty('assistantMessages');
      expect(response.body.data.patterns).toHaveProperty('messageCount');
    });

    test('GET /api/v1/query/patterns should filter by category', async () => {
      const response = await request(app)
        .get('/api/v1/query/patterns?category=messages')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.patterns).toHaveProperty('userMessages');
      expect(response.body.data.patterns).toHaveProperty('assistantMessages');
      expect(response.body.data.patterns).not.toHaveProperty('sessionSummary');
      expect(response.body.data.category).toBe('messages');
    });

    test('POST /api/v1/query/validate should validate queries', async () => {
      const validQuery = { filter: '.[] | select(.type == "user")' };
      const response = await request(app)
        .post('/api/v1/query/validate')
        .send(validQuery)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.valid).toBe(true);
    });

    test('POST /api/v1/query/validate should reject invalid queries', async () => {
      const invalidQuery = { filter: '.invalid[syntax' };
      const response = await request(app)
        .post('/api/v1/query/validate')
        .send(invalidQuery)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_JQ_QUERY');
    });
  });

  describe('Error Handling', () => {
    test('should return 404 for unknown routes', async () => {
      const response = await request(app)
        .get('/api/v1/unknown-endpoint')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });

    test('should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/api/v1/sessions')
        .set('Content-Type', 'application/json')
        .send('{"invalid": json}')
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    test('should validate request parameters', async () => {
      const response = await request(app)
        .get('/api/v1/sessions?limit=invalid')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('Performance and Limits', () => {
    test('should handle pagination correctly', async () => {
      // Test with limit
      const response = await request(app)
        .get('/api/v1/sessions?limit=1')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.sessions).toHaveLength(1);
      expect(response.body.data.pagination.limit).toBe(1);
      expect(response.body.data.pagination.total).toBeGreaterThanOrEqual(1);
    });

    test('should enforce reasonable query limits', async () => {
      const queryData = {
        filter: '.',
        limit: 50000  // Excessive limit
      };

      const response = await request(app)
        .post('/api/v1/query')
        .send(queryData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });
});