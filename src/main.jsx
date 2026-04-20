import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { SystemStatusProvider } from './contexts/SystemStatusContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <SystemStatusProvider>
      <App />
    </SystemStatusProvider>
  </StrictMode>,
)
