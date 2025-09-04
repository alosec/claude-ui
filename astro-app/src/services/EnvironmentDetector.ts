/**
 * Environment detection service to determine the runtime environment
 * and whether filesystem APIs are available.
 */
export class EnvironmentDetector {
  private static _isNativeEnvironment: boolean | null = null;
  private static _isApiAvailable: boolean | null = null;
  private static _isStaticHosting: boolean | null = null;

  /**
   * Check if running in a native environment (Electron/Tauri)
   */
  static isNativeEnvironment(): boolean {
    if (this._isNativeEnvironment !== null) {
      return this._isNativeEnvironment;
    }

    if (typeof window === 'undefined') {
      this._isNativeEnvironment = false;
      return false;
    }

    // Check for Electron
    const isElectron = 'electron' in window;
    
    // Check for Tauri
    const isTauri = '__TAURI__' in window;
    
    this._isNativeEnvironment = isElectron || isTauri;
    return this._isNativeEnvironment;
  }

  /**
   * Check if we're likely running on static hosting (like Cloudflare Pages)
   * where server-side APIs aren't available
   */
  static isStaticHosting(): boolean {
    if (this._isStaticHosting !== null) {
      return this._isStaticHosting;
    }

    if (typeof window === 'undefined') {
      // Server-side, assume we have API capabilities
      this._isStaticHosting = false;
      return false;
    }

    // Check for common static hosting indicators
    const hostname = window.location.hostname;
    const staticHostingPatterns = [
      /\.pages\.dev$/,          // Cloudflare Pages
      /\.netlify\.app$/,        // Netlify
      /\.vercel\.app$/,         // Vercel
      /\.github\.io$/,          // GitHub Pages
      /\.surge\.sh$/,           // Surge
      /\.firebase\.app$/,       // Firebase Hosting
    ];

    this._isStaticHosting = staticHostingPatterns.some(pattern => 
      pattern.test(hostname)
    );

    return this._isStaticHosting;
  }

  /**
   * Test if the filesystem API endpoints are available and working
   */
  static async testApiAvailability(): Promise<boolean> {
    // If we already tested, return cached result
    if (this._isApiAvailable !== null) {
      return this._isApiAvailable;
    }

    // If we're in a native environment, APIs should work
    if (this.isNativeEnvironment()) {
      this._isApiAvailable = true;
      return true;
    }

    // If we're likely on static hosting, don't even try
    if (this.isStaticHosting()) {
      this._isApiAvailable = false;
      return false;
    }

    try {
      // Try a quick test request to the projects API
      const response = await fetch('/api/projects.json', {
        method: 'GET',
        // Use a short timeout to fail fast
        signal: AbortSignal.timeout(3000)
      });

      this._isApiAvailable = response.ok;
      return this._isApiAvailable;
    } catch (error) {
      // Any error means API is not available
      this._isApiAvailable = false;
      return false;
    }
  }

  /**
   * Reset cached values - useful for testing
   */
  static reset(): void {
    this._isNativeEnvironment = null;
    this._isApiAvailable = null;
    this._isStaticHosting = null;
  }

  /**
   * Get environment info for debugging
   */
  static getEnvironmentInfo(): {
    isNativeEnvironment: boolean;
    isStaticHosting: boolean;
    isApiAvailable: boolean | null;
    userAgent: string;
    hostname: string;
  } {
    return {
      isNativeEnvironment: this.isNativeEnvironment(),
      isStaticHosting: this.isStaticHosting(),
      isApiAvailable: this._isApiAvailable,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'N/A',
      hostname: typeof window !== 'undefined' ? window.location.hostname : 'N/A'
    };
  }
}