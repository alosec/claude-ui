import type { 
  GitAdapter, 
  GitBranch, 
  GitWorktree, 
  GitStatus, 
  GitRemote, 
  GitFileChange,
  GitCommit,
  GitOperationResult 
} from './types';

export class ApiGitAdapter implements GitAdapter {
  private baseUrl: string;

  constructor(baseUrl = '') {
    this.baseUrl = baseUrl;
  }

  async getRepoStatus(projectPath: string): Promise<GitOperationResult<GitStatus>> {
    try {
      const response = await fetch(`${this.baseUrl}/api/git-status.json?project=${encodeURIComponent(projectPath)}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return { success: true, data: data.status };
    } catch (error) {
      return {
        success: false,
        error: `Failed to get repository status: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  async getFileChanges(projectPath: string): Promise<GitOperationResult<GitFileChange[]>> {
    try {
      const response = await fetch(`${this.baseUrl}/api/git-status.json?project=${encodeURIComponent(projectPath)}&info=changes`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return { success: true, data: data.fileChanges || [] };
    } catch (error) {
      return {
        success: false,
        error: `Failed to get file changes: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  async getRecentCommits(projectPath: string, limit = 5): Promise<GitOperationResult<GitCommit[]>> {
    try {
      const response = await fetch(`${this.baseUrl}/api/git-status.json?project=${encodeURIComponent(projectPath)}&info=commits&limit=${limit}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return { success: true, data: data.commits || [] };
    } catch (error) {
      return {
        success: false,
        error: `Failed to get recent commits: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  async getBranches(projectPath: string): Promise<GitOperationResult<GitBranch[]>> {
    try {
      const response = await fetch(`${this.baseUrl}/api/git-status.json?project=${encodeURIComponent(projectPath)}&info=branches`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return { success: true, data: data.branches };
    } catch (error) {
      return {
        success: false,
        error: `Failed to get branches: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  async getWorktrees(projectPath: string): Promise<GitOperationResult<GitWorktree[]>> {
    try {
      const response = await fetch(`${this.baseUrl}/api/git-status.json?project=${encodeURIComponent(projectPath)}&info=worktrees`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return { success: true, data: data.worktrees };
    } catch (error) {
      return {
        success: false,
        error: `Failed to get worktrees: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  async getRemotes(projectPath: string): Promise<GitOperationResult<GitRemote[]>> {
    try {
      const response = await fetch(`${this.baseUrl}/api/git-status.json?project=${encodeURIComponent(projectPath)}&info=remotes`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return { success: true, data: data.remotes };
    } catch (error) {
      return {
        success: false,
        error: `Failed to get remotes: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  async createBranch(projectPath: string, branchName: string): Promise<GitOperationResult<void>> {
    try {
      const response = await fetch(`${this.baseUrl}/api/git-operations.json`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'createBranch',
          project: projectPath,
          branchName
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: `Failed to create branch: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  async switchBranch(projectPath: string, branchName: string): Promise<GitOperationResult<void>> {
    try {
      const response = await fetch(`${this.baseUrl}/api/git-operations.json`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'switchBranch',
          project: projectPath,
          branchName
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: `Failed to switch branch: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  async deleteBranch(projectPath: string, branchName: string): Promise<GitOperationResult<void>> {
    try {
      const response = await fetch(`${this.baseUrl}/api/git-operations.json`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'deleteBranch',
          project: projectPath,
          branchName
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: `Failed to delete branch: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  async createWorktree(projectPath: string, worktreePath: string, branchName?: string): Promise<GitOperationResult<void>> {
    try {
      const response = await fetch(`${this.baseUrl}/api/git-operations.json`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'createWorktree',
          project: projectPath,
          worktreePath,
          branchName
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: `Failed to create worktree: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  async removeWorktree(projectPath: string, worktreePath: string): Promise<GitOperationResult<void>> {
    try {
      const response = await fetch(`${this.baseUrl}/api/git-operations.json`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'removeWorktree',
          project: projectPath,
          worktreePath
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: `Failed to remove worktree: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
}