# Active Context: Astro-React Hybrid Application

## Current Status
**OPERATIONAL**: Astro application successfully running with React components integrated and functioning correctly.

## What's Currently Working
✅ Astro dev server running on localhost:4321 (default)  
✅ React components hydrating properly with `client:only="react"`  
✅ React Router navigation functional within Astro framework  
✅ Theme switching working with persistent state  
✅ Project table displaying data correctly  
✅ File tree component rendering project structures  
✅ TypeScript compilation working across Astro and React files  
✅ CSS modular architecture with component-scoped styles  
✅ Electron integration configured and ready

## Architecture Overview
- **Framework**: Astro 5.13.5 with React integration
- **Routing**: React Router (client-side) within Astro pages
- **Styling**: Component-scoped CSS with global theme system
- **State**: React Context API for theme management
- **Build**: Astro's optimized bundling with React hydration

## Component Structure
```
src/
├── components/
│   ├── App.tsx (main React app entry)
│   ├── Layout/ (React layout components)
│   ├── Header/ (navigation and theme toggle)
│   ├── ProjectsTable/ (project listing)
│   ├── ProjectView/ (project detail view)
│   └── FileTree/ (file browser)
├── contexts/ThemeContext.tsx
├── pages/index.astro (Astro page wrapper)
└── styles/ (global CSS and themes)
```

## Development Environment
- **Dev Server**: `npm run dev` (port 4321)  
- **Alternative Ports**: Available via start-dev scripts for 8081/4321
- **Testing**: Playwright configured for both web and Electron
- **Build**: Astro build with Electron packaging

## Next Steps
Application is fully functional and ready for further feature development or deployment.