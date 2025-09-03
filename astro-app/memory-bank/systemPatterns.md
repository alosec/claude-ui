# System Patterns: Astro-React Architecture

## Core Architecture Pattern
**Astro Islands with React Hydration**: Astro provides the static shell and meta-framework capabilities while React handles all interactive UI components.

```
Astro Page (SSR/SSG) → React App (client:only) → React Router → Components
```

## Component Architecture

### Layout Pattern
- **Astro Layout**: `Layout.astro` provides HTML structure, global styles, theme scripts
- **React Layout**: `Layout/Layout.tsx` handles React-specific layout concerns
- **Separation**: Astro handles document structure, React handles application logic

### Hydration Strategy
```astro
<App client:only="react" />
```
- Single hydration point at the App component level
- All React functionality contained within this boundary
- Avoids hydration mismatches by using client-only rendering

## Routing Architecture

### Dual Routing System
1. **Astro File-based Routing**: Controls page-level routing (`src/pages/`)
2. **React Router**: Handles client-side navigation within the React app

### Pattern Implementation
```typescript
// Astro page serves as entry point
// React Router takes over for SPA navigation
<BrowserRouter>
  <Routes>
    <Route path="/" element={<ProjectsTable />} />
    <Route path="/project/:projectName" element={<ProjectView />} />
  </Routes>
</BrowserRouter>
```

## State Management Patterns

### Theme Management
- **Context Provider**: Wraps entire React application
- **Persistence**: Uses localStorage for theme state
- **Hydration Safety**: Handles SSR/client mismatch gracefully

### Component Communication
- **Props Down**: Data flows down through component hierarchy
- **Context for Cross-cutting**: Theme state available globally
- **Local State**: Component-specific state managed locally

## Styling Architecture

### Multi-layer CSS System
1. **Global Styles**: `src/styles/global.css` - base styles, resets
2. **Theme System**: `src/styles/theme.css` - CSS custom properties
3. **Component Scoped**: Component-level `<style>` blocks in Astro
4. **React Inline**: Component-specific styles in React components

### Theme Pattern
```css
[data-theme="light"] { --bg: white; --text: black; }
[data-theme="dark"] { --bg: black; --text: white; }
```

## File Organization Patterns

### Component Structure
```
components/
├── ComponentName/
│   ├── ComponentName.tsx    # Main component
│   └── ComponentName.css    # Component styles (if needed)
```

### Type Organization
- **Inline Types**: Component-specific types defined within component files
- **Shared Types**: Common types in `src/types/index.ts`
- **Avoids Import Issues**: Prevents Astro hydration type resolution problems

## Build & Deployment Patterns

### Dual Target Architecture
- **Web Deployment**: Astro's static/SSR build output
- **Electron Packaging**: Same build wrapped in Electron container
- **Shared Codebase**: Single source of truth for both targets

### Development Workflow
1. Develop in Astro dev server for fast iteration
2. Test in Electron during development as needed
3. Build optimizes for both web and desktop deployment