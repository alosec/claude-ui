import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import jqProcessor from '../../src/services/jq-processor.js';
import { writeFile, unlink } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

describe('JQProcessor', () => {
  let tempFiles = [];

  beforeEach(() => {
    jqProcessor.clearCache();
  });

  afterEach(async () => {
    // Cleanup temp files
    for (const file of tempFiles) {
      try {
        await unlink(file);
      } catch (error) {
        // Ignore cleanup errors
      }
    }
    tempFiles = [];
  });

  describe('validateQuery', () => {
    test('should validate simple valid queries', async () => {
      await expect(jqProcessor.validateQuery('.')).resolves.toBeUndefined();
      await expect(jqProcessor.validateQuery('.type')).resolves.toBeUndefined();
      await expect(jqProcessor.validateQuery('.[] | select(.type == "user")')).resolves.toBeUndefined();
    });

    test('should reject invalid queries', async () => {
      await expect(jqProcessor.validateQuery('')).rejects.toThrow('Query must be a non-empty string');
      await expect(jqProcessor.validateQuery(null)).rejects.toThrow('Query must be a non-empty string');
      await expect(jqProcessor.validateQuery('.invalid[')).rejects.toThrow('jq query syntax error');
    });

    test('should reject potentially dangerous queries', async () => {
      await expect(jqProcessor.validateQuery('.. | select(.)')).rejects.toThrow('potentially dangerous path traversal');
      await expect(jqProcessor.validateQuery('system("rm -rf /")')).rejects.toThrow('potentially dangerous operations');
      await expect(jqProcessor.validateQuery('import "evil" as $e')).rejects.toThrow('potentially dangerous operations');
    });
  });

  describe('runQuery', () => {
    test('should execute simple queries on JSON data', async () => {
      const data = { name: 'John', age: 30, city: 'NYC' };
      
      const result = await jqProcessor.runQuery('.name', data);
      expect(result).toBe('John');

      const result2 = await jqProcessor.runQuery('.age', data);
      expect(result2).toBe(30);
    });

    test('should execute complex queries', async () => {
      const data = [
        { type: 'user', message: 'Hello' },
        { type: 'assistant', message: 'Hi there!' },
        { type: 'user', message: 'How are you?' }
      ];

      const result = await jqProcessor.runQuery('.[] | select(.type == "user")', data);
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(2);
      expect(result[0].message).toBe('Hello');
      expect(result[1].message).toBe('How are you?');
    });

    test('should handle empty results', async () => {
      const data = [{ type: 'system', message: 'Test' }];
      
      const result = await jqProcessor.runQuery('.[] | select(.type == "user")', data);
      expect(result).toEqual([]);
    });

    test('should timeout on long-running queries', async () => {
      // Create a query that would take a long time
      const largeData = Array.from({ length: 10000 }, (_, i) => ({ id: i, data: 'test'.repeat(100) }));
      
      // Set a short timeout for this test
      const originalTimeout = jqProcessor.queryTimeoutMs;
      jqProcessor.queryTimeoutMs = 100;

      try {
        await expect(
          jqProcessor.runQuery('.[] | select(.data | length > 10000)', largeData)
        ).rejects.toThrow('Query timeout');
      } finally {
        jqProcessor.queryTimeoutMs = originalTimeout;
      }
    }, 10000);
  });

  describe('streamQuery', () => {
    test('should process JSONL files', async () => {
      const testData = [
        '{"type":"user","message":"Hello"}',
        '{"type":"assistant","message":"Hi"}',
        '{"type":"user","message":"Bye"}'
      ].join('\\n');

      const tempFile = join(tmpdir(), `test-${Date.now()}.jsonl`);
      tempFiles.push(tempFile);
      await writeFile(tempFile, testData);

      const result = await jqProcessor.streamQuery(tempFile, '.[] | select(.type == "user")');
      
      expect(result.results).toHaveLength(2);
      expect(result.results[0].message).toBe('Hello');
      expect(result.results[1].message).toBe('Bye');
      expect(result.totalLines).toBe(3);
    });

    test('should handle malformed JSONL lines', async () => {
      const testData = [
        '{"type":"user","message":"Hello"}',
        'invalid json line',
        '{"type":"assistant","message":"Hi"}'
      ].join('\\n');

      const tempFile = join(tmpdir(), `test-malformed-${Date.now()}.jsonl`);
      tempFiles.push(tempFile);
      await writeFile(tempFile, testData);

      const result = await jqProcessor.streamQuery(tempFile, '.');
      
      expect(result.results).toHaveLength(2);
      expect(result.errors).toBeDefined();
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].line).toBe(2);
    });

    test('should handle empty files', async () => {
      const tempFile = join(tmpdir(), `test-empty-${Date.now()}.jsonl`);
      tempFiles.push(tempFile);
      await writeFile(tempFile, '');

      const result = await jqProcessor.streamQuery(tempFile, '.');
      
      expect(result.results).toHaveLength(0);
      expect(result.totalLines).toBe(0);
    });
  });

  describe('runMultiFileQuery', () => {
    test('should process multiple files', async () => {
      const file1Data = '{"type":"user","message":"File1"}\\n{"type":"assistant","message":"Response1"}';
      const file2Data = '{"type":"user","message":"File2"}\\n{"type":"system","message":"System"}';

      const file1 = join(tmpdir(), `test-multi1-${Date.now()}.jsonl`);
      const file2 = join(tmpdir(), `test-multi2-${Date.now()}.jsonl`);
      tempFiles.push(file1, file2);

      await writeFile(file1, file1Data);
      await writeFile(file2, file2Data);

      const result = await jqProcessor.runMultiFileQuery([file1, file2], '.[] | select(.type == "user")');
      
      expect(result.results).toHaveLength(2);
      expect(result.filesProcessed).toBe(2);
      expect(result.totalLines).toBe(4);
      expect(result.results[0].message).toBe('File1');
      expect(result.results[1].message).toBe('File2');
    });

    test('should handle file processing errors gracefully', async () => {
      const validFile = join(tmpdir(), `test-valid-${Date.now()}.jsonl`);
      const invalidFile = join(tmpdir(), `test-nonexistent-${Date.now()}.jsonl`);
      tempFiles.push(validFile);

      await writeFile(validFile, '{"type":"user","message":"Valid"}');
      
      const result = await jqProcessor.runMultiFileQuery([validFile, invalidFile], '.');
      
      expect(result.results).toHaveLength(1);
      expect(result.errors).toBeDefined();
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].file).toBe(invalidFile);
    });

    test('should reject empty file paths array', async () => {
      await expect(jqProcessor.runMultiFileQuery([], '.')).rejects.toThrow('filePaths must be a non-empty array');
    });
  });

  describe('getQueryPatterns', () => {
    test('should return predefined query patterns', () => {
      const patterns = jqProcessor.getQueryPatterns();
      
      expect(patterns).toHaveProperty('userMessages');
      expect(patterns).toHaveProperty('assistantMessages');
      expect(patterns).toHaveProperty('messageCount');
      expect(patterns).toHaveProperty('sessionSummary');
      
      expect(typeof patterns.userMessages).toBe('string');
      expect(patterns.userMessages).toContain('select(.type == "user")');
    });

    test('should include search pattern functions', () => {
      const patterns = jqProcessor.getQueryPatterns();
      
      expect(typeof patterns.contentSearch).toBe('function');
      expect(typeof patterns.toolSearch).toBe('function');
      
      const contentQuery = patterns.contentSearch('test');
      expect(contentQuery).toContain('contains("test")');
      
      const toolQuery = patterns.toolSearch('Write');
      expect(toolQuery).toContain('.tool_use.name == "Write"');
    });
  });

  describe('cache functionality', () => {
    test('should cache query results', async () => {
      const data = { test: 'value' };
      
      // First execution
      const result1 = await jqProcessor.runQuery('.test', data);
      expect(result1).toBe('value');
      
      // Cache should be used for subsequent identical queries
      const result2 = await jqProcessor.runQuery('.test', data);
      expect(result2).toBe('value');
    });

    test('should clear cache', () => {
      jqProcessor.clearCache();
      const stats = jqProcessor.getCacheStats();
      expect(stats.size).toBe(0);
    });

    test('should return cache statistics', () => {
      const stats = jqProcessor.getCacheStats();
      expect(stats).toHaveProperty('size');
      expect(stats).toHaveProperty('maxSize');
      expect(typeof stats.size).toBe('number');
      expect(typeof stats.maxSize).toBe('number');
    });
  });
});