// Filesystem service types
export interface FileSystemItem {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size?: number;
  lastModified?: string;
  children?: FileSystemItem[];
}

export interface Project {
  name: string;
  path: string;
  lastModified: string;
  status: 'active' | 'inactive';
  taskCount?: number;
}

export interface FileContent {
  content: string;
  encoding: 'utf8' | 'base64';
  lastModified: string;
  size: number;
}

export interface WriteFileOptions {
  encoding?: 'utf8' | 'base64';
  createDirectories?: boolean;
}

export interface FilesystemOperationResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface WorkspaceSettings {
  defaultPath: string;
  recentProjects: string[];
  ignorePatterns: string[];
}

// Core filesystem adapter interface
export interface FilesystemAdapter {
  // Project operations
  listProjects(): Promise<FilesystemOperationResult<Project[]>>;
  getProjectTree(projectName: string, maxDepth?: number): Promise<FilesystemOperationResult<FileSystemItem>>;
  
  // File operations
  readFile(filePath: string): Promise<FilesystemOperationResult<FileContent>>;
  writeFile(filePath: string, content: string, options?: WriteFileOptions): Promise<FilesystemOperationResult<void>>;
  deleteFile(filePath: string): Promise<FilesystemOperationResult<void>>;
  
  // Directory operations
  createDirectory(dirPath: string): Promise<FilesystemOperationResult<void>>;
  deleteDirectory(dirPath: string, recursive?: boolean): Promise<FilesystemOperationResult<void>>;
  
  // Settings
  getWorkspaceSettings(): Promise<FilesystemOperationResult<WorkspaceSettings>>;
  updateWorkspaceSettings(settings: Partial<WorkspaceSettings>): Promise<FilesystemOperationResult<void>>;
}

// Git service types
export interface GitBranch {
  name: string;
  isActive: boolean;
  isDefault: boolean;
  lastCommit?: {
    hash: string;
    message: string;
    author: string;
    date: string;
  };
  ahead?: number;
  behind?: number;
}

export interface GitWorktree {
  path: string;
  branch: string;
  isMain: boolean;
  isBare: boolean;
}

export interface GitStatus {
  isRepository: boolean;
  branches: GitBranch[];
  worktrees: GitWorktree[];
  currentBranch?: string;
  hasUncommittedChanges: boolean;
  stagedFiles: number;
  unstagedFiles: number;
  untrackedFiles: number;
  stashCount: number;
}

export interface GitRemote {
  name: string;
  url: string;
  type: 'fetch' | 'push';
}

export interface GitOperationResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

// Core git adapter interface
export interface GitAdapter {
  // Repository information
  getRepoStatus(projectPath: string): Promise<GitOperationResult<GitStatus>>;
  getBranches(projectPath: string): Promise<GitOperationResult<GitBranch[]>>;
  getWorktrees(projectPath: string): Promise<GitOperationResult<GitWorktree[]>>;
  getRemotes(projectPath: string): Promise<GitOperationResult<GitRemote[]>>;
  
  // Branch operations
  createBranch(projectPath: string, branchName: string): Promise<GitOperationResult<void>>;
  switchBranch(projectPath: string, branchName: string): Promise<GitOperationResult<void>>;
  deleteBranch(projectPath: string, branchName: string): Promise<GitOperationResult<void>>;
  
  // Worktree operations
  createWorktree(projectPath: string, worktreePath: string, branchName?: string): Promise<GitOperationResult<void>>;
  removeWorktree(projectPath: string, worktreePath: string): Promise<GitOperationResult<void>>;
}