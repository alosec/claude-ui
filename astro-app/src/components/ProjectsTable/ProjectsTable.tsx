import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getFilesystemAdapter, isDemoMode, type Project } from '../../services/FilesystemAdapter';
import './projects-table.css';

export default function ProjectsTable() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDemo, setIsDemo] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    async function loadProjects() {
      try {
        setLoading(true);
        setError(null);
        
        const filesystemAdapter = await getFilesystemAdapter();
        const result = await filesystemAdapter.listProjects();
        
        // Check if we're in demo mode
        const demoMode = await isDemoMode();
        setIsDemo(demoMode);
        
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
      {isDemo && (
        <div className="demo-mode-banner">
          <span className="demo-indicator">🧪 Demo Mode</span>
          <span className="demo-description">
            Showing sample projects. For full functionality, deploy on a server with file system access.
          </span>
        </div>
      )}
      
      <table className="projects-table">
        <thead>
          <tr>
            <th>path</th>
            <th>mtime</th>
          </tr>
        </thead>
        <tbody>
          {projects.map((project) => (
            <tr key={project.name}>
              <td 
                className="mono project-path"
                onClick={() => navigate(`/project/${project.name}`)}
              >
                {project.path}
              </td>
              <td 
                className="project-mtime"
                onClick={() => navigate(`/project/${project.name}`)}
              >
                {project.lastModified}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {projects.length === 0 && !isDemo && (
        <div className="empty-state">
          No projects found. Create your first project to get started.
        </div>
      )}
      
      {projects.length === 0 && isDemo && (
        <div className="empty-state">
          Demo data loading... If you're seeing this, there may be an issue with the demo adapter.
        </div>
      )}
    </div>
  );
}