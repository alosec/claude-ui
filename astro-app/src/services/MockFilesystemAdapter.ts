import type { 
  FilesystemAdapter, 
  Project, 
  FileSystemItem, 
  FileContent, 
  WriteFileOptions, 
  FilesystemOperationResult,
  WorkspaceSettings 
} from './types';

// Mock data for demonstration
const MOCK_PROJECTS: Project[] = [
  {
    name: 'claude-ui',
    path: '~/code/claude-ui',
    lastModified: '2024-09-03',
    status: 'active',
    taskCount: 5
  },
  {
    name: 'portfolio-website',
    path: '~/code/portfolio-website',
    lastModified: '2024-09-01',
    status: 'active',
    taskCount: 2
  },
  {
    name: 'api-server',
    path: '~/code/api-server',
    lastModified: '2024-08-28',
    status: 'active',
    taskCount: 8
  },
  {
    name: 'learning-rust',
    path: '~/code/learning-rust',
    lastModified: '2024-08-25',
    status: 'inactive',
    taskCount: 0
  },
  {
    name: 'mobile-app',
    path: '~/code/mobile-app',
    lastModified: '2024-08-20',
    status: 'active',
    taskCount: 12
  }
];

const MOCK_FILE_TREES: Record<string, FileSystemItem> = {
  'claude-ui': {
    name: 'claude-ui',
    path: '~/code/claude-ui',
    type: 'directory',
    children: [
      {
        name: 'README.md',
        path: '~/code/claude-ui/README.md',
        type: 'file',
        size: 2456,
        lastModified: '2024-09-03T10:30:00Z'
      },
      {
        name: 'package.json',
        path: '~/code/claude-ui/package.json',
        type: 'file',
        size: 1234,
        lastModified: '2024-09-02T15:45:00Z'
      },
      {
        name: 'astro-app',
        path: '~/code/claude-ui/astro-app',
        type: 'directory',
        children: [
          {
            name: 'src',
            path: '~/code/claude-ui/astro-app/src',
            type: 'directory',
            children: [
              {
                name: 'components',
                path: '~/code/claude-ui/astro-app/src/components',
                type: 'directory',
                children: [
                  {
                    name: 'ProjectsTable',
                    path: '~/code/claude-ui/astro-app/src/components/ProjectsTable',
                    type: 'directory',
                    children: [
                      {
                        name: 'ProjectsTable.tsx',
                        path: '~/code/claude-ui/astro-app/src/components/ProjectsTable/ProjectsTable.tsx',
                        type: 'file',
                        size: 3456,
                        lastModified: '2024-09-03T09:15:00Z'
                      }
                    ]
                  }
                ]
              },
              {
                name: 'services',
                path: '~/code/claude-ui/astro-app/src/services',
                type: 'directory',
                children: [
                  {
                    name: 'FilesystemAdapter.ts',
                    path: '~/code/claude-ui/astro-app/src/services/FilesystemAdapter.ts',
                    type: 'file',
                    size: 1234,
                    lastModified: '2024-09-03T11:20:00Z'
                  }
                ]
              }
            ]
          },
          {
            name: 'astro.config.mjs',
            path: '~/code/claude-ui/astro-app/astro.config.mjs',
            type: 'file',
            size: 892,
            lastModified: '2024-09-01T14:30:00Z'
          }
        ]
      },
      {
        name: '.git',
        path: '~/code/claude-ui/.git',
        type: 'directory',
        children: []
      }
    ]
  },
  'portfolio-website': {
    name: 'portfolio-website',
    path: '~/code/portfolio-website',
    type: 'directory',
    children: [
      {
        name: 'index.html',
        path: '~/code/portfolio-website/index.html',
        type: 'file',
        size: 3456,
        lastModified: '2024-09-01T16:00:00Z'
      },
      {
        name: 'styles',
        path: '~/code/portfolio-website/styles',
        type: 'directory',
        children: [
          {
            name: 'main.css',
            path: '~/code/portfolio-website/styles/main.css',
            type: 'file',
            size: 2341,
            lastModified: '2024-09-01T15:45:00Z'
          }
        ]
      },
      {
        name: 'scripts',
        path: '~/code/portfolio-website/scripts',
        type: 'directory',
        children: [
          {
            name: 'app.js',
            path: '~/code/portfolio-website/scripts/app.js',
            type: 'file',
            size: 1567,
            lastModified: '2024-08-30T10:20:00Z'
          }
        ]
      }
    ]
  },
  'api-server': {
    name: 'api-server',
    path: '~/code/api-server',
    type: 'directory',
    children: [
      {
        name: 'package.json',
        path: '~/code/api-server/package.json',
        type: 'file',
        size: 1456,
        lastModified: '2024-08-28T14:15:00Z'
      },
      {
        name: 'src',
        path: '~/code/api-server/src',
        type: 'directory',
        children: [
          {
            name: 'index.js',
            path: '~/code/api-server/src/index.js',
            type: 'file',
            size: 2890,
            lastModified: '2024-08-28T13:30:00Z'
          },
          {
            name: 'routes',
            path: '~/code/api-server/src/routes',
            type: 'directory',
            children: [
              {
                name: 'users.js',
                path: '~/code/api-server/src/routes/users.js',
                type: 'file',
                size: 1234,
                lastModified: '2024-08-27T16:45:00Z'
              }
            ]
          }
        ]
      },
      {
        name: 'README.md',
        path: '~/code/api-server/README.md',
        type: 'file',
        size: 1890,
        lastModified: '2024-08-26T09:00:00Z'
      }
    ]
  }
};

