import fs from 'fs/promises';
import path from 'path';

const WORKSPACE_PATH = process.env.WORKSPACE_PATH || '/home/alex/code';

const IGNORE_PATTERNS = [
  'node_modules',
  '.git',
  '.DS_Store',
  '.env',
  '.env.local',
  'dist',
  'build',
  '.next',
  '.astro',
  'coverage',
  '.nyc_output',
  '__pycache__',
  '*.pyc',
  '.pytest_cache',
  '.vscode',
  '.idea',
  '*.log',
  '.cache'
];

function shouldIgnore(name) {
  return IGNORE_PATTERNS.some(pattern => {
    if (pattern.includes('*')) {
      const regex = new RegExp(pattern.replace('*', '.*'));
      return regex.test(name);
    }
    return name === pattern || name.startsWith(pattern);
  });
}

async function buildFileTree(dirPath, maxDepth = 3, currentDepth = 0) {
  if (currentDepth >= maxDepth) {
    return null;
  }

  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    const tree = {
      name: path.basename(dirPath),
      type: 'directory',
      path: dirPath,
      children: []
    };

    for (const entry of entries) {
      if (shouldIgnore(entry.name)) {
        continue;
      }

      const fullPath = path.join(dirPath, entry.name);
      
      if (entry.isDirectory()) {
        const subtree = await buildFileTree(fullPath, maxDepth, currentDepth + 1);
        if (subtree) {
          tree.children.push(subtree);
        }
      } else {
        tree.children.push({
          name: entry.name,
          type: 'file',
          path: fullPath,
          size: await getFileSize(fullPath)
        });
      }
    }

    // Sort children: directories first, then files, both alphabetically
    tree.children.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === 'directory' ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });

    return tree;
  } catch (error) {
    console.warn(`Could not read directory ${dirPath}:`, error.message);
    return null;
  }
}

async function getFileSize(filePath) {
  try {
    const stats = await fs.stat(filePath);
    return stats.size;
  } catch (error) {
    return 0;
  }
}

export async function GET({ url }) {
  const searchParams = new URL(url).searchParams;
  const projectName = searchParams.get('project');
  const maxDepth = parseInt(searchParams.get('depth') || '3');

  if (!projectName) {
    return new Response(JSON.stringify({ error: 'Project name is required' }), {
      status: 400,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  const projectPath = path.join(WORKSPACE_PATH, projectName);

  try {
    const stats = await fs.stat(projectPath);
    if (!stats.isDirectory()) {
      return new Response(JSON.stringify({ error: 'Project is not a directory' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }

    const tree = await buildFileTree(projectPath, maxDepth);
    
    return new Response(JSON.stringify({
      project: projectName,
      tree: tree,
      metadata: {
        workspace: WORKSPACE_PATH,
        maxDepth: maxDepth,
        generated: new Date().toISOString()
      }
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    return new Response(JSON.stringify({ 
      error: 'Project not found or not accessible',
      details: error.message 
    }), {
      status: 404,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
}