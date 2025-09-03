import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from '../contexts/ThemeContext';
import Layout from './Layout/Layout';
import ProjectsTable from './ProjectsTable/ProjectsTable';
import ProjectView from './ProjectView/ProjectView';

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<ProjectsTable />} />
            <Route path="/project/:projectName" element={<ProjectView />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </ThemeProvider>
  );
}