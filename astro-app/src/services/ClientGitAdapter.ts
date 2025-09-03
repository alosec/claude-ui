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

export class ClientGitAdapter implements GitAdapter {
  private async executeGitCommand(projectPath: string, command: string[]): Promise<string> {
    // In a real implementation, this would use Electron's or Tauri's process execution
    // For now, we'll throw an error indicating this needs native implementation
    throw new Error('ClientGitAdapter requires native environment integration');
  }

  private parseGitStatus(statusOutput: string, projectPath: string): GitStatus {
    // This is a placeholder implementation
    // In a real scenario, this would parse actual git command output
    const lines = statusOutput.split('\n');
    
    return {
      isRepository: true,
      branches: [],
      worktrees: [],
      currentBranch: 'main',
      hasUncommittedChanges: lines.some(line => line.startsWith(' M') || line.startsWith('??')),
      stagedFiles: lines.filter(line => line.startsWith('A ') || line.startsWith('M ')).length,
      unstagedFiles: lines.filter(line => line.startsWith(' M') || line.startsWith(' D')).length,
      untrackedFiles: lines.filter(line => line.startsWith('??')).length,
      stashCount: 0
    };
  }

  private parseBranches(branchOutput: string): GitBranch[] {
    return branchOutput
      .split('\n')
      .filter(line => line.trim())
      .map(line => {
        const isActive = line.startsWith('* ');
        const name = line.replace('* ', '').trim();
        
        return {
          name,
          isActive,
          isDefault: name === 'main' || name === 'master',
          ahead: 0,
          behind: 0
        };
      });
  }

  private parseWorktrees(worktreeOutput: string): GitWorktree[] {
    const worktrees: GitWorktree[] = [];
    const lines = worktreeOutput.split('\n').filter(line => line.trim());
    
    for (let i = 0; i < lines.length; i += 3) {
      if (i + 2 < lines.length) {
        const path = lines[i];
        const branch = lines[i + 2].replace('branch refs/heads/', '');
        
        worktrees.push({
          path,
          branch,
          isMain: i === 0,
          isBare: lines[i + 1].includes('bare')
        });
      }
    }
    
    return worktrees;
  }

  private parseRemotes(remoteOutput: string): GitRemote[] {
    return remoteOutput
      .split('\n')
      .filter(line => line.trim())
      .map(line => {
        const [name, url, type] = line.split('\t');
        return {
          name,
          url,
          type: type?.includes('push') ? 'push' : 'fetch'
        };
      });
  }

  private parseFileChanges(statusOutput: string): GitFileChange[] {
    return statusOutput
      .split('\n')
      .filter(line => line.trim())
      .map(line => {
        const indexStatus = line.charAt(0);
        const workTreeStatus = line.charAt(1);
        const path = line.substring(3);
        
        // Determine if staged based on index status
        const staged = indexStatus !== ' ' && indexStatus !== '?';
        
        // Determine status based on git porcelain format
        let status: GitFileChange['status'];
        if (indexStatus === 'A' || workTreeStatus === 'A') {
          status = 'added';
        } else if (indexStatus === 'D' || workTreeStatus === 'D') {
          status = 'deleted';
        } else if (indexStatus === 'R' || workTreeStatus === 'R') {
          status = 'renamed';
        } else if (indexStatus === 'C' || workTreeStatus === 'C') {
          status = 'copied';
        } else if (line.startsWith('??')) {
          status = 'untracked';
        } else {
          status = 'modified';
        }
        
        return {
          path,
          status,
          staged
        };
      });
  }

  private parseCommits(logOutput: string): GitCommit[] {
    // Parse git log --oneline format: "shortHash message"
    // or git log --pretty=format:"%h|%s|%an|%ad" --date=short format
    return logOutput
      .split('\n')
      .filter(line => line.trim())
      .map(line => {
        const parts = line.split('|');
        if (parts.length >= 4) {
          // Detailed format with hash|message|author|date
          return {
            shortHash: parts[0],
            hash: parts[0], // We don't have full hash in --oneline format
            message: parts[1],
            author: parts[2],
            date: parts[3]
          };
        } else {
          // Simple --oneline format: "shortHash message"
          const spaceIndex = line.indexOf(' ');
          const shortHash = line.substring(0, spaceIndex);
          const message = line.substring(spaceIndex + 1);
          return {
            shortHash,
            hash: shortHash,
            message,
            author: 'Unknown',
            date: 'Unknown'
          };
        }
      });
  }

