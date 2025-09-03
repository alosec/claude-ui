import type { GitStatus } from '../../services/types';
import BranchIndicator from '../BranchIndicator/BranchIndicator';
import WorktreeIndicator from '../WorktreeIndicator/WorktreeIndicator';
import './git-status-bar.css';

interface GitStatusBarProps {
  gitStatus?: GitStatus;
  className?: string;
  variant?: 'default' | 'compact';
}

export default function GitStatusBar({ gitStatus, className = '' }: GitStatusBarProps) {
  if (!gitStatus?.isRepository) {
    return null;
  }

  const {
    currentBranch,
    branches,
    worktrees,
    hasUncommittedChanges,
    stagedFiles,
    unstagedFiles,
    untrackedFiles,
    stashCount
  } = gitStatus;

  return (
    <div className={`git-status-bar ${className}`}>
      <div className="git-status-main">
        <BranchIndicator 
          currentBranch={currentBranch} 
          branches={branches}
        />
        
        {worktrees.length > 1 && (
          <WorktreeIndicator 
            worktrees={worktrees}
          />
        )}
      </div>

      {(stagedFiles > 0 || unstagedFiles > 0 || untrackedFiles > 0 || stashCount > 0) && (
        <div className="git-status-changes">
          {stagedFiles > 0 && (
            <div className="status-item">
              <span className="status-count">{stagedFiles}</span>
              <span className="status-label">staged</span>
            </div>
          )}

          {unstagedFiles > 0 && (
            <div className="status-item">
              <span className="status-count">{unstagedFiles}</span>
              <span className="status-label">modified</span>
            </div>
          )}

          {untrackedFiles > 0 && (
            <div className="status-item">
              <span className="status-count">{untrackedFiles}</span>
              <span className="status-label">untracked</span>
            </div>
          )}

          {stashCount > 0 && (
            <div className="status-item">
              <span className="status-count">{stashCount}</span>
              <span className="status-label">stashed</span>
            </div>
          )}
        </div>
      )}

      {hasUncommittedChanges && (
        <div className="git-status-indicator">
          <div className="uncommitted-indicator">●</div>
        </div>
      )}
    </div>
  );
}