import { useState } from 'react';
import type { GitWorktree } from '../../services/types';
import './worktree-indicator.css';

interface WorktreeIndicatorProps {
  worktrees: GitWorktree[];
  className?: string;
}

export default function WorktreeIndicator({ worktrees = [], className = '' }: WorktreeIndicatorProps) {
  if (worktrees.length <= 1) {
    return null;
  }

  return (
    <div className={`worktree-indicator ${className}`}>
      <div className="worktree-current">
        <span className="worktree-count">{worktrees.length} worktrees</span>
      </div>
    </div>
  );
}