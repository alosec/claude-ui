import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Task, FileNode } from '../types';

export default function ProjectView() {
  const { projectName } = useParams<{ projectName: string }>();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [fileTree, setFileTree] = useState<FileNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'tasks' | 'files'>('tasks');

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
          style={{ paddingLeft: `${depth * 20}px` }}
        >
          {node.type === 'directory' ? '[DIR]' : '[FILE]'} {node.name}
          {node.type === 'file' && node.size && (
            <span>
              ({Math.round(node.size / 1024)}KB)
            </span>
          )}
        </div>
        {node.children && renderFileTree(node.children, depth + 1)}
      </div>
    ));
  };

  return (
    <div>
      <div className="row">
        <div>
          <button 
            onClick={() => navigate('/')}
            className="back-btn"
          >
            ← Back to Projects
          </button>
          <h1>{projectName}</h1>
        </div>
        <button onClick={() => console.log('Add new task')}>
          + New Task
        </button>
      </div>

      <div className="tabs">
        <button 
          onClick={() => setActiveTab('tasks')}
          className={activeTab === 'tasks' ? 'active' : ''}
        >
          Tasks
        </button>
        <button 
          onClick={() => setActiveTab('files')}
          className={activeTab === 'files' ? 'active' : ''}
        >
          Files
        </button>
      </div>

      {activeTab === 'tasks' && (
        <table>
          <thead>
            <tr>
              <th>Task</th>
              <th>Status</th>
              <th>Created</th>
              <th>Updated</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((task) => (
              <tr key={task.id}>
                <td>
                  <div className="task-title">{task.title}</div>
                  {task.description && (
                    <div className="task-desc">
                      {task.description}
                    </div>
                  )}
                </td>
                <td>
                  <span className={`status ${task.status}`}>
                    {task.status.replace('_', ' ')}
                  </span>
                </td>
                <td>
                  {new Date(task.createdAt).toLocaleDateString()}
                </td>
                <td>
                  {new Date(task.updatedAt).toLocaleDateString()}
                </td>
                <td>
                  <button 
                    onClick={() => console.log('Edit task', task.id)}
                  >
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {activeTab === 'files' && (
        <div className="file-tree">
          <h3>Project Structure</h3>
          {renderFileTree(fileTree)}
        </div>
      )}

      {activeTab === 'tasks' && tasks.length === 0 && (
        <div className="empty-state">
          No tasks found. Create your first task to get started.
        </div>
      )}
    </div>
  );
}