import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Project } from '../types';

export default function ProjectsTable() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Mock data for now - will be replaced with actual API calls
    const mockProjects: Project[] = [
      {
        name: 'claude-ui',
        path: '~/code/claude-ui',
        lastModified: '2025-01-15',
        status: 'active',
        taskCount: 3
      },
      {
        name: 'example-project',
        path: '~/code/example-project',
        lastModified: '2025-01-10',
        status: 'inactive',
        taskCount: 0
      }
    ];

    setTimeout(() => {
      setProjects(mockProjects);
      setLoading(false);
    }, 500);
  }, []);

  if (loading) {
    return <div>Loading projects...</div>;
  }

  return (
    <div>
      <div className="row">
        <div></div>
        <button onClick={() => console.log('Create new project')}>
          + Create
        </button>
      </div>

      <table>
        <thead>
          <tr>
            <th>path</th>
            <th>mtime</th>
          </tr>
        </thead>
        <tbody>
          {projects.map((project) => (
            <tr 
              key={project.name}
              onClick={() => navigate(`/project/${project.name}`)}
            >
              <td className="mono">
                {project.path}
              </td>
              <td>{project.lastModified}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {projects.length === 0 && (
        <div className="empty-state">
          No projects found. Create your first project to get started.
        </div>
      )}
    </div>
  );
}