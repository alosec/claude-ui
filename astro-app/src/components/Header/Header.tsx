import { useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import './header.css';

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  
  const isProjectView = location.pathname.startsWith('/project/');

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