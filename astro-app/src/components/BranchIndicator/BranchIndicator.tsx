import { useState, useEffect } from 'react';
import type { GitBranch } from '../../services/types';
import './branch-indicator.css';

interface BranchIndicatorProps {
  currentBranch?: string;
  branches?: GitBranch[];
  className?: string;
}

export default function BranchIndicator({ currentBranch, branches = [], className = '' }: BranchIndicatorProps) {
  if (!currentBranch) {
    return null;
  }

  const activeBranch = branches.find(b => b.isActive) || { 
    name: currentBranch, 
    isActive: true, 
    isDefault: false 
  };

  return (
    <div className={`branch-indicator ${className}`}>
      <div className="branch-current">
        <span className="branch-name">{activeBranch.name}</span>
        {activeBranch.isDefault && <span className="branch-default-badge">[main]</span>}
        {(activeBranch.ahead > 0 || activeBranch.behind > 0) && (
          <div className="branch-sync-status">
            {activeBranch.ahead > 0 && <span className="sync-ahead">↑{activeBranch.ahead}</span>}
            {activeBranch.behind > 0 && <span className="sync-behind">↓{activeBranch.behind}</span>}
          </div>
        )}
      </div>
    </div>
  );
}