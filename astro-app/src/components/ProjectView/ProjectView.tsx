import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getFilesystemAdapter, type FileSystemItem } from '../../services/FilesystemAdapter';
import { getGitAdapter, type GitStatus } from '../../services/GitAdapter';
import ViewStack from '../../components/ViewStack/ViewStack';
import InputCard from '../../components/InputCard/InputCard';
import GitStatusBar from '../../components/GitStatusBar/GitStatusBar';
import './project-view.css';

export default function ProjectView() {
  const { projectName } = useParams<{ projectName: string }>();
  const [fileTree, setFileTree] = useState<FileSystemItem | null>(null);
  const [gitStatus, setGitStatus] = useState<GitStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadProjectData() {
      if (!projectName) {
        setError('Project name is required');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        const filesystemAdapter = getFilesystemAdapter();
        const gitAdapter = getGitAdapter();
        
        // Load filesystem and git data in parallel
        const [filesystemResult, gitResult] = await Promise.all([
          filesystemAdapter.getProjectTree(projectName, 4),
          gitAdapter.getRepoStatus(projectName).catch(() => ({ success: false, error: 'Git not available' }))
        ]);
        
        if (filesystemResult.success && filesystemResult.data) {
          setFileTree(filesystemResult.data);
        } else {
          setError(filesystemResult.error || 'Failed to load project tree');
          return;
        }

        if (gitResult.success && gitResult.data) {
          setGitStatus(gitResult.data);
        } else {
          // Git failure is not fatal - project may not be a git repository
          console.log('Git status not available:', gitResult.error);
          setGitStatus(null);
        }
      } catch (err) {
        console.error('Error loading project data:', err);
        setError('An unexpected error occurred while loading project data');
      } finally {
        setLoading(false);
      }
    }

    loadProjectData();
  }, [projectName]);

  if (loading) {
    return <div>Loading project...</div>;
  }

  if (error) {
    return (
      <div className="error-state">
        <p>Error loading project: {error}</p>
        <button onClick={() => window.location.reload()}>
          Retry
        </button>
      </div>
    );
  }

  if (!fileTree) {
    return <div>No project data available</div>;
  }

  const handleInputSubmit = (value: string) => {
    console.log('Input submitted:', value);
  };

  return (
    <div className="project-view">
      <div className="project-header">
        <div className="project-path-header">
          {fileTree.path}/
        </div>
      </div>
      <InputCard
        onSubmit={handleInputSubmit}
        placeholder="Input..."
      />
      <ViewStack 
        fileTree={fileTree.children || []} 
        gitStatus={gitStatus}
      />
    </div>
  );
}