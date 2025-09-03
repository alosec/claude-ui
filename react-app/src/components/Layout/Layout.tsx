import { ReactNode } from 'react';
import Header from '../Header/Header';
import './layout.css';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="app-container">
      <Header />
      <main className="app-main">
        {children}
      </main>
    </div>
  );
}