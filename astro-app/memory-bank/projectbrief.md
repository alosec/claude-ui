# Project Brief: Astro-React Hybrid Application

## Core Requirements
A modern web application built with Astro framework that incorporates React components for interactive functionality, with dual deployment capability as both web application and Electron desktop app.

## Primary Goal
Leverage Astro's SSR/SSG capabilities while maintaining React's component ecosystem for complex UI interactions, specifically for project management and file browsing functionality.

## Key Features
- Project management dashboard with table view
- File tree browsing interface for project exploration
- Theme switching (light/dark mode) functionality
- React Router navigation for SPA experience
- Electron desktop application packaging

## Architecture Decision
- Astro as the meta-framework providing SSR/SSG and build optimization
- React components for interactive UI elements (hydrated client-side)
- TypeScript for type safety throughout the application
- Component-scoped CSS architecture for styling

## Success Criteria
- Fast page loads with Astro's static generation
- Interactive React components function seamlessly
- Theme persistence across navigation
- Electron app launches and functions identically to web version
- Clean component architecture with proper separation of concerns