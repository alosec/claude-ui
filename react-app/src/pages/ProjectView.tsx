import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Task, FileNode } from '../types';
import FileTree from '../components/FileTree';

const styles = {
  projectView: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
    maxWidth: '100%',
  },
  projectPathHeader: {
    fontFamily: "'Courier New', Consolas, Monaco, monospace",
    fontSize: '12px',
    fontWeight: 'normal' as const,
    padding: '4px 0 8px 0',
    margin: '0',
    color: 'var(--text-color)',
  },
};

export default function ProjectView() {
  const { projectName } = useParams<{ projectName: string }>();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [fileTree, setFileTree] = useState<FileNode[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Mock data - will be replaced with actual API calls
    const mockTasks: Task[] = [
      {
        id: '1',
        title: 'Set up project structure',
        description: 'Initialize React app with TypeScript and Vite',
        status: 'completed',
        createdAt: '2025-01-15T10:00:00Z',
        updatedAt: '2025-01-15T11:00:00Z',
        projectName: projectName || '',
      },
      {
        id: '2',
        title: 'Create table-based UI',
        description: 'Implement projects table and task management',
        status: 'in_progress',
        createdAt: '2025-01-15T11:00:00Z',
        updatedAt: '2025-01-15T12:00:00Z',
        projectName: projectName || '',
      },
      {
        id: '3',
        title: 'Add file tree viewer',
        description: 'Display project files in a tree structure',
        status: 'pending',
        createdAt: '2025-01-15T12:00:00Z',
        updatedAt: '2025-01-15T12:00:00Z',
        projectName: projectName || '',
      }
    ];

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
      setTasks(mockTasks);
      setFileTree(mockFileTree);
      setLoading(false);
    }, 500);
  }, [projectName]);

  if (loading) {
    return <div>Loading project...</div>;
  }


  const getProjectSummary = () => {
    const completedTasks = tasks.filter(t => t.status === 'completed').length;
    const totalTasks = tasks.length;
    const inProgress = tasks.filter(t => t.status === 'in_progress').length;
    
    if (totalTasks === 0) return 'Empty project with no tasks defined.';
    if (completedTasks === totalTasks) return `Project complete with ${totalTasks} tasks finished.`;
    if (inProgress > 0) return `Active development with ${inProgress} in progress, ${completedTasks}/${totalTasks} complete.`;
    return `Inactive project with ${completedTasks}/${totalTasks} tasks complete.`;
  };

  return (
    <div style={styles.projectView}>
      <div style={styles.projectPathHeader}>
        ~/projects/{projectName?.toLowerCase()}/
      </div>
      <FileTree fileTree={fileTree} />
    </div>
  );
}