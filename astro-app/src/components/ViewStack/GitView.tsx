import type { GitStatus } from '../../services/GitAdapter';
import BranchIndicator from '../BranchIndicator/BranchIndicator';
import WorktreeIndicator from '../WorktreeIndicator/WorktreeIndicator';
import './git-view.css';

interface GitViewProps {
  gitStatus: GitStatus | null;
}

export default function GitView({ gitStatus }: GitViewProps) {
  if (!gitStatus?.isRepository) {
    return (
      <div className="git-view-empty">
        <div className="empty-message">
          <span>📁</span>
          <p>Not a git repository</p>
        </div>
      </div>
    );
  }

  const {
    currentBranch,
    branches,
    worktrees,
    stagedFiles,
    unstagedFiles,
    untrackedFiles,
    stashCount
  } = gitStatus;

  return (
    <div className="git-view">
      <div className="git-branch-section">
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
        <div className="git-status-section">
          <div className="status-header">Changes</div>
          <div className="status-counts">
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
        </div>
      )}

      {branches.length > 1 && (
        <div className="git-branches-section">
          <div className="branches-header">Branches ({branches.length})</div>
          <div className="branches-list">
            {branches.map((branch) => (
              <div 
                key={branch.name} 
                className={`branch-item ${branch.isActive ? 'active' : ''}`}
              >
                <span className="branch-name">{branch.name}</span>
                {branch.isDefault && <span className="branch-badge">main</span>}
                {(branch.ahead > 0 || branch.behind > 0) && (
                  <div className="branch-sync">
                    {branch.ahead > 0 && <span className="sync-ahead">↑{branch.ahead}</span>}
                    {branch.behind > 0 && <span className="sync-behind">↓{branch.behind}</span>}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}