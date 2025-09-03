import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from '../contexts/ThemeContext';
import ProjectsTable from './ProjectsTable';
import ProjectView from './ProjectView';

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<ProjectsTable />} />
          <Route path="/project/:projectName" element={<ProjectView />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}