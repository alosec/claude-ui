# Deployment Configuration

This application supports flexible deployment configurations for different hosting environments.

## Supported Deployment Targets

### 1. VPS Deployment (Default)
For traditional VPS hosting with full filesystem access.

```bash
npm run build:vps
npm run preview
```

**Features:**
- Full filesystem API access
- Git integration
- Real project browsing
- File editing capabilities

**Environment:**
- Uses Node.js adapter
- Requires filesystem permissions
- Best for self-hosted environments

### 2. Cloudflare Pages Deployment
For serverless deployment on Cloudflare Pages.

```bash
npm run build:cloudflare
```

**Features:**
- Mock data for demonstration
- Static asset optimization
- Global CDN distribution
- Zero configuration deployment

**Environment:**
- Uses Cloudflare adapter
- Fallback to demo mode
- Optimized for static hosting

## Configuration

The deployment configuration is automatically detected based on environment variables:

- `CF_PAGES=1` - Enables Cloudflare deployment mode
- `CLOUDFLARE_WORKERS=1` - Enables Cloudflare Workers mode
- `NODE_ENV=development` - Enables development mode

### Manual Configuration Override

You can manually configure the deployment target:

```javascript
import { DeploymentManager } from './src/config/deployment';

// Override deployment configuration
DeploymentManager.setConfig({
  target: 'cloudflare',
  useMockData: true,
  useFilesystemAPI: false
});
```

## Development

For development, the application automatically uses the Node adapter:

```bash
npm run dev
```

This provides the full filesystem API for local development and testing.

## Environment Detection

The application includes intelligent environment detection:

- **Native environments** (Electron/Tauri): Use client-side filesystem access
- **Cloudflare deployment**: Use mock data and optimized static serving  
- **VPS deployment**: Use server-side filesystem APIs
- **Development**: Use Node.js with full filesystem access

## Build Scripts

| Script | Description | Use Case |
|--------|-------------|----------|
| `npm run build` | Default build (VPS mode) | Production VPS deployment |
| `npm run build:vps` | Explicit VPS build | VPS/dedicated server |
| `npm run build:cloudflare` | Cloudflare optimized build | Cloudflare Pages deployment |

The build output will automatically configure the appropriate adapter and feature set for each deployment target.