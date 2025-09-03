import fs from 'fs/promises';
import path from 'path';
import { SETTINGS, SettingsUtils } from '../../config/settings.ts';

const WORKSPACE_PATH = process.env.WORKSPACE_PATH || SETTINGS.DEFAULT_WORKSPACE_PATH;

// Security: Ensure file path is within workspace
function validatePath(filePath) {
  const resolvedPath = path.resolve(filePath);
  const resolvedWorkspace = path.resolve(WORKSPACE_PATH);
  
  if (!resolvedPath.startsWith(resolvedWorkspace)) {
    throw new Error('Path outside workspace not allowed');
  }
  
  return resolvedPath;
}

async function readFile(filePath) {
  const validatedPath = validatePath(filePath);
  
  try {
    const stats = await fs.stat(validatedPath);
    
    // Check file size limit
    if (stats.size > SETTINGS.MAX_FILE_SIZE_FOR_READING) {
      throw new Error(`File too large (${stats.size} bytes). Maximum allowed: ${SETTINGS.MAX_FILE_SIZE_FOR_READING} bytes`);
    }
    
    const fileName = path.basename(validatedPath);
    const isBinary = SettingsUtils.isBinaryFile(fileName);
    
    if (isBinary) {
      // Read binary files as base64
      const buffer = await fs.readFile(validatedPath);
      return {
        content: buffer.toString('base64'),
        encoding: 'base64',
        lastModified: stats.mtime.toISOString(),
        size: stats.size,
        isBinary: true
      };
    } else {
      // Read text files as UTF-8
      const content = await fs.readFile(validatedPath, 'utf8');
      return {
        content,
        encoding: 'utf8',
        lastModified: stats.mtime.toISOString(),
        size: stats.size,
        isBinary: false
      };
    }
  } catch (error) {
    throw new Error(`Failed to read file: ${error.message}`);
  }
}

async function writeFile(filePath, content, options = {}) {
  const validatedPath = validatePath(filePath);
  const { encoding = 'utf8', createDirectories = false } = options;
  
  try {
    // Create parent directories if requested
    if (createDirectories) {
      const parentDir = path.dirname(validatedPath);
      await fs.mkdir(parentDir, { recursive: true });
    }
    
    if (encoding === 'base64') {
      const buffer = Buffer.from(content, 'base64');
      await fs.writeFile(validatedPath, buffer);
    } else {
      await fs.writeFile(validatedPath, content, encoding);
    }
    
    const stats = await fs.stat(validatedPath);
    return {
      lastModified: stats.mtime.toISOString(),
      size: stats.size
    };
  } catch (error) {
    throw new Error(`Failed to write file: ${error.message}`);
  }
}

async function deleteFile(filePath) {
  const validatedPath = validatePath(filePath);
  
  try {
    await fs.unlink(validatedPath);
  } catch (error) {
    throw new Error(`Failed to delete file: ${error.message}`);
  }
}

async function createDirectory(dirPath) {
  const validatedPath = validatePath(dirPath);
  
  try {
    await fs.mkdir(validatedPath, { recursive: true });
  } catch (error) {
    throw new Error(`Failed to create directory: ${error.message}`);
  }
}

async function deleteDirectory(dirPath, recursive = false) {
  const validatedPath = validatePath(dirPath);
  
  try {
    if (recursive) {
      await fs.rm(validatedPath, { recursive: true, force: true });
    } else {
      await fs.rmdir(validatedPath);
    }
  } catch (error) {
    throw new Error(`Failed to delete directory: ${error.message}`);
  }
}

// GET request - read file
export async function GET({ url }) {
  const searchParams = new URL(url).searchParams;
  const action = searchParams.get('action');
  const filePath = searchParams.get('path');
  
  if (!filePath) {
    return new Response(JSON.stringify({ error: 'File path is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  try {
    if (action === 'read' || !action) {
      const file = await readFile(filePath);
      return new Response(JSON.stringify({ file }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } else {
      return new Response(JSON.stringify({ error: 'Invalid action for GET request' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  } catch (error) {
    return new Response(JSON.stringify({ 
      error: error.message
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// POST request - write file or create directory
export async function POST({ request }) {
  try {
    const body = await request.json();
    const { action, path: filePath, content, options } = body;
    
    if (!filePath) {
      return new Response(JSON.stringify({ error: 'Path is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    if (action === 'write') {
      if (content === undefined) {
        return new Response(JSON.stringify({ error: 'Content is required for write action' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      const result = await writeFile(filePath, content, options);
      return new Response(JSON.stringify({ 
        success: true,
        ...result
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
      
    } else if (action === 'mkdir') {
      await createDirectory(filePath);
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
      
    } else {
      return new Response(JSON.stringify({ error: 'Invalid action for POST request' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
  } catch (error) {
    return new Response(JSON.stringify({ 
      error: error.message
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// DELETE request - delete file or directory
export async function DELETE({ request }) {
  try {
    const body = await request.json();
    const { action, path: filePath, type, recursive } = body;
    
    if (!filePath) {
      return new Response(JSON.stringify({ error: 'Path is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    if (action === 'delete' || !action) {
      if (type === 'directory') {
        await deleteDirectory(filePath, recursive);
      } else {
        await deleteFile(filePath);
      }
      
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
      
    } else {
      return new Response(JSON.stringify({ error: 'Invalid action for DELETE request' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
  } catch (error) {
    return new Response(JSON.stringify({ 
      error: error.message
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}