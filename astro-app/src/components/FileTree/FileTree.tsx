interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileNode[];
  size?: number;
}
import './file-tree.css';

interface FileTreeProps {
  fileTree: FileNode[];
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

export default function FileTree({ fileTree }: FileTreeProps) {
  const renderFileTree = (nodes: FileNode[], depth = 0) => {
    return nodes.map((node) => (
      <div key={node.path}>
        <div 
          className="file-tree-item"
          style={{ paddingLeft: `${depth * 16}px` }}
        >
          <span className="file-icon">{getFileIcon(node.name, node.type)}</span>
          <span className="file-name">{node.name}</span>
        </div>
        {node.children && renderFileTree(node.children, depth + 1)}
      </div>
    ));
  };

  return (
    <div className="file-tree-container">
      {renderFileTree(fileTree)}
    </div>
  );
}