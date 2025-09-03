import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { FileNode } from '../types';

export default function ProjectView() {
  const { projectName } = useParams<{ projectName: string }>();
  const navigate = useNavigate();
  const [fileTree, setFileTree] = useState<FileNode[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Mock data - will be replaced with actual API calls

    const mockFileTree: FileNode[] = [
      {
        name: 'src',
        path: `/src`,
        type: 'directory',
        children: [
          { name: 'App.tsx', path: `/src/App.tsx`, type: 'file', size: 1234 },
          { name: 'main.tsx', path: `/src/main.tsx`, type: 'file', size: 567 },
          {
            name: 'components',
            path: `/src/components`,
            type: 'directory',
            children: [
              { name: 'Layout.tsx', path: `/src/components/Layout.tsx`, type: 'file', size: 890 }
            ]
          }
        ]
      },
      { name: 'package.json', path: `/package.json`, type: 'file', size: 2345 },
      { name: 'vite.config.ts', path: `/vite.config.ts`, type: 'file', size: 456 }
    ];

    setTimeout(() => {
      setFileTree(mockFileTree);
      setLoading(false);
    }, 500);
  }, [projectName]);

  if (loading) {
    return <div>Loading project...</div>;
  }

  const renderFileTree = (nodes: FileNode[], depth = 0) => {
    return nodes.map((node) => (
      <div key={node.path}>
        <div 
          className="file-item"
          style={{ paddingLeft: `${depth * 12}px` }}
        >
          {node.type === 'directory' ? '/' : ''}{node.name}
        </div>
        {node.children && renderFileTree(node.children, depth + 1)}
      </div>
    ));
  };

  return (
    <div className="project-view">
      <div className="file-tree-compact">
        {renderFileTree(fileTree)}
      </div>
    </div>
  );
}