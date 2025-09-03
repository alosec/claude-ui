import { useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  
  const isProjectView = location.pathname.startsWith('/project/');
  const projectName = isProjectView ? location.pathname.split('/')[2] : '';

  return (
    <header className="app-header">
      <div className="app-header-content">
        <div className="app-header-left">
          {isProjectView && (
            <button 
              className="back-btn"
              onClick={() => navigate('/')}
              aria-label="Back to projects"
            >
              ◀
            </button>
          )}
        </div>
        
        <div className="app-header-right">
          <button 
            className="header-btn"
            onClick={() => console.log('Create new project')}
            aria-label="Create new project"
          >
            +
          </button>
          <button 
            className="header-btn theme-btn"
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
          >
            {theme === 'light' ? '◐' : '◑'}
          </button>
        </div>
      </div>
    </header>
  );
}