import type { FilesystemAdapter } from './types';
import { ApiFilesystemAdapter } from './ApiFilesystemAdapter';
import { ClientFilesystemAdapter } from './ClientFilesystemAdapter';

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

// Factory function to create appropriate filesystem adapter
export function createFilesystemAdapter(): FilesystemAdapter {
  if (isNativeEnvironment()) {
    return new ClientFilesystemAdapter();
  } else {
    return new ApiFilesystemAdapter();
  }
}

// Singleton instance for easy access
let adapterInstance: FilesystemAdapter | null = null;

export function getFilesystemAdapter(): FilesystemAdapter {
  if (!adapterInstance) {
    adapterInstance = createFilesystemAdapter();
  }
  return adapterInstance;
}

// Export types for convenience
export type { 
  FilesystemAdapter, 
  FileSystemItem, 
  Project, 
  FileContent, 
  WriteFileOptions, 
  FilesystemOperationResult,
  WorkspaceSettings 
} from './types';