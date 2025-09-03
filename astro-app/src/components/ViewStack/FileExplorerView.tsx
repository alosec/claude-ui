import { useState } from 'react';
import { type FileSystemItem, getFilesystemAdapter } from '../../services/FilesystemAdapter';
import './file-explorer-view.css';

interface FileExplorerViewProps {
  fileTree: FileSystemItem[];
}

const getFileIcon = (name: string, type: 'file' | 'directory') => {
  if (type === 'directory') return '📁';
  
  const ext = name.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'tsx': case 'ts': return '⚛️';
    case 'js': case 'jsx': return '📜';
    case 'css': case 'scss': return '🎨';
    case 'json': return '📋';
    case 'md': return '📝';
    case 'html': return '🌐';
    case 'png': case 'jpg': case 'jpeg': case 'gif': case 'svg': return '🖼️';
    default: return '📄';
  }
};

export default function FileExplorerView({ fileTree }: FileExplorerViewProps) {
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set());
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [loadingFile, setLoadingFile] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const toggleDirectory = (path: string) => {
    const newExpanded = new Set(expandedDirs);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpandedDirs(newExpanded);
  };

  const handleFileClick = async (file: FileSystemItem) => {
    if (file.type === 'directory') {
      toggleDirectory(file.path);
      return;
    }

    // Load file content for text files
    if (file.name.match(/\.(txt|md|json|js|jsx|ts|tsx|css|scss|html|xml|yaml|yml|toml|ini|cfg|env)$/i)) {
      setSelectedFile(file.path);
      setLoadingFile(file.path);
      setError(null);

      try {
        const adapter = getFilesystemAdapter();
        const result = await adapter.readFile(file.path);
        
        if (result.success && result.data) {
          setFileContent(result.data.content);
        } else {
          setError(`Failed to load file: ${result.error}`);
          setFileContent(null);
        }
      } catch (err) {
        console.error('Error loading file:', err);
        setError('An unexpected error occurred');
        setFileContent(null);
      } finally {
        setLoadingFile(null);
      }
    } else {
      // For binary files, just show selection
      setSelectedFile(file.path);
      setFileContent(null);
    }
  };

  const formatFileSize = (size: number | undefined): string => {
    if (!size) return '';
    if (size < 1024) return `${size}B`;
    if (size < 1024 * 1024) return `${Math.round(size / 1024)}KB`;
    return `${Math.round(size / (1024 * 1024))}MB`;
  };

  const renderFileTree = (nodes: FileSystemItem[], depth = 0): JSX.Element[] => {
    return nodes.map((node) => {
      const isExpanded = expandedDirs.has(node.path);
      const isSelected = selectedFile === node.path;
      const isLoading = loadingFile === node.path;
      
      return (
        <div key={node.path}>
          <div 
            className={`file-explorer-item ${isSelected ? 'selected' : ''} ${node.type === 'directory' ? 'directory' : 'file'}`}
            style={{ paddingLeft: `${depth * 16}px` }}
            onClick={() => handleFileClick(node)}
          >
            {node.type === 'directory' && (
              <span className="expand-icon">
                {isExpanded ? '▼' : '▶'}
              </span>
            )}
            <span className="file-icon">{getFileIcon(node.name, node.type)}</span>
            <span className="file-name">{node.name}</span>
            {node.size && (
              <span className="file-size">{formatFileSize(node.size)}</span>
            )}
            {isLoading && <span className="loading-indicator">⏳</span>}
          </div>
          {node.children && isExpanded && renderFileTree(node.children, depth + 1)}
        </div>
      );
    });
  };

  return (
    <div className="file-explorer-view">
      <div className="file-explorer-tree">
        {renderFileTree(fileTree)}
      </div>
      
      {(selectedFile || error) && (
        <div className="file-preview">
          <div className="file-preview-header">
            <span>{selectedFile ? selectedFile.split('/').pop() : 'Error'}</span>
            <button 
              className="close-preview" 
              onClick={() => {
                setSelectedFile(null);
                setFileContent(null);
                setError(null);
              }}
            >
              ✕
            </button>
          </div>
          <div className="file-preview-content">
            {error ? (
              <div className="error-content">{error}</div>
            ) : fileContent ? (
              <pre className="code-content">{fileContent}</pre>
            ) : selectedFile && !loadingFile ? (
              <div className="binary-file-info">
                Binary file (cannot preview)
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}