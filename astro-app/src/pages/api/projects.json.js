import fs from 'fs/promises';
import path from 'path';
import { DEFAULT_WORKSPACE_SETTINGS, SETTINGS, SettingsUtils } from '../../config/settings.ts';

const WORKSPACE_PATH = process.env.WORKSPACE_PATH || SETTINGS.DEFAULT_WORKSPACE_PATH;

async function getProjectStatus(projectPath) {
  try {
    // Check for common indicators of active projects
    const packageJsonPath = path.join(projectPath, 'package.json');
    const gitPath = path.join(projectPath, '.git');
    const cargoTomlPath = path.join(projectPath, 'Cargo.toml');
    const requirementsPath = path.join(projectPath, 'requirements.txt');
    
    const [packageJsonExists, gitExists, cargoExists, requirementsExists] = await Promise.all([
      fs.access(packageJsonPath).then(() => true).catch(() => false),
      fs.access(gitPath).then(() => true).catch(() => false),
      fs.access(cargoTomlPath).then(() => true).catch(() => false),
      fs.access(requirementsPath).then(() => true).catch(() => false),
    ]);

    // Consider project active if it has development files or git
    const isActive = packageJsonExists || gitExists || cargoExists || requirementsExists;
    
    return isActive ? 'active' : 'inactive';
  } catch (error) {
    return 'inactive';
  }
}

async function getProjectStats(projectPath) {
  try {
    const stats = await fs.stat(projectPath);
    return {
      lastModified: stats.mtime.toISOString().split('T')[0], // Format as YYYY-MM-DD
      size: stats.size
    };
  } catch (error) {
    return {
      lastModified: new Date().toISOString().split('T')[0],
      size: 0
    };
  }
}

async function countProjectTasks(projectPath) {
  try {
    // Look for common task/todo files
    const taskFiles = [
      'TODO.md',
      'TODO.txt', 
      'TASKS.md',
      'ROADMAP.md',
      '.claude/todos.json'
    ];
    
    let taskCount = 0;
    
    for (const taskFile of taskFiles) {
      const taskFilePath = path.join(projectPath, taskFile);
      try {
        const content = await fs.readFile(taskFilePath, 'utf8');
        // Simple heuristic: count lines that look like tasks
        const lines = content.split('\n');
        const taskLines = lines.filter(line => 
          line.trim().match(/^[-*+]\s/) || // bullet points
          line.trim().match(/^\d+\.\s/) || // numbered lists
          line.trim().match(/^TODO:/i) ||  // TODO: items
          line.trim().match(/^\[\s*\]\s/) || // unchecked checkboxes
          line.trim().match(/^\[x\]\s/i)     // checked checkboxes
        );
        taskCount += taskLines.length;
      } catch (error) {
        // File doesn't exist or can't be read, skip it
        continue;
      }
    }
    
    return taskCount;
  } catch (error) {
    return 0;
  }
}

export async function GET({ url }) {
  try {
    const entries = await fs.readdir(WORKSPACE_PATH, { withFileTypes: true });
    const projects = [];

    for (const entry of entries) {
      // Only include directories
      if (!entry.isDirectory()) continue;

      // Skip directories that match ignore patterns
      if (SettingsUtils.shouldIgnoreFile(entry.name, DEFAULT_WORKSPACE_SETTINGS.ignorePatterns)) {
        continue;
      }

      const projectPath = path.join(WORKSPACE_PATH, entry.name);
      
      try {
        // Get project metadata in parallel
        const [status, stats, taskCount] = await Promise.all([
          getProjectStatus(projectPath),
          getProjectStats(projectPath),
          countProjectTasks(projectPath)
        ]);

        projects.push({
          name: entry.name,
          path: `~${projectPath.replace(process.env.HOME || '', '')}`,
          lastModified: stats.lastModified,
          status,
          taskCount
        });
      } catch (error) {
        console.warn(`Error processing project ${entry.name}:`, error.message);
        continue;
      }
    }

    // Sort projects by last modified date (newest first)
    projects.sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified));

    return new Response(JSON.stringify({
      projects,
      metadata: {
        workspace: WORKSPACE_PATH,
        projectCount: projects.length,
        generated: new Date().toISOString()
      }
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    console.error('Error listing projects:', error);
    
    return new Response(JSON.stringify({ 
      error: 'Failed to list projects',
      details: error.message,
      projects: []
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
}