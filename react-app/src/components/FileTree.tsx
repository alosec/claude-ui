import { FileNode } from '../types';

const styles = {
  fileTreeCompact: {
    padding: '12px',
    fontSize: '11px',
    minHeight: '120px',
    maxHeight: '300px',
    overflowY: 'auto' as const,
    margin: '0',
    backgroundColor: 'var(--bg-color)',
  },
  fileTreeItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '3px 0',
    fontSize: '11px',
    fontWeight: 'bold' as const,
    lineHeight: '1.3',
    cursor: 'pointer',
    transition: 'background-color 0.1s ease',
    color: 'var(--text-color)',
  },
  fileTreeItemHover: {
    backgroundColor: 'var(--button-hover-bg)',
    color: 'var(--button-hover-text)',
  },
  fileIcon: {
    fontSize: '12px',
    width: '14px',
    textAlign: 'center' as const,
    flexShrink: 0,
  },
  fileName: {
    flex: 1,
    whiteSpace: 'nowrap' as const,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
};

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
          style={{
            ...styles.fileTreeItem,
            paddingLeft: `${depth * 16}px`
          }}
          onMouseEnter={(e) => {
            Object.assign(e.currentTarget.style, styles.fileTreeItemHover);
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '';
            e.currentTarget.style.color = '';
          }}
        >
          <span style={styles.fileIcon}>{getFileIcon(node.name, node.type)}</span>
          <span style={styles.fileName}>{node.name}</span>
        </div>
        {node.children && renderFileTree(node.children, depth + 1)}
      </div>
    ));
  };

  return (
    <div style={styles.fileTreeCompact}>
      {renderFileTree(fileTree)}
    </div>
  );
}