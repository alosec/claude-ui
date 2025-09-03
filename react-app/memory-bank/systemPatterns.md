# System Patterns: Multi-Environment Architecture

## Architecture Philosophy

The system employs a **multi-environment deployment strategy** with shared React components, enabling deployment as:
- **Web Application**: Standard browser-based app
- **Progressive Web App**: Installable with offline capabilities  
- **Electron Desktop App**: Native desktop application
- **Future**: Tauri-based native app

## Core Architectural Patterns

### 1. **Environment Detection Pattern**
```typescript
// Automatic environment detection
const adapter = FilesystemAdapter.create()
// Returns different implementations based on environment
```

**Implementation**: `src/services/FilesystemAdapter.ts`
- Factory pattern detects runtime environment
- Web: Routes filesystem operations through HTTP APIs
- Native: Direct filesystem access via Node.js/Electron APIs

### 2. **Unified API Interface Pattern**
```typescript
interface IFilesystemAdapter {
  listProjects(): Promise<Project[]>
  readFileTree(projectPath: string): Promise<FileNode[]>
  readFileContent(filePath: string): Promise<string>
}
```

**Benefits**:
- Identical interface across all environments
- Components don't know about deployment differences
- Easy testing with mock implementations

### 3. **Component-Scoped CSS Architecture**
**Pattern**: Each component has its own CSS file imported directly
```typescript
// ProjectsTable.tsx
import './ProjectsTable.css'
```

**Files**:
- `src/styles/global.css` - Global styles and CSS variables
- `src/styles/themes.css` - Theme definitions (light/dark)  
- `src/components/*/*.css` - Component-specific styles

### 4. **React Router Integration Pattern**
**Implementation**: Astro serves as wrapper, React Router handles all navigation
```typescript
// App.tsx - Main routing logic
<Router>
  <Routes>
    <Route path="/" element={<ProjectsTable />} />
    <Route path="/project/:encodedPath" element={<ProjectView />} />
  </Routes>
</Router>
```

### 5. **Authentication Middleware Pattern**
**File**: `src/middleware.ts`
- Password protection for production deployment
- Bypass in development mode
- Session-based authentication

### 6. **Progressive Web App Pattern**
**Configuration**: `astro.config.mjs`
- Service worker for offline capability
- App manifest for installation
- Icon generation for different platforms

## Data Flow Patterns

### Project Data Flow
```
FilesystemAdapter → API Endpoints → React Components
                 ↘                ↗
                   Component State
```

### File Operations Flow
```
User Action → Component → FilesystemAdapter → File System
           ↓                                     ↓
         UI Update ←←←←←← State Update ←←←←← Response
```

## Security Patterns

### Workspace Sandboxing
- All file operations constrained to configured workspace directory
- Path validation prevents directory traversal attacks
- Ignore patterns exclude sensitive files (.env, .git, etc.)

### Authentication Layer  
- Simple password protection for production deployments
- Session management with secure headers
- Development mode bypass for local development

## Performance Patterns

### Lazy Loading
- File content loaded on demand (not preloaded)
- Directory expansion loads children only when requested
- Large file size limits prevent memory issues

### Efficient File Tree Generation
- Depth limits prevent infinite recursion
- Ignore patterns reduce processing overhead
- Metadata fetching optimized for common use cases

## Testing Patterns

### Environment-Specific Tests
- Web tests via Playwright browser automation
- Electron tests via Playwright Electron integration
- API endpoint tests for filesystem operations
- Component integration tests

### Mock Service Pattern
- Filesystem adapter easily mocked for testing
- Consistent interface enables reliable test doubles
- Separation of concerns allows isolated component testing

## Deployment Patterns

### Multi-Build Strategy
```bash
# Web deployment
npm run build

# Electron desktop app  
npm run build-electron

# PWA with service worker
npm run build # (includes PWA automatically)
```

### Development Server Flexibility
- `npm run dev:4321` - Standard Astro dev server
- `npm run dev:8081` - Custom port with host binding
- Hot reload and HMR across all environments

This architecture enables the vision of a **specification-driven development environment** by providing:
- **Flexible Deployment**: Specs can be authored in any environment
- **Real Filesystem Access**: Essential for analyzing existing codebases
- **Extensible Services**: Easy to add new filesystem operations
- **Cross-Platform Reach**: Same tools work everywhere developers work