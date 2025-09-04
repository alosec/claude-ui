import type { FilesystemAdapter } from './types';
import { ApiFilesystemAdapter } from './ApiFilesystemAdapter';
import { ClientFilesystemAdapter } from './ClientFilesystemAdapter';
import { MockFilesystemAdapter } from './MockFilesystemAdapter';
import { EnvironmentDetector } from './EnvironmentDetector';

// Factory function to create appropriate filesystem adapter
export async function createFilesystemAdapter(): Promise<FilesystemAdapter> {
  // If running in native environment (Electron/Tauri), use client adapter
  if (EnvironmentDetector.isNativeEnvironment()) {
    return new ClientFilesystemAdapter();
  }

  // If we're on static hosting, go straight to mock adapter
  if (EnvironmentDetector.isStaticHosting()) {
    console.info('Static hosting detected, using demo mode');
    return new MockFilesystemAdapter();
  }

  // Test if API endpoints are available
  const isApiAvailable = await EnvironmentDetector.testApiAvailability();
  
  if (isApiAvailable) {
    console.info('API endpoints available, using server filesystem');
    return new ApiFilesystemAdapter();
  } else {
    console.info('API endpoints unavailable, falling back to demo mode');
    return new MockFilesystemAdapter();
  }
}

// Synchronous factory for backward compatibility
export function createFilesystemAdapterSync(): FilesystemAdapter {
  if (EnvironmentDetector.isNativeEnvironment()) {
    return new ClientFilesystemAdapter();
  } else if (EnvironmentDetector.isStaticHosting()) {
    return new MockFilesystemAdapter();
  } else {
    // Default to API adapter, will fail gracefully if needed
    return new ApiFilesystemAdapter();
  }
}

// Singleton instance for easy access
let adapterInstance: FilesystemAdapter | null = null;
let adapterPromise: Promise<FilesystemAdapter> | null = null;

export async function getFilesystemAdapter(): Promise<FilesystemAdapter> {
  if (adapterInstance) {
    return adapterInstance;
  }

  if (!adapterPromise) {
    adapterPromise = createFilesystemAdapter();
  }

  adapterInstance = await adapterPromise;
  return adapterInstance;
}

// Synchronous version for components that need immediate access
export function getFilesystemAdapterSync(): FilesystemAdapter {
  if (adapterInstance) {
    return adapterInstance;
  }
  
  // Create synchronously - might not have proper fallback detection
  adapterInstance = createFilesystemAdapterSync();
  return adapterInstance;
}

// Helper to check if we're in demo mode
export async function isDemoMode(): Promise<boolean> {
  const adapter = await getFilesystemAdapter();
  return 'isDemoMode' in adapter && (adapter as any).isDemoMode;
}

// Reset adapter instance - useful for testing or environment changes
export function resetFilesystemAdapter(): void {
  adapterInstance = null;
  adapterPromise = null;
  EnvironmentDetector.reset();
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