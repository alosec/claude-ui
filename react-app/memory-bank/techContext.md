# Tech Stack: Multi-Environment Foundation

## Core Technologies
- **Astro 5.13.5**: Meta-framework for multi-environment deployment
- **React 19.1.1** + **TypeScript**: Component architecture and type safety
- **React Router 6.30.1**: Client-side navigation within Astro
- **Node.js Adapter**: Server-side rendering and API endpoints

## Progressive Web App
- **@vite-pwa/astro 1.1.0**: Service worker and installability
- **Manifest**: App installation with icons and branding
- **Offline Capability**: Local filesystem operations cached

## Desktop Applications  
- **Electron 38.0.0**: Native desktop app wrapper
- **Electron Builder 26.0.12**: Distribution and packaging

## Development & Testing
- **Playwright 1.55.0**: End-to-end testing for web and Electron
- **playwright-electron 0.5.0**: Native Electron testing support

## Architecture Services
- **Filesystem Adapters**: Environment-aware file operations
- **Authentication Middleware**: Password protection for production
- **Component-Scoped CSS**: Modular styling architecture

## Development Commands
```bash
# Development servers
npm run dev              # Standard Astro dev (port 4321)
npm run dev:4321         # Explicit port 4321
npm run dev:8081         # Custom port 8081 with host binding

# Production builds
npm run build            # Web/PWA build
npm run build-electron   # Desktop app build
npm run dist            # Distribution build

# Testing
npm run test            # Playwright web tests
npm run test:electron   # Electron app tests
npm run test:headed     # Visual test execution
npm run test:ui         # Playwright test UI

# Electron
npm run electron-dev    # Development Electron app
```

## File Structure
```
src/
├── components/         # React components with scoped CSS
├── services/          # Filesystem adapters and business logic
├── config/           # Application configuration
├── contexts/         # React context providers
├── styles/           # Global styles and themes
└── pages/            # Astro pages and API endpoints
```

## API Endpoints
- `/api/projects.json` - Project discovery and listing
- `/api/project-tree.json` - File tree generation
- `/api/project-files.json` - File content operations
- `/api/workspace-settings.json` - Configuration management

## Future LLM Integration Stack
- **Claude/OpenAI APIs**: Specification processing and code generation
- **Streaming Responses**: Real-time code generation feedback
- **Token Management**: Efficient LLM request optimization
- **Validation Services**: Generated code quality assurance