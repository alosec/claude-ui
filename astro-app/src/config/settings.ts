import type { WorkspaceSettings } from '../services/types';

// Default workspace settings
export const DEFAULT_WORKSPACE_SETTINGS: WorkspaceSettings = {
  defaultPath: process.env.HOME ? `${process.env.HOME}/code` : '~/code',
  recentProjects: [],
  ignorePatterns: [
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
    '.cache',
    '.tmp',
    'tmp',
    '*.swp',
    '*.swo',
    '.sass-cache',
    'bower_components',
    'jspm_packages',
    'vendor',
    'composer.lock',
    'package-lock.json',
    'yarn.lock',
    'pnpm-lock.yaml'
  ]
};

// Environment-specific settings
export const SETTINGS = {
  // Workspace path environment variable name
  WORKSPACE_PATH_ENV: 'WORKSPACE_PATH',
  
  // Default workspace path fallback
  DEFAULT_WORKSPACE_PATH: '/home/alex/code',
  
  // Settings file name for persistent storage
  SETTINGS_FILE: '.claude-workspace-settings.json',
  
  // Maximum number of recent projects to keep
  MAX_RECENT_PROJECTS: 20,
  
  // File tree depth limits
  DEFAULT_TREE_DEPTH: 3,
  MAX_TREE_DEPTH: 10,
  
  // File size limits (in bytes)
  MAX_FILE_SIZE_FOR_READING: 1024 * 1024 * 10, // 10MB
  
  // Common file extensions for syntax highlighting hints
  TEXT_FILE_EXTENSIONS: [
    'txt', 'md', 'json', 'js', 'ts', 'tsx', 'jsx', 'html', 'css', 'scss', 'sass',
    'py', 'rb', 'go', 'rs', 'java', 'c', 'cpp', 'h', 'hpp', 'cs', 'php', 'swift',
    'kt', 'scala', 'clj', 'sh', 'bash', 'zsh', 'fish', 'ps1', 'bat', 'cmd',
    'xml', 'svg', 'yaml', 'yml', 'toml', 'ini', 'cfg', 'conf', 'env'
  ],
  
  // Binary file extensions to exclude from text operations
  BINARY_FILE_EXTENSIONS: [
    'png', 'jpg', 'jpeg', 'gif', 'bmp', 'ico', 'svg', 'webp',
    'mp3', 'mp4', 'avi', 'mov', 'wmv', 'flv', 'webm',
    'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
    'zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz',
    'exe', 'dll', 'so', 'dylib', 'app', 'dmg', 'pkg', 'deb', 'rpm',
    'woff', 'woff2', 'ttf', 'otf', 'eot'
  ]
};

// Utility functions for settings
export class SettingsUtils {
  static getWorkspacePath(): string {
    return process.env[SETTINGS.WORKSPACE_PATH_ENV] || SETTINGS.DEFAULT_WORKSPACE_PATH;
  }

  static shouldIgnoreFile(fileName: string, ignorePatterns: string[]): boolean {
    return ignorePatterns.some(pattern => {
      if (pattern.includes('*')) {
        const regex = new RegExp(pattern.replace(/\*/g, '.*'));
        return regex.test(fileName);
      }
      return fileName === pattern || fileName.startsWith(pattern);
    });
  }

  static isTextFile(fileName: string): boolean {
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    return SETTINGS.TEXT_FILE_EXTENSIONS.includes(ext);
  }

  static isBinaryFile(fileName: string): boolean {
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    return SETTINGS.BINARY_FILE_EXTENSIONS.includes(ext);
  }

  static addRecentProject(settings: WorkspaceSettings, projectPath: string): WorkspaceSettings {
    const recentProjects = settings.recentProjects.filter(p => p !== projectPath);
    recentProjects.unshift(projectPath);
    
    return {
      ...settings,
      recentProjects: recentProjects.slice(0, SETTINGS.MAX_RECENT_PROJECTS)
    };
  }

  static mergeSettings(defaultSettings: WorkspaceSettings, userSettings: Partial<WorkspaceSettings>): WorkspaceSettings {
    return {
      defaultPath: userSettings.defaultPath || defaultSettings.defaultPath,
      recentProjects: userSettings.recentProjects || defaultSettings.recentProjects,
      ignorePatterns: userSettings.ignorePatterns || defaultSettings.ignorePatterns
    };
  }
}