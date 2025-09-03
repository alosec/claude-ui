import fs from 'fs/promises';
import path from 'path';
import { DEFAULT_WORKSPACE_SETTINGS, SETTINGS, SettingsUtils } from '../../config/settings.ts';

const WORKSPACE_PATH = process.env.WORKSPACE_PATH || SETTINGS.DEFAULT_WORKSPACE_PATH;

// Use settings-based ignore patterns
function shouldIgnore(name) {
  return SettingsUtils.shouldIgnoreFile(name, DEFAULT_WORKSPACE_SETTINGS.ignorePatterns);
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
        const metadata = await getFileMetadata(fullPath);
        tree.children.push({
          name: entry.name,
          type: 'file',
          path: fullPath,
          size: metadata.size,
          lastModified: metadata.lastModified
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

async function getFileMetadata(filePath) {
  try {
    const stats = await fs.stat(filePath);
    return {
      size: stats.size,
      lastModified: stats.mtime.toISOString()
    };
  } catch (error) {
    return {
      size: 0,
      lastModified: new Date().toISOString()
    };
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