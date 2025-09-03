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
          <h1>Claude UI</h1>
          <button onClick={toggleTheme}>
            {theme === 'light' ? '◐' : '◑'} {theme}
          </button>
        </div>
      </div>
      <main>
        {children}
      </main>
    </div>
  );
}