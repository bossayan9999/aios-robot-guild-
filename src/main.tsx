import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import './styles.css'
import './knowledge.css'
import './devices.css'
import './fastfix.css'
import './security-lab.css'

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>)
