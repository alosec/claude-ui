import type { FilesystemAdapter } from './types';
import { ApiFilesystemAdapter } from './ApiFilesystemAdapter';
import { ClientFilesystemAdapter } from './ClientFilesystemAdapter';
import { MockFilesystemAdapter } from './MockFilesystemAdapter';
import { EnvironmentDetector } from './EnvironmentDetector';
import { DeploymentManager } from '../config/deployment';

// Factory function to create appropriate filesystem adapter
export async function createFilesystemAdapter(): Promise<FilesystemAdapter> {
  const deploymentConfig = DeploymentManager.getConfig();
  
  console.info(`🌍 Creating filesystem adapter for ${deploymentConfig.target} deployment`);

  // If running in native environment (Electron/Tauri), use client adapter
  if (EnvironmentDetector.isNativeEnvironment()) {
    console.info('Native environment detected, using client filesystem');
    return new ClientFilesystemAdapter();
  }

  // For Cloudflare deployment, use mock data by default
  if (deploymentConfig.target === 'cloudflare') {
    if (deploymentConfig.useMockData) {
      console.info('Cloudflare deployment with mock data enabled');
      return new MockFilesystemAdapter();
    } else {
      // In future, we could support Cloudflare D1 or R2 for data storage
      console.info('Cloudflare deployment - falling back to mock data');
      return new MockFilesystemAdapter();
    }
  }

  // For VPS deployment, test API availability
  if (deploymentConfig.useFilesystemAPI) {
    const isApiAvailable = await EnvironmentDetector.testApiAvailability();
    
    if (isApiAvailable) {
      console.info('VPS deployment - API endpoints available');
      return new ApiFilesystemAdapter();
    } else {
      console.warn('VPS deployment - API endpoints unavailable, falling back to demo mode');
      return new MockFilesystemAdapter();
    }
  }

  // Default fallback
  console.info('Using demo mode as fallback');
  return new MockFilesystemAdapter();
}

// Synchronous factory for backward compatibility
export function createFilesystemAdapterSync(): FilesystemAdapter {
  const deploymentConfig = DeploymentManager.getConfig();
  
  if (EnvironmentDetector.isNativeEnvironment()) {
    return new ClientFilesystemAdapter();
  } else if (deploymentConfig.target === 'cloudflare' || deploymentConfig.useMockData) {
    return new MockFilesystemAdapter();
  } else {
    // Default to API adapter for VPS deployment, will fail gracefully if needed
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
  DeploymentManager.reset();
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