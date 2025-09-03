import { useState, useEffect } from 'react';
import type { GitStatus, GitFileChange } from '../../services/GitAdapter';
import { getGitAdapter } from '../../services/GitAdapter';
import BranchIndicator from '../BranchIndicator/BranchIndicator';
import WorktreeIndicator from '../WorktreeIndicator/WorktreeIndicator';
import './git-view.css';

interface GitViewProps {
  gitStatus: GitStatus | null;
}

interface GitTreeNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: GitTreeNode[];
  change?: GitFileChange;
}

const getStatusIcon = (status: GitFileChange['status'], staged: boolean) => {
  const prefix = staged ? '🟢' : '🟡';
  switch (status) {
    case 'added': return `${prefix}+`;
    case 'modified': return `${prefix}●`;
    case 'deleted': return `${prefix}✕`;
    case 'renamed': return `${prefix}→`;
    case 'untracked': return '🔵?';
    default: return `${prefix}●`;
  }
};

const getStatusLabel = (status: GitFileChange['status']) => {
  switch (status) {
    case 'added': return 'Added';
    case 'modified': return 'Modified';
    case 'deleted': return 'Deleted';
    case 'renamed': return 'Renamed';
    case 'copied': return 'Copied';
    case 'untracked': return 'Untracked';
    default: return 'Changed';
  }
};

const buildGitTree = (changes: GitFileChange[]): GitTreeNode[] => {
  const root: GitTreeNode[] = [];
  const directoryMap = new Map<string, GitTreeNode>();

  changes.forEach(change => {
    const pathParts = change.path.split('/');
    let currentLevel = root;
    let currentPath = '';

    pathParts.forEach((part, index) => {
      currentPath = currentPath ? `${currentPath}/${part}` : part;
      const isFile = index === pathParts.length - 1;

      let existingNode = currentLevel.find(node => node.name === part);

      if (!existingNode) {
        const newNode: GitTreeNode = {
          name: part,
          path: currentPath,
          type: isFile ? 'file' : 'directory',
          children: isFile ? undefined : [],
          change: isFile ? change : undefined
        };

        currentLevel.push(newNode);
        existingNode = newNode;

        if (!isFile) {
          directoryMap.set(currentPath, newNode);
        }
      }

      if (!isFile && existingNode.children) {
        currentLevel = existingNode.children;
      }
    });
  });

  // Sort directories first, then files
  const sortNodes = (nodes: GitTreeNode[]): GitTreeNode[] => {
    return nodes.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === 'directory' ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });
  };

  const sortRecursively = (nodes: GitTreeNode[]): GitTreeNode[] => {
    const sorted = sortNodes(nodes);
    sorted.forEach(node => {
      if (node.children) {
        node.children = sortRecursively(node.children);
      }
    });
    return sorted;
  };

  return sortRecursively(root);
};

export default function GitView({ gitStatus }: GitViewProps) {
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set());
  const [fileChanges, setFileChanges] = useState<GitFileChange[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showFileChanges, setShowFileChanges] = useState(false);

  useEffect(() => {
    const loadFileChanges = async () => {
      if (!gitStatus?.isRepository) return;
      
      // If we already have file changes from gitStatus, use those
      if (gitStatus.fileChanges) {
        setFileChanges(gitStatus.fileChanges);
        return;
      }

      // Otherwise, fetch detailed changes
      setLoading(true);
      setError(null);

      try {
        const adapter = getGitAdapter();
        // For now, we'll simulate getting changes from current project
        // In a real implementation, this would need the project path
        const result = await adapter.getFileChanges('.');
        
        if (result.success && result.data) {
          setFileChanges(result.data);
        } else {
          setError(result.error || 'Failed to load git changes');
        }
      } catch (err) {
        console.error('Error loading git changes:', err);
        setError('Failed to load git changes');
      } finally {
        setLoading(false);
      }
    };

    if (showFileChanges) {
      loadFileChanges();
    }
  }, [gitStatus, showFileChanges]);

  const toggleDirectory = (path: string) => {
    const newExpanded = new Set(expandedDirs);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpandedDirs(newExpanded);
  };

  const renderGitTree = (nodes: GitTreeNode[], depth = 0): JSX.Element[] => {
    return nodes.map((node) => {
      const isExpanded = expandedDirs.has(node.path);
      
      return (
        <div key={node.path}>
          <div 
            className={`git-change-item ${node.type}`}
            style={{ paddingLeft: `${depth * 16}px` }}
            onClick={node.type === 'directory' ? () => toggleDirectory(node.path) : undefined}
          >
            {node.type === 'directory' && (
              <span className="expand-icon">
                {isExpanded ? '▼' : '▶'}
              </span>
            )}
            
            <span className="file-icon">
              {node.type === 'directory' ? '📁' : '📄'}
            </span>
            
            <span className="file-name">{node.name}</span>
            
            {node.change && (
              <>
                <span className="status-icon">
                  {getStatusIcon(node.change.status, node.change.staged)}
                </span>
                <span className="status-label">
                  {getStatusLabel(node.change.status)}
                </span>
                {node.change.staged && (
                  <span className="staged-indicator">Staged</span>
                )}
              </>
            )}
          </div>
          
          {node.children && isExpanded && renderGitTree(node.children, depth + 1)}
        </div>
      );
    });
  };

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
          <div className="status-header">
            Changes
            <button 
              className="toggle-details-btn"
              onClick={() => setShowFileChanges(!showFileChanges)}
              title={showFileChanges ? "Hide file details" : "Show file details"}
            >
              {showFileChanges ? '▼' : '▶'}
            </button>
          </div>
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

          {showFileChanges && (
            <div className="git-file-changes">
              {loading && (
                <div className="git-changes-loading">
                  <span>⏳</span>
                  <p>Loading file changes...</p>
                </div>
              )}

              {error && (
                <div className="git-changes-error">
                  <span>⚠️</span>
                  <p>{error}</p>
                </div>
              )}

              {!loading && !error && fileChanges.length === 0 && (
                <div className="git-changes-empty">
                  <div className="empty-message">
                    <span>✨</span>
                    <p>No detailed changes available</p>
                  </div>
                </div>
              )}

              {!loading && !error && fileChanges.length > 0 && (
                <div className="git-changes-tree">
                  {renderGitTree(buildGitTree(fileChanges))}
                </div>
              )}
            </div>
          )}
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