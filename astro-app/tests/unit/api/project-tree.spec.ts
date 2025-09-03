import { test, expect } from '@playwright/test';
import { TestHelpers, TEST_PROJECT_STRUCTURES } from '../../fixtures/helpers.js';

test.describe('Project Tree API', () => {
  let testWorkspace: string;
  
  test.beforeEach(async () => {
    testWorkspace = await TestHelpers.createTempWorkspace('api-tests');
    
    // Create test projects
    await TestHelpers.createTestProject(testWorkspace, 'simple-project', TEST_PROJECT_STRUCTURES.simple);
    await TestHelpers.createTestProject(testWorkspace, 'complex-project', TEST_PROJECT_STRUCTURES.complex);
    await TestHelpers.createTestProject(testWorkspace, 'empty-project', TEST_PROJECT_STRUCTURES.empty);
  });

  test.afterEach(async () => {
    await TestHelpers.cleanupWorkspace(testWorkspace);
  });

  test('should return valid project tree for existing project', async ({ request }) => {
    const response = await request.get('/api/project-tree.json?project=simple-project');
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    await TestHelpers.validateProjectTreeResponse(data);
    
    expect(data.project).toBe('simple-project');
    expect(data.tree.name).toBe('simple-project');
    expect(data.tree.children.length).toBeGreaterThan(0);
  });

  test('should return 400 for missing project parameter', async ({ request }) => {
    const response = await request.get('/api/project-tree.json');
    expect(response.status()).toBe(400);
    
    const data = await response.json();
    expect(data.error).toBe('Project name is required');
  });

  test('should return 404 for non-existent project', async ({ request }) => {
    const response = await request.get('/api/project-tree.json?project=non-existent-project');
    expect(response.status()).toBe(404);
    
    const data = await response.json();
    expect(data.error).toBe('Project not found or not accessible');
  });

  test('should respect depth parameter', async ({ request }) => {
    const shallowResponse = await request.get('/api/project-tree.json?project=complex-project&depth=1');
    expect(shallowResponse.status()).toBe(200);
    
    const shallowData = await shallowResponse.json();
    expect(shallowData.metadata.maxDepth).toBe(1);
    
    const deepResponse = await request.get('/api/project-tree.json?project=complex-project&depth=3');
    const deepData = await deepResponse.json();
    expect(deepData.metadata.maxDepth).toBe(3);
  });

  test('should sort directories before files alphabetically', async ({ request }) => {
    const response = await request.get('/api/project-tree.json?project=complex-project');
    const data = await response.json();
    
    const children = data.tree.children;
    const directories = children.filter((child: any) => child.type === 'directory');
    const files = children.filter((child: any) => child.type === 'file');
    
    // Directories should come first
    const directoriesFirst = children.slice(0, directories.length);
    const filesAfter = children.slice(directories.length);
    
    expect(directoriesFirst.every((child: any) => child.type === 'directory')).toBe(true);
    expect(filesAfter.every((child: any) => child.type === 'file')).toBe(true);
    
    // Both should be sorted alphabetically
    const dirNames = directories.map((dir: any) => dir.name);
    const fileNames = files.map((file: any) => file.name);
    
    expect(dirNames).toEqual([...dirNames].sort());
    expect(fileNames).toEqual([...fileNames].sort());
  });

  test('should include file sizes', async ({ request }) => {
    const response = await request.get('/api/project-tree.json?project=simple-project');
    const data = await response.json();
    
    const files = data.tree.children.filter((child: any) => child.type === 'file');
    for (const file of files) {
      expect(file).toHaveProperty('size');
      expect(typeof file.size).toBe('number');
      expect(file.size).toBeGreaterThanOrEqual(0);
    }
  });

  test('should ignore common patterns', async ({ request }) => {
    // Create a project with files that should be ignored
    const ignoredStructure = {
      'README.md': '# Test project',
      'node_modules': {
        'some-package': {
          'index.js': 'module.exports = {};'
        }
      },
      '.git': {
        'HEAD': 'ref: refs/heads/main'
      },
      '.env': 'SECRET_KEY=test',
      'dist': {
        'bundle.js': 'console.log("bundled");'
      }
    };
    
    await TestHelpers.createTestProject(testWorkspace, 'ignored-files-project', ignoredStructure);
    
    const response = await request.get('/api/project-tree.json?project=ignored-files-project');
    const data = await response.json();
    
    const childNames = data.tree.children.map((child: any) => child.name);
    
    expect(childNames).not.toContain('node_modules');
    expect(childNames).not.toContain('.git');
    expect(childNames).not.toContain('.env');
    expect(childNames).not.toContain('dist');
    expect(childNames).toContain('README.md');
  });

  test('should handle empty project', async ({ request }) => {
    const response = await request.get('/api/project-tree.json?project=empty-project');
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    await TestHelpers.validateProjectTreeResponse(data);
    
    expect(data.tree.children).toEqual([]);
  });

  test('should include metadata with timestamp', async ({ request }) => {
    const beforeTime = new Date().toISOString();
    
    const response = await request.get('/api/project-tree.json?project=simple-project');
    const data = await response.json();
    
    const afterTime = new Date().toISOString();
    
    expect(data.metadata.generated).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    expect(data.metadata.generated).toBeGreaterThanOrEqual(beforeTime);
    expect(data.metadata.generated).toBeLessThanOrEqual(afterTime);
  });
});