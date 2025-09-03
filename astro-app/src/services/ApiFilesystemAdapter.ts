import type { 
  FilesystemAdapter, 
  Project, 
  FileSystemItem, 
  FileContent, 
  WriteFileOptions, 
  FilesystemOperationResult,
  WorkspaceSettings 
} from './types';

export class ApiFilesystemAdapter implements FilesystemAdapter {
  private baseUrl: string;

  constructor(baseUrl = '') {
    this.baseUrl = baseUrl;
  }

  async listProjects(): Promise<FilesystemOperationResult<Project[]>> {
    try {
      const response = await fetch(`${this.baseUrl}/api/projects.json`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return { success: true, data: data.projects };
    } catch (error) {
      return {
        success: false,
        error: `Failed to list projects: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  async getProjectTree(projectName: string, maxDepth = 3): Promise<FilesystemOperationResult<FileSystemItem>> {
    try {
      const response = await fetch(`${this.baseUrl}/api/project-tree.json?project=${encodeURIComponent(projectName)}&depth=${maxDepth}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return { success: true, data: data.tree };
    } catch (error) {
      return {
        success: false,
        error: `Failed to get project tree: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  async readFile(filePath: string): Promise<FilesystemOperationResult<FileContent>> {
    try {
      const response = await fetch(`${this.baseUrl}/api/project-files.json?action=read&path=${encodeURIComponent(filePath)}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return { success: true, data: data.file };
    } catch (error) {
      return {
        success: false,
        error: `Failed to read file: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  async writeFile(filePath: string, content: string, options?: WriteFileOptions): Promise<FilesystemOperationResult<void>> {
    try {
      const response = await fetch(`${this.baseUrl}/api/project-files.json`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'write',
          path: filePath,
          content,
          options
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: `Failed to write file: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  async deleteFile(filePath: string): Promise<FilesystemOperationResult<void>> {
    try {
      const response = await fetch(`${this.baseUrl}/api/project-files.json`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'delete',
          path: filePath,
          type: 'file'
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: `Failed to delete file: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  async createDirectory(dirPath: string): Promise<FilesystemOperationResult<void>> {
    try {
      const response = await fetch(`${this.baseUrl}/api/project-files.json`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'mkdir',
          path: dirPath
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: `Failed to create directory: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  async deleteDirectory(dirPath: string, recursive = false): Promise<FilesystemOperationResult<void>> {
    try {
      const response = await fetch(`${this.baseUrl}/api/project-files.json`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'delete',
          path: dirPath,
          type: 'directory',
          recursive
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: `Failed to delete directory: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  async getWorkspaceSettings(): Promise<FilesystemOperationResult<WorkspaceSettings>> {
    try {
      const response = await fetch(`${this.baseUrl}/api/workspace-settings.json`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return { success: true, data: data.settings };
    } catch (error) {
      return {
        success: false,
        error: `Failed to get workspace settings: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  async updateWorkspaceSettings(settings: Partial<WorkspaceSettings>): Promise<FilesystemOperationResult<void>> {
    try {
      const response = await fetch(`${this.baseUrl}/api/workspace-settings.json`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ settings })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: `Failed to update workspace settings: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
}