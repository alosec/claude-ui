import { Page, expect } from '@playwright/test';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export class TestHelpers {
  static async createTempWorkspace(name: string): Promise<string> {
    const tempDir = path.join(__dirname, 'test-workspace', name);
    await fs.mkdir(tempDir, { recursive: true });
    return tempDir;
  }

  static async createTestProject(workspaceDir: string, projectName: string, structure: any): Promise<void> {
    const projectDir = path.join(workspaceDir, projectName);
    await fs.mkdir(projectDir, { recursive: true });
    await this.createStructure(projectDir, structure);
  }

  private static async createStructure(baseDir: string, structure: any): Promise<void> {
    for (const [name, content] of Object.entries(structure)) {
      const fullPath = path.join(baseDir, name);
      
      if (typeof content === 'string') {
        // File
        await fs.writeFile(fullPath, content);
      } else if (typeof content === 'object' && content !== null) {
        // Directory
        await fs.mkdir(fullPath, { recursive: true });
        await this.createStructure(fullPath, content);
      }
    }
  }

  static async cleanupWorkspace(workspaceDir: string): Promise<void> {
    try {
      await fs.rm(workspaceDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  }

  static async waitForApiResponse(page: Page, url: string, timeout: number = 5000): Promise<any> {
    const response = await page.waitForResponse(
      response => response.url().includes(url) && response.status() === 200,
      { timeout }
    );
    return await response.json();
  }

  static async validateProjectTreeResponse(data: any): Promise<void> {
    expect(data).toHaveProperty('project');
    expect(data).toHaveProperty('tree');
    expect(data).toHaveProperty('metadata');
    expect(data.metadata).toHaveProperty('workspace');
    expect(data.metadata).toHaveProperty('maxDepth');
    expect(data.metadata).toHaveProperty('generated');
    expect(data.tree).toHaveProperty('name');
    expect(data.tree).toHaveProperty('type', 'directory');
    expect(data.tree).toHaveProperty('children');
    expect(Array.isArray(data.tree.children)).toBe(true);
  }

  static async navigateAndWaitForLoad(page: Page, url: string): Promise<void> {
    await page.goto(url);
    await page.waitForLoadState('networkidle');
  }

  static getTestWorkspacePath(): string {
    return path.join(__dirname, 'test-workspace');
  }
}

export const TEST_PROJECT_STRUCTURES = {
  simple: {
    'README.md': '# Simple Project\nA basic test project.',
    'package.json': JSON.stringify({ name: 'simple-project', version: '1.0.0' }),
    src: {
      'index.js': 'console.log("Hello World");',
      'utils.js': 'export const helper = () => {};'
    }
  },
  complex: {
    'README.md': '# Complex Project\nA more complex test project.',
    'package.json': JSON.stringify({ name: 'complex-project', version: '2.0.0' }),
    src: {
      components: {
        'Button.jsx': 'export default function Button() { return <button />; }',
        'Header.jsx': 'export default function Header() { return <header />; }'
      },
      utils: {
        'helpers.js': 'export const helper = () => {};',
        'constants.js': 'export const API_URL = "https://api.example.com";'
      },
      'index.js': 'import Button from "./components/Button.jsx";'
    },
    tests: {
      'Button.test.js': 'test("Button renders", () => {});'
    },
    '.gitignore': 'node_modules/\n.env'
  },
  empty: {},
  large: Object.fromEntries(
    Array.from({ length: 50 }, (_, i) => [`file${i}.txt`, `Content of file ${i}`])
  )
};