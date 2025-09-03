import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ThemeProvider } from './contexts/ThemeContext'
import App from './App.tsx'
// Import modular styles
import './styles/theme.css'
import './styles/global.css'
import './styles/typography.css'
import './styles/components/button.css'
import './styles/components/table.css'
import './styles/components/status.css'
import './styles/print.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ThemeProvider>
  </React.StrictMode>,
)