import { ReactNode } from 'react';
import { useTheme } from '../contexts/ThemeContext';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="container">
      <div className="header">
        <div className="row">
          <div></div>
          <div className="button-group">
            <button onClick={() => console.log('Create new project')}>
              + Create
            </button>
            <button onClick={toggleTheme}>
              {theme === 'light' ? '◐' : '◑'} {theme}
            </button>
          </div>
        </div>
      </div>
      <main>
        {children}
      </main>
    </div>
  );
}