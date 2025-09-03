import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { Task, FileNode } from '../types';

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
    <div className="project-view">
      <div className="project-summary">
        {getProjectSummary()}
      </div>

      <div className="file-tree-compact">
        {renderFileTree(fileTree)}
      </div>

      <table>
        <thead>
          <tr>
            <th>Task</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((task) => (
            <tr key={task.id}>
              <td className="task-title">{task.title}</td>
              <td>
                <span className={`status ${task.status}`}>
                  {task.status === 'in_progress' ? 'ACTIVE' : 
                   task.status === 'completed' ? 'DONE' : 'TODO'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {tasks.length === 0 && (
        <div className="empty-state">
          NO TASKS DEFINED
        </div>
      )}
    </div>
  );
}