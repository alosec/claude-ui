# Claude UI - React App

A modern React-based development interface for Claude Code featuring table-based project and task management.

## Features

- **Projects Table**: View all projects with status, last modified dates, and task counts
- **Project View**: Detailed view with task management and file tree navigation
- **Table-Based UI**: Clean, compact interface optimized for development workflows
- **File Tree**: Visual representation of project structure
- **Task Management**: Track development tasks with status indicators

## Tech Stack

- **React 18** with TypeScript
- **Vite** for fast development and building
- **React Router** for navigation
- **Playwright** for comprehensive testing

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

## Project Structure

```
src/
├── components/           # Reusable UI components
├── pages/               # Main application pages
├── types/               # TypeScript type definitions
├── hooks/               # Custom React hooks (future)
└── main.tsx            # Application entry point
```

## Testing

Comprehensive Playwright test suite covering:
- UI interaction testing
- Navigation flows  
- Table functionality
- Project management workflows

```bash
# Run all tests
npm test

# Run tests with UI
npm run test:ui

# Debug tests
npm run test:debug
```

## Architecture

This app is designed as a clean, table-based interface that moves away from traditional chat threading toward visual development management. Key design principles:

- **Compact & Printable**: Crystal clear representation of development work
- **Table-Centric**: Projects as tables, tasks as tables, code as trees
- **Multiple UI Paradigms**: Flexible interface supporting different development workflows
- **Claude Code Integration**: Built specifically for Claude Code development workflows

## Future Plans

- Integration with actual Claude Code API
- Real-time project monitoring
- Advanced file editing capabilities  
- Electron desktop app packaging
- Enhanced task automation features