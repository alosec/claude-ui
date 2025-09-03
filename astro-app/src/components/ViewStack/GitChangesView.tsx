import { useState, useEffect } from 'react';
import type { GitStatus, GitFileChange } from '../../services/GitAdapter';
import { getGitAdapter } from '../../services/GitAdapter';
import './git-changes-view.css';

interface GitChangesViewProps {
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

export default function GitChangesView({ gitStatus }: GitChangesViewProps) {
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set());
  const [fileChanges, setFileChanges] = useState<GitFileChange[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

    loadFileChanges();
  }, [gitStatus]);

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
      <div className="git-changes-empty">
        <div className="empty-message">
          <span>📁</span>
          <p>Not a git repository</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="git-changes-loading">
        <span>⏳</span>
        <p>Loading git changes...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="git-changes-error">
        <span>⚠️</span>
        <p>{error}</p>
      </div>
    );
  }

  if (fileChanges.length === 0) {
    return (
      <div className="git-changes-empty">
        <div className="empty-message">
          <span>✨</span>
          <p>No changes</p>
        </div>
      </div>
    );
  }

  const gitTree = buildGitTree(fileChanges);
  
  return (
    <div className="git-changes-view">
      <div className="git-changes-summary">
        <div className="summary-stats">
          <span className="stat">
            {gitStatus.stagedFiles} staged
          </span>
          <span className="stat">
            {gitStatus.unstagedFiles} modified
          </span>
          <span className="stat">
            {gitStatus.untrackedFiles} untracked
          </span>
        </div>
      </div>
      
      <div className="git-changes-tree">
        {renderGitTree(gitTree)}
      </div>
    </div>
  );
}