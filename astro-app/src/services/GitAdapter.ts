import type { GitAdapter } from './types';
import { ApiGitAdapter } from './ApiGitAdapter';
import { ClientGitAdapter } from './ClientGitAdapter';

// Environment detection
function isElectron(): boolean {
  return typeof window !== 'undefined' && 'electron' in window;
}

function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI__' in window;
}

function isNativeEnvironment(): boolean {
  return isElectron() || isTauri();
}

// Factory function to create appropriate git adapter
export function createGitAdapter(): GitAdapter {
  if (isNativeEnvironment()) {
    return new ClientGitAdapter();
  } else {
    return new ApiGitAdapter();
  }
}

// Singleton instance for easy access
let adapterInstance: GitAdapter | null = null;

export function getGitAdapter(): GitAdapter {
  if (!adapterInstance) {
    adapterInstance = createGitAdapter();
  }
  return adapterInstance;
}

// Export types for convenience
export type { 
  GitAdapter, 
  GitBranch, 
  GitWorktree, 
  GitStatus, 
  GitRemote, 
  GitOperationResult 
} from './types';