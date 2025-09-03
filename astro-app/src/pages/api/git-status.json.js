import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';
import { SETTINGS } from '../../config/settings.ts';

const execAsync = promisify(exec);
const WORKSPACE_PATH = process.env.WORKSPACE_PATH || SETTINGS.DEFAULT_WORKSPACE_PATH;

async function executeCommand(command, cwd) {
  try {
    const { stdout, stderr } = await execAsync(command, { cwd, timeout: 10000 });
    return stdout.trim();
  } catch (error) {
    throw new Error(`Command failed: ${error.message}`);
  }
}

async function isGitRepository(projectPath) {
  try {
    await executeCommand('git rev-parse --git-dir', projectPath);
    return true;
  } catch (error) {
    return false;
  }
}

async function getCurrentBranch(projectPath) {
  try {
    return await executeCommand('git branch --show-current', projectPath);
  } catch (error) {
    return null;
  }
}

async function getBranches(projectPath) {
  try {
    const output = await executeCommand('git branch -a -v --format="%(refname:short)|%(HEAD)|%(upstream:trackshort)|%(subject)|%(committerdate:iso8601)"', projectPath);
    if (!output) return [];

    return output.split('\n')
      .filter(line => line.trim())
      .map(line => {
        const [name, isHead, tracking, subject, date] = line.split('|');
        const isActive = isHead === '*';
        const isDefault = name === 'main' || name === 'master' || name.includes('origin/main') || name.includes('origin/master');
        
        // Parse tracking info for ahead/behind counts
        let ahead = 0;
        let behind = 0;
        if (tracking) {
          const aheadMatch = tracking.match(/ahead (\d+)/);
          const behindMatch = tracking.match(/behind (\d+)/);
          if (aheadMatch) ahead = parseInt(aheadMatch[1]);
          if (behindMatch) behind = parseInt(behindMatch[1]);
        }

        return {
          name: name.replace('origin/', ''),
          isActive,
          isDefault,
          lastCommit: subject ? {
            message: subject,
            date: date || new Date().toISOString()
          } : null,
          ahead,
          behind
        };
      });
  } catch (error) {
    // Fall back to simple branch listing
    try {
      const output = await executeCommand('git branch -a', projectPath);
      return output.split('\n')
        .filter(line => line.trim())
        .map(line => {
          const isActive = line.startsWith('* ');
          const name = line.replace('* ', '').trim().replace('remotes/origin/', '');
          const isDefault = name === 'main' || name === 'master';
          
          return {
            name,
            isActive,
            isDefault,
            ahead: 0,
            behind: 0
          };
        });
    } catch (fallbackError) {
      return [];
    }
  }
}

async function getWorktrees(projectPath) {
  try {
    const output = await executeCommand('git worktree list --porcelain', projectPath);
    if (!output) return [];

    const worktrees = [];
    const lines = output.split('\n');
    let currentWorktree = {};

    for (const line of lines) {
      if (line.startsWith('worktree ')) {
        if (currentWorktree.path) {
          worktrees.push(currentWorktree);
        }
        currentWorktree = { path: line.replace('worktree ', '') };
      } else if (line.startsWith('HEAD ')) {
        currentWorktree.head = line.replace('HEAD ', '');
      } else if (line.startsWith('branch ')) {
        currentWorktree.branch = line.replace('branch refs/heads/', '');
      } else if (line === 'bare') {
        currentWorktree.isBare = true;
      }
    }

    if (currentWorktree.path) {
      worktrees.push(currentWorktree);
    }

    return worktrees.map((wt, index) => ({
      path: wt.path,
      branch: wt.branch || 'detached',
      isMain: index === 0,
      isBare: wt.isBare || false
    }));
  } catch (error) {
    return [];
  }
}

async function getGitStatus(projectPath) {
  try {
    const output = await executeCommand('git status --porcelain', projectPath);
    const lines = output.split('\n').filter(line => line.trim());

    const stagedFiles = lines.filter(line => line.charAt(0) !== ' ' && line.charAt(0) !== '?').length;
    const unstagedFiles = lines.filter(line => line.charAt(1) !== ' ' && line.charAt(1) !== '?').length;
    const untrackedFiles = lines.filter(line => line.startsWith('??')).length;

    return {
      hasUncommittedChanges: lines.length > 0,
      stagedFiles,
      unstagedFiles,
      untrackedFiles
    };
  } catch (error) {
    return {
      hasUncommittedChanges: false,
      stagedFiles: 0,
      unstagedFiles: 0,
      untrackedFiles: 0
    };
  }
}

async function getStashCount(projectPath) {
  try {
    const output = await executeCommand('git stash list', projectPath);
    return output ? output.split('\n').filter(line => line.trim()).length : 0;
  } catch (error) {
    return 0;
  }
}

async function getRemotes(projectPath) {
  try {
    const output = await executeCommand('git remote -v', projectPath);
    if (!output) return [];

    const remotes = [];
    const lines = output.split('\n').filter(line => line.trim());

    for (const line of lines) {
      const [name, url, type] = line.split(/\s+/);
      const cleanType = type?.replace(/[()]/g, '') || 'fetch';
      
      remotes.push({
        name,
        url,
        type: cleanType
      });
    }

    return remotes;
  } catch (error) {
    return [];
  }
}

export async function GET({ url }) {
  const searchParams = new URL(url).searchParams;
  const project = searchParams.get('project');
  const info = searchParams.get('info'); // 'branches', 'worktrees', 'remotes', or null for full status

  if (!project) {
    return new Response(JSON.stringify({ 
      error: 'Project parameter is required' 
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const projectPath = path.join(WORKSPACE_PATH, project);
    
    // Check if directory exists
    try {
      await fs.access(projectPath);
    } catch (error) {
      return new Response(JSON.stringify({ 
        error: 'Project not found',
        projectPath 
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check if it's a git repository
    const isRepo = await isGitRepository(projectPath);
    
    if (!isRepo) {
      return new Response(JSON.stringify({
        status: {
          isRepository: false,
          branches: [],
          worktrees: [],
          hasUncommittedChanges: false,
          stagedFiles: 0,
          unstagedFiles: 0,
          untrackedFiles: 0,
          stashCount: 0
        }
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Handle specific info requests
    if (info === 'branches') {
      const branches = await getBranches(projectPath);
      return new Response(JSON.stringify({ branches }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (info === 'worktrees') {
      const worktrees = await getWorktrees(projectPath);
      return new Response(JSON.stringify({ worktrees }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (info === 'remotes') {
      const remotes = await getRemotes(projectPath);
      return new Response(JSON.stringify({ remotes }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get full git status
    const [
      currentBranch,
      branches,
      worktrees,
      gitStatus,
      stashCount
    ] = await Promise.all([
      getCurrentBranch(projectPath),
      getBranches(projectPath),
      getWorktrees(projectPath),
      getGitStatus(projectPath),
      getStashCount(projectPath)
    ]);

    const status = {
      isRepository: true,
      branches,
      worktrees,
      currentBranch,
      ...gitStatus,
      stashCount
    };

    return new Response(JSON.stringify({ status }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error getting git status:', error);
    
    return new Response(JSON.stringify({ 
      error: 'Failed to get git status',
      details: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}