import { useState, useEffect } from 'react';
import { getGitAdapter, type GitCommit, type GitFileChange } from '../../services/GitAdapter';
import './project-git-info.css';

interface ProjectGitInfoProps {
  projectPath: string;
  projectName: string;
}

interface GitTreeNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: GitTreeNode[];
  change?: GitFileChange;
}

const buildFileTree = (changes: GitFileChange[]): GitTreeNode[] => {
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

export default function ProjectGitInfo({ projectPath, projectName }: ProjectGitInfoProps) {
  const [commits, setCommits] = useState<GitCommit[]>([]);
  const [fileChanges, setFileChanges] = useState<GitFileChange[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function loadGitData() {
      try {
        setLoading(true);
        setError(null);
        
        const gitAdapter = getGitAdapter();
        
        const [commitsResult, changesResult] = await Promise.all([
          gitAdapter.getRecentCommits(projectName, 5),
          gitAdapter.getFileChanges(projectName)
        ]);
        
        if (commitsResult.success && commitsResult.data) {
          setCommits(commitsResult.data);
        }
        
        if (changesResult.success && changesResult.data) {
          setFileChanges(changesResult.data);
        }
        
        if (!commitsResult.success && !changesResult.success) {
          setError('Not a git repository');
        }
      } catch (err) {
        console.error('Error loading git data:', err);
        setError('Failed to load git information');
      } finally {
        setLoading(false);
      }
    }

    loadGitData();
  }, [projectPath, projectName]);

  const toggleDirectory = (path: string) => {
    const newExpanded = new Set(expandedDirs);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpandedDirs(newExpanded);
  };

  const renderFileTree = (nodes: GitTreeNode[], depth = 0): JSX.Element[] => {
    return nodes.map((node) => {
      const isExpanded = expandedDirs.has(node.path);
      
      return (
        <div key={node.path}>
          <div 
            className={`git-tree-item ${node.type}`}
            style={{ paddingLeft: `${depth * 12}px` }}
            onClick={node.type === 'directory' ? () => toggleDirectory(node.path) : undefined}
          >
            {node.type === 'directory' && (
              <span className="expand-icon">
                {isExpanded ? '▼' : '▶'}
              </span>
            )}
            
            <span className="file-name">{node.name}</span>
            
            {node.change && (
              <span className="status-icon" title={`${node.change.status}${node.change.staged ? ' (staged)' : ''}`}>
                {getStatusIcon(node.change.status, node.change.staged)}
              </span>
            )}
          </div>
          
          {node.children && isExpanded && renderFileTree(node.children, depth + 1)}
        </div>
      );
    });
  };

  if (loading) {
    return (
      <div className="project-git-info loading">
        <span className="git-status">Loading git info...</span>
      </div>
    );
  }

  if (error || (commits.length === 0 && fileChanges.length === 0)) {
    return (
      <div className="project-git-info no-git">
        <span className="git-status">No git repo</span>
      </div>
    );
  }

  const fileTree = buildFileTree(fileChanges);

  return (
    <div className="project-git-info">
      <div className="git-summary" onClick={() => setIsExpanded(!isExpanded)}>
        <span className="expand-icon">
          {isExpanded ? '▼' : '▶'}
        </span>
        <span className="git-stats">
          {commits.length > 0 && <span className="commits-count">{commits.length} commits</span>}
          {fileChanges.length > 0 && <span className="changes-count">{fileChanges.length} changes</span>}
        </span>
      </div>
      
      {isExpanded && (
        <div className="git-details">
          {commits.length > 0 && (
            <div className="commits-section">
              <div className="section-title">Recent Commits</div>
              {commits.map((commit) => (
                <div key={commit.hash} className="commit-item">
                  <span className="commit-hash">{commit.shortHash}</span>
                  <span className="commit-message">{commit.message}</span>
                  <span className="commit-author">{commit.author}</span>
                </div>
              ))}
            </div>
          )}
          
          {fileChanges.length > 0 && (
            <div className="changes-section">
              <div className="section-title">File Changes</div>
              <div className="file-tree">
                {renderFileTree(fileTree)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}