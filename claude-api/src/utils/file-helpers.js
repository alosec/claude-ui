import { stat, access, readdir } from 'fs/promises';
import { join, dirname, basename, extname } from 'path';
import { constants } from 'fs';

/**
 * Check if a path exists and is accessible
 * @param {string} filePath - Path to check
 * @returns {Promise<boolean>}
 */
export async function pathExists(filePath) {
  try {
    await access(filePath, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if a path is readable
 * @param {string} filePath - Path to check
 * @returns {Promise<boolean>}
 */
export async function isReadable(filePath) {
  try {
    await access(filePath, constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if a path is writable
 * @param {string} filePath - Path to check
 * @returns {Promise<boolean>}
 */
export async function isWritable(filePath) {
  try {
    await access(filePath, constants.W_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get file statistics safely
 * @param {string} filePath - Path to get stats for
 * @returns {Promise<Object|null>}
 */
export async function getFileStats(filePath) {
  try {
    const stats = await stat(filePath);
    return {
      size: stats.size,
      created: stats.birthtime,
      modified: stats.mtime,
      accessed: stats.atime,
      isFile: stats.isFile(),
      isDirectory: stats.isDirectory(),
      mode: stats.mode,
      uid: stats.uid,
      gid: stats.gid
    };
  } catch (error) {
    return null;
  }
}

/**
 * Format file size in human readable format
 * @param {number} bytes - Size in bytes
 * @returns {string}
 */
export function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Sanitize filename to be safe for filesystem
 * @param {string} filename - Filename to sanitize
 * @returns {string}
 */
export function sanitizeFilename(filename) {
  // Remove or replace dangerous characters
  return filename
    .replace(/[<>:"/\\|?*]/g, '_')
    .replace(/\.\./g, '__')
    .replace(/^\.+/, '')
    .replace(/\.+$/, '')
    .substring(0, 255);
}

/**
 * Validate that path is within allowed directory (prevent path traversal)
 * @param {string} requestedPath - Path requested by user
 * @param {string} allowedBasePath - Base path that should contain the requested path
 * @returns {boolean}
 */
export function isPathSafe(requestedPath, allowedBasePath) {
  try {
    const resolvedRequested = join(allowedBasePath, requestedPath);
    const resolvedBase = join(allowedBasePath);
    
    return resolvedRequested.startsWith(resolvedBase);
  } catch {
    return false;
  }
}

/**
 * Get directory contents with filtering
 * @param {string} dirPath - Directory path
 * @param {Object} options - Filtering options
 * @returns {Promise<Array<Object>>}
 */
export async function getDirectoryContents(dirPath, options = {}) {
  const {
    extension = null,
    includeHidden = false,
    sortBy = 'name',
    sortOrder = 'asc'
  } = options;

  try {
    const entries = await readdir(dirPath, { withFileTypes: true });
    const contents = [];

    for (const entry of entries) {
      // Skip hidden files unless requested
      if (!includeHidden && entry.name.startsWith('.')) {
        continue;
      }

      // Filter by extension if specified
      if (extension && !entry.name.endsWith(extension)) {
        continue;
      }

      const fullPath = join(dirPath, entry.name);
      const stats = await getFileStats(fullPath);

      contents.push({
        name: entry.name,
        path: fullPath,
        isFile: entry.isFile(),
        isDirectory: entry.isDirectory(),
        extension: entry.isFile() ? extname(entry.name) : null,
        ...stats
      });
    }

    // Sort contents
    contents.sort((a, b) => {
      let aVal, bVal;
      
      switch (sortBy) {
        case 'size':
          aVal = a.size || 0;
          bVal = b.size || 0;
          break;
        case 'modified':
          aVal = new Date(a.modified || 0);
          bVal = new Date(b.modified || 0);
          break;
        case 'created':
          aVal = new Date(a.created || 0);
          bVal = new Date(b.created || 0);
          break;
        case 'name':
        default:
          aVal = a.name.toLowerCase();
          bVal = b.name.toLowerCase();
          break;
      }

      if (typeof aVal === 'string') {
        return sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      } else {
        return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
      }
    });

    return contents;
  } catch (error) {
    throw new Error(`Failed to read directory contents: ${error.message}`);
  }
}

/**
 * Find files matching a pattern recursively
 * @param {string} basePath - Base directory to search
 * @param {RegExp|string} pattern - Pattern to match filenames
 * @param {Object} options - Search options
 * @returns {Promise<Array<string>>}
 */
export async function findFiles(basePath, pattern, options = {}) {
  const {
    maxDepth = 10,
    includeHidden = false,
    followSymlinks = false
  } = options;

  const results = [];
  const searchPattern = typeof pattern === 'string' ? new RegExp(pattern) : pattern;

  async function searchDirectory(currentPath, currentDepth) {
    if (currentDepth > maxDepth) return;

    try {
      const entries = await readdir(currentPath, { withFileTypes: true });

      for (const entry of entries) {
        if (!includeHidden && entry.name.startsWith('.')) {
          continue;
        }

        const fullPath = join(currentPath, entry.name);

        if (entry.isFile()) {
          if (searchPattern.test(entry.name)) {
            results.push(fullPath);
          }
        } else if (entry.isDirectory() || (followSymlinks && entry.isSymbolicLink())) {
          await searchDirectory(fullPath, currentDepth + 1);
        }
      }
    } catch (error) {
      // Silently skip directories we can't read
      console.warn(`Cannot read directory ${currentPath}: ${error.message}`);
    }
  }

  await searchDirectory(basePath, 0);
  return results;
}

/**
 * Create a backup of a file with timestamp
 * @param {string} filePath - Original file path
 * @param {string} backupDir - Directory to store backup (optional)
 * @returns {Promise<string>} - Backup file path
 */
export async function createBackup(filePath, backupDir = null) {
  const stats = await getFileStats(filePath);
  if (!stats || !stats.isFile) {
    throw new Error('Source file does not exist or is not a file');
  }

  const fileName = basename(filePath, extname(filePath));
  const extension = extname(filePath);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  
  const backupFileName = `${fileName}.backup.${timestamp}${extension}`;
  const targetDir = backupDir || dirname(filePath);
  const backupPath = join(targetDir, backupFileName);

  // Copy file (this would require implementing file copy)
  // For now, return the planned backup path
  return backupPath;
}

/**
 * Calculate directory size recursively
 * @param {string} dirPath - Directory path
 * @param {Object} options - Calculation options
 * @returns {Promise<Object>}
 */
export async function calculateDirectorySize(dirPath, options = {}) {
  const {
    includeHidden = false,
    maxDepth = 50,
    followSymlinks = false
  } = options;

  let totalSize = 0;
  let fileCount = 0;
  let dirCount = 0;
  const errors = [];

  async function processDirectory(currentPath, currentDepth) {
    if (currentDepth > maxDepth) return;

    try {
      const entries = await readdir(currentPath, { withFileTypes: true });
      dirCount++;

      for (const entry of entries) {
        if (!includeHidden && entry.name.startsWith('.')) {
          continue;
        }

        const fullPath = join(currentPath, entry.name);

        try {
          if (entry.isFile()) {
            const stats = await stat(fullPath);
            totalSize += stats.size;
            fileCount++;
          } else if (entry.isDirectory() || (followSymlinks && entry.isSymbolicLink())) {
            await processDirectory(fullPath, currentDepth + 1);
          }
        } catch (error) {
          errors.push({
            path: fullPath,
            error: error.message
          });
        }
      }
    } catch (error) {
      errors.push({
        path: currentPath,
        error: error.message
      });
    }
  }

  await processDirectory(dirPath, 0);

  return {
    totalSize,
    fileCount,
    dirCount: dirCount - 1, // Don't count the root directory
    formattedSize: formatFileSize(totalSize),
    errors: errors.length > 0 ? errors : undefined
  };
}

/**
 * Get relative path from base to target
 * @param {string} basePath - Base path
 * @param {string} targetPath - Target path
 * @returns {string}
 */
export function getRelativePath(basePath, targetPath) {
  const path = require('path');
  return path.relative(basePath, targetPath);
}

/**
 * Normalize path separators for current OS
 * @param {string} filePath - File path to normalize
 * @returns {string}
 */
export function normalizePath(filePath) {
  const path = require('path');
  return path.normalize(filePath);
}