const MOCK_FILE_CONTENTS: Record<string, string> = {
  '~/code/claude-ui/README.md': `# Claude UI

A modern project management interface built with Astro and React.

## Features

- 📁 Project browsing and management
- 🔄 Git integration
- 📊 Project analytics
- 🎯 Task tracking

## Getting Started

\`\`\`bash
npm install
npm run dev
\`\`\`

## Demo Mode

You're currently viewing demo data. This app works best when deployed on a VPS with file system access.
`,
  '~/code/claude-ui/package.json': `{
  "name": "claude-ui",
  "type": "module",
  "version": "1.0.0",
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview"
  },
  "dependencies": {
    "@astrojs/react": "^4.3.0",
    "@astrojs/node": "^9.4.3",
    "astro": "^4.15.0",
    "react": "^18.3.1"
  }
}`,
  '~/code/portfolio-website/index.html': `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My Portfolio</title>
    <link rel="stylesheet" href="styles/main.css">
</head>
<body>
    <header>
        <h1>John Doe</h1>
        <nav>
            <a href="#about">About</a>
            <a href="#projects">Projects</a>
            <a href="#contact">Contact</a>
        </nav>
    </header>
    
    <main>
        <section id="about">
            <h2>About Me</h2>
            <p>I'm a passionate web developer...</p>
        </section>
        
        <section id="projects">
            <h2>My Projects</h2>
            <div class="project-grid">
                <!-- Projects will be loaded here -->
            </div>
        </section>
    </main>
    
    <script src="scripts/app.js"></script>
</body>
</html>`,
  '~/code/api-server/src/index.js': `const express = require('express');
const cors = require('cors');
const userRoutes = require('./routes/users');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/users', userRoutes);

app.get('/', (req, res) => {
  res.json({ 
    message: 'API Server is running!',
    version: '1.0.0',
    endpoints: ['/api/users']
  });
});

app.listen(PORT, () => {
  console.log(\`Server is running on port \${PORT}\`);
});`
};

const MOCK_WORKSPACE_SETTINGS: WorkspaceSettings = {
  defaultPath: '~/code',
  recentProjects: [
    '~/code/claude-ui',
    '~/code/portfolio-website',
    '~/code/api-server'
  ],
  ignorePatterns: [
    'node_modules',
    '.git',
    '.DS_Store',
    'dist',
    'build'
  ]
};

export class MockFilesystemAdapter implements FilesystemAdapter {
  private _isDemoMode = true;

  get isDemoMode(): boolean {
    return this._isDemoMode;
  }

  async listProjects(): Promise<FilesystemOperationResult<Project[]>> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 300));
    
    return {
      success: true,
      data: MOCK_PROJECTS
    };
  }

  async getProjectTree(projectName: string, maxDepth = 3): Promise<FilesystemOperationResult<FileSystemItem>> {
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const tree = MOCK_FILE_TREES[projectName];
    if (!tree) {
      return {
        success: false,
        error: `Project "${projectName}" not found`
      };
    }

    return {
      success: true,
      data: tree
    };
  }

  async readFile(filePath: string): Promise<FilesystemOperationResult<FileContent>> {
    await new Promise(resolve => setTimeout(resolve, 150));
    
    const content = MOCK_FILE_CONTENTS[filePath];
    if (!content) {
      return {
        success: false,
        error: `File "${filePath}" not found`
      };
    }

    const fileName = filePath.split('/').pop() || '';
    const fileExtension = fileName.split('.').pop() || '';
    
    return {
      success: true,
      data: {
        path: filePath,
        content,
        size: content.length,
        lastModified: new Date().toISOString(),
        encoding: 'utf8',
        mimeType: this._getMimeType(fileExtension)
      }
    };
  }

  async writeFile(filePath: string, content: string, options?: WriteFileOptions): Promise<FilesystemOperationResult<void>> {
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // In demo mode, we simulate success but don't actually write
    return {
      success: false,
      error: 'Write operations are not available in demo mode'
    };
  }

  async deleteFile(filePath: string): Promise<FilesystemOperationResult<void>> {
    return {
      success: false,
      error: 'Delete operations are not available in demo mode'
    };
  }

  async createDirectory(dirPath: string): Promise<FilesystemOperationResult<void>> {
    return {
      success: false,
      error: 'Directory creation is not available in demo mode'
    };
  }

  async deleteDirectory(dirPath: string, recursive = false): Promise<FilesystemOperationResult<void>> {
    return {
      success: false,
      error: 'Directory deletion is not available in demo mode'
    };
  }

  async getWorkspaceSettings(): Promise<FilesystemOperationResult<WorkspaceSettings>> {
    await new Promise(resolve => setTimeout(resolve, 100));
    
    return {
      success: true,
      data: MOCK_WORKSPACE_SETTINGS
    };
  }

  async updateWorkspaceSettings(settings: Partial<WorkspaceSettings>): Promise<FilesystemOperationResult<void>> {
    return {
      success: false,
      error: 'Settings updates are not available in demo mode'
    };
  }

  private _getMimeType(extension: string): string {
    const mimeTypes: Record<string, string> = {
      'txt': 'text/plain',
      'md': 'text/markdown',
      'json': 'application/json',
      'js': 'text/javascript',
      'ts': 'application/typescript',
      'tsx': 'text/tsx',
      'jsx': 'text/jsx',
      'html': 'text/html',
      'css': 'text/css',
      'py': 'text/x-python',
      'rb': 'text/x-ruby',
      'go': 'text/x-go',
      'rs': 'text/x-rust',
      'java': 'text/x-java',
      'c': 'text/x-c',
      'cpp': 'text/x-c++',
      'xml': 'application/xml',
      'yaml': 'application/x-yaml',
      'yml': 'application/x-yaml',
      'toml': 'application/toml'
    };
    
    return mimeTypes[extension] || 'text/plain';
  }
}