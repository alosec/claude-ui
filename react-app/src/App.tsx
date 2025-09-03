import { Routes, Route } from 'react-router-dom'
import ProjectsTable from './pages/ProjectsTable'
import ProjectView from './pages/ProjectView'
import Layout from './components/Layout'

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