import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import FcoApp from './fco/FcoApp.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <FcoApp />
  </StrictMode>,
)
