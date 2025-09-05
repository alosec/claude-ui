import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getFilesystemAdapter, type Project } from '../../services/FilesystemAdapter';
import './projects-table.css';

export default function ProjectsTable() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    async function loadProjects() {
      try {
        setLoading(true);
        setError(null);
        
        const filesystemAdapter = getFilesystemAdapter();
        const result = await filesystemAdapter.listProjects();
        
        if (result.success && result.data) {
          setProjects(result.data);
        } else {
          setError(result.error || 'Failed to load projects');
        }
      } catch (err) {
        console.error('Error loading projects:', err);
        setError('An unexpected error occurred while loading projects');
      } finally {
        setLoading(false);
      }
    }

    loadProjects();
  }, []);

  if (loading) {
    return <div>Loading projects...</div>;
  }

  if (error) {
    return (
      <div className="error-state">
        <p>Error loading projects: {error}</p>
        <button onClick={() => window.location.reload()}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div>
      <table className="projects-table">
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
              <td className="mono project-path">
                {project.path}
              </td>
              <td className="project-mtime">
                {project.lastModified}
              </td>
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