  async getRepoStatus(projectPath: string): Promise<GitOperationResult<GitStatus>> {
    try {
      // Check if it's a git repository first
      await this.executeGitCommand(projectPath, ['rev-parse', '--git-dir']);
      
      const statusOutput = await this.executeGitCommand(projectPath, ['status', '--porcelain']);
      const branchOutput = await this.executeGitCommand(projectPath, ['branch', '-a']);
      const worktreeOutput = await this.executeGitCommand(projectPath, ['worktree', 'list', '--porcelain']);
      
      const branches = this.parseBranches(branchOutput);
      const worktrees = this.parseWorktrees(worktreeOutput);
      const status = this.parseGitStatus(statusOutput, projectPath);
      const fileChanges = this.parseFileChanges(statusOutput);
      
      const fullStatus: GitStatus = {
        ...status,
        branches,
        worktrees,
        fileChanges
      };
      
      return { success: true, data: fullStatus };
    } catch (error) {
      // If the directory is not a git repository, return a non-repo status
      if (error instanceof Error && error.message.includes('not a git repository')) {
        return {
          success: true,
          data: {
            isRepository: false,
            branches: [],
            worktrees: [],
            hasUncommittedChanges: false,
            stagedFiles: 0,
            unstagedFiles: 0,
            untrackedFiles: 0,
            stashCount: 0
          }
        };
      }
      
      return {
        success: false,
        error: `Failed to get repository status: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  async getFileChanges(projectPath: string): Promise<GitOperationResult<GitFileChange[]>> {
    try {
      const statusOutput = await this.executeGitCommand(projectPath, ['status', '--porcelain']);
      const fileChanges = this.parseFileChanges(statusOutput);
      return { success: true, data: fileChanges };
    } catch (error) {
      return {
        success: false,
        error: `Failed to get file changes: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  async getRecentCommits(projectPath: string, limit = 5): Promise<GitOperationResult<GitCommit[]>> {
    try {
      // Use detailed format for better information
      const logOutput = await this.executeGitCommand(projectPath, [
        'log',
        '--pretty=format:%h|%s|%an|%ad',
        '--date=short',
        `-${limit}`
      ]);
      const commits = this.parseCommits(logOutput);
      return { success: true, data: commits };
    } catch (error) {
      return {
        success: false,
        error: `Failed to get recent commits: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  async getBranches(projectPath: string): Promise<GitOperationResult<GitBranch[]>> {
    try {
      const output = await this.executeGitCommand(projectPath, ['branch', '-a', '-v']);
      const branches = this.parseBranches(output);
      return { success: true, data: branches };
    } catch (error) {
      return {
        success: false,
        error: `Failed to get branches: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  async getWorktrees(projectPath: string): Promise<GitOperationResult<GitWorktree[]>> {
    try {
      const output = await this.executeGitCommand(projectPath, ['worktree', 'list', '--porcelain']);
      const worktrees = this.parseWorktrees(output);
      return { success: true, data: worktrees };
    } catch (error) {
      return {
        success: false,
        error: `Failed to get worktrees: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  async getRemotes(projectPath: string): Promise<GitOperationResult<GitRemote[]>> {
    try {
      const output = await this.executeGitCommand(projectPath, ['remote', '-v']);
      const remotes = this.parseRemotes(output);
      return { success: true, data: remotes };
    } catch (error) {
      return {
        success: false,
        error: `Failed to get remotes: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  async createBranch(projectPath: string, branchName: string): Promise<GitOperationResult<void>> {
    try {
      await this.executeGitCommand(projectPath, ['checkout', '-b', branchName]);
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
      await this.executeGitCommand(projectPath, ['checkout', branchName]);
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
      await this.executeGitCommand(projectPath, ['branch', '-d', branchName]);
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
      const command = ['worktree', 'add', worktreePath];
      if (branchName) {
        command.push(branchName);
      }
      await this.executeGitCommand(projectPath, command);
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
      await this.executeGitCommand(projectPath, ['worktree', 'remove', worktreePath]);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: `Failed to remove worktree: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
}