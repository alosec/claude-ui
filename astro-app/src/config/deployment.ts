export type DeploymentTarget = 'vps' | 'cloudflare' | 'development';

export interface DeploymentConfig {
  target: DeploymentTarget;
  adapter: 'node' | 'cloudflare';
  useFilesystemAPI: boolean;
  useMockData: boolean;
}

export class DeploymentManager {
  private static _config: DeploymentConfig | null = null;

  /**
   * Detect deployment target based on environment variables and context
   */
  static detectDeploymentTarget(): DeploymentTarget {
    // Check for Cloudflare Workers environment
    if (typeof globalThis.caches !== 'undefined' || 
        process.env.CF_PAGES === '1' || 
        process.env.CLOUDFLARE_WORKERS === '1') {
      return 'cloudflare';
    }

    // Check for development environment
    if (process.env.NODE_ENV === 'development') {
      return 'development';
    }

    // Default to VPS deployment
    return 'vps';
  }

  /**
   * Get deployment configuration based on target
   */
  static getConfig(): DeploymentConfig {
    if (this._config) {
      return this._config;
    }

    const target = this.detectDeploymentTarget();
    
    this._config = {
      target,
      adapter: target === 'cloudflare' ? 'cloudflare' : 'node',
      useFilesystemAPI: target === 'vps' || target === 'development',
      useMockData: target === 'cloudflare'
    };

    return this._config;
  }

  /**
   * Override configuration (useful for testing or manual configuration)
   */
  static setConfig(config: Partial<DeploymentConfig>): void {
    this._config = {
      ...this.getConfig(),
      ...config
    };
  }

  /**
   * Reset configuration cache
   */
  static reset(): void {
    this._config = null;
  }

  /**
   * Get environment-specific settings
   */
  static getEnvironmentSettings() {
    const config = this.getConfig();
    
    return {
      ...config,
      // Cloudflare Pages specific settings
      ...(config.target === 'cloudflare' && {
        maxRequestSize: '100MB',
        compatibilityDate: '2024-09-04',
        compatibilityFlags: ['nodejs_compat']
      }),
      
      // VPS specific settings
      ...(config.target === 'vps' && {
        port: process.env.PORT || 4321,
        host: process.env.HOST || 'localhost'
      })
    };
  }
}