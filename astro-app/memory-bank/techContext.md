# Tech Context: Astro-React Hybrid Stack

## Core Technologies
- **Astro 5.13.5**: Meta-framework for SSR/SSG with component islands
- **React 19.1.1**: UI library for interactive components  
- **TypeScript**: Type safety across the application
- **React Router 6.30**: Client-side routing within React app
- **Electron 38.0**: Desktop application wrapper

## Build & Development
- **Node.js**: ESM module system (`"type": "module"`)
- **Astro Node Adapter**: Server-side rendering in standalone mode
- **Playwright**: E2E testing for both web and Electron versions
- **Electron Builder**: Desktop application packaging

## Architecture Patterns
- **Islands Architecture**: Astro pages with hydrated React components
- **Client-Only Hydration**: React app using `client:only="react"`
- **Component Scoping**: Modular CSS with component-level styles
- **Context API**: Theme management with React Context

## Development Commands
```bash
# Development
npm run dev              # Astro dev server (default port 4321)
npm run dev:4321         # Explicit port 4321
npm run dev:8081         # Alternative port 8081

# Build & Deploy
npm run build            # Astro production build
npm run preview          # Preview production build
npm run dist             # Build + Electron packaging

# Testing
npm run test             # Playwright web tests
npm run test:electron    # Electron-specific tests
npm run test:headed      # Browser visible tests

# Electron
npm run electron         # Launch Electron app
npm run electron-dev     # Development mode Electron
```

## File Structure Conventions
- **Astro Pages**: `.astro` files in `src/pages/`
- **React Components**: `.tsx` files in `src/components/`  
- **Types**: Shared TypeScript types in `src/types/`
- **Contexts**: React contexts in `src/contexts/`
- **Styles**: CSS files in `src/styles/` (global) and component-scoped

## Configuration Files
- `astro.config.mjs`: Astro + React integration, Node adapter
- `tsconfig.json`: TypeScript configuration
- `package.json`: Dependencies and scripts
- `electron.cjs`: Electron main process
- `playwright.config.ts`: Testing configuration