import { Routes, Route } from 'react-router-dom'
import ProjectsTable from './pages/ProjectsTable/ProjectsTable'
import ProjectView from './pages/ProjectView/ProjectView'
import Layout from './components/Layout/Layout'

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<ProjectsTable />} />
        <Route path="/project/:projectName" element={<ProjectView />} />
      </Routes>
    </Layout>
  )
}

export default App