import type { 
  FilesystemAdapter, 
  Project, 
  FileSystemItem, 
  FileContent, 
  WriteFileOptions, 
  FilesystemOperationResult,
  WorkspaceSettings 
} from './types';

export class ClientFilesystemAdapter implements FilesystemAdapter {
  private electron: any;
  private tauri: any;

  constructor() {
    // Initialize platform-specific APIs
    this.electron = typeof window !== 'undefined' && (window as any).electron;
    this.tauri = typeof window !== 'undefined' && (window as any).__TAURI__;
  }

  private async invokeElectron(channel: string, ...args: any[]): Promise<any> {
    if (!this.electron || !this.electron.ipcRenderer) {
      throw new Error('Electron IPC not available');
    }
    return this.electron.ipcRenderer.invoke(channel, ...args);
  }

  private async invokeTauri(command: string, args?: any): Promise<any> {
    if (!this.tauri || !this.tauri.invoke) {
      throw new Error('Tauri invoke not available');
    }
    return this.tauri.invoke(command, args);
  }

  private async performOperation<T>(operation: () => Promise<T>): Promise<FilesystemOperationResult<T>> {
    try {
      const result = await operation();
      return { success: true, data: result };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async listProjects(): Promise<FilesystemOperationResult<Project[]>> {
    return this.performOperation(async () => {
      if (this.electron) {
        return await this.invokeElectron('filesystem:listProjects');
      } else if (this.tauri) {
        return await this.invokeTauri('list_projects');
      } else {
        throw new Error('No native filesystem API available');
      }
    });
  }

  async getProjectTree(projectName: string, maxDepth = 3): Promise<FilesystemOperationResult<FileSystemItem>> {
    return this.performOperation(async () => {
      if (this.electron) {
        return await this.invokeElectron('filesystem:getProjectTree', { projectName, maxDepth });
      } else if (this.tauri) {
        return await this.invokeTauri('get_project_tree', { project_name: projectName, max_depth: maxDepth });
      } else {
        throw new Error('No native filesystem API available');
      }
    });
  }

  async readFile(filePath: string): Promise<FilesystemOperationResult<FileContent>> {
    return this.performOperation(async () => {
      if (this.electron) {
        return await this.invokeElectron('filesystem:readFile', { filePath });
      } else if (this.tauri) {
        return await this.invokeTauri('read_file', { file_path: filePath });
      } else {
        throw new Error('No native filesystem API available');
      }
    });
  }

  async writeFile(filePath: string, content: string, options?: WriteFileOptions): Promise<FilesystemOperationResult<void>> {
    return this.performOperation(async () => {
      if (this.electron) {
        return await this.invokeElectron('filesystem:writeFile', { filePath, content, options });
      } else if (this.tauri) {
        return await this.invokeTauri('write_file', { 
          file_path: filePath, 
          content, 
          options: {
            encoding: options?.encoding || 'utf8',
            create_directories: options?.createDirectories || false
          }
        });
      } else {
        throw new Error('No native filesystem API available');
      }
    });
  }

  async deleteFile(filePath: string): Promise<FilesystemOperationResult<void>> {
    return this.performOperation(async () => {
      if (this.electron) {
        return await this.invokeElectron('filesystem:deleteFile', { filePath });
      } else if (this.tauri) {
        return await this.invokeTauri('delete_file', { file_path: filePath });
      } else {
        throw new Error('No native filesystem API available');
      }
    });
  }

  async createDirectory(dirPath: string): Promise<FilesystemOperationResult<void>> {
    return this.performOperation(async () => {
      if (this.electron) {
        return await this.invokeElectron('filesystem:createDirectory', { dirPath });
      } else if (this.tauri) {
        return await this.invokeTauri('create_directory', { dir_path: dirPath });
      } else {
        throw new Error('No native filesystem API available');
      }
    });
  }

  async deleteDirectory(dirPath: string, recursive = false): Promise<FilesystemOperationResult<void>> {
    return this.performOperation(async () => {
      if (this.electron) {
        return await this.invokeElectron('filesystem:deleteDirectory', { dirPath, recursive });
      } else if (this.tauri) {
        return await this.invokeTauri('delete_directory', { dir_path: dirPath, recursive });
      } else {
        throw new Error('No native filesystem API available');
      }
    });
  }

  async getWorkspaceSettings(): Promise<FilesystemOperationResult<WorkspaceSettings>> {
    return this.performOperation(async () => {
      if (this.electron) {
        return await this.invokeElectron('filesystem:getWorkspaceSettings');
      } else if (this.tauri) {
        return await this.invokeTauri('get_workspace_settings');
      } else {
        throw new Error('No native filesystem API available');
      }
    });
  }

  async updateWorkspaceSettings(settings: Partial<WorkspaceSettings>): Promise<FilesystemOperationResult<void>> {
    return this.performOperation(async () => {
      if (this.electron) {
        return await this.invokeElectron('filesystem:updateWorkspaceSettings', { settings });
      } else if (this.tauri) {
        return await this.invokeTauri('update_workspace_settings', { settings });
      } else {
        throw new Error('No native filesystem API available');
      }
    });
  }
}