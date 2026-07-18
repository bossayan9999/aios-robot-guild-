import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import './styles.css'
import './knowledge.css'
import './devices.css'
import './fastfix.css'
import './security-lab.css'
import './deployment.css'
import './account.css'
import './update-center.css'
import './ccna-network.css'
import './command-center.css'
import './copilot-communication.css'
import './forge-growth.css'
import './engineering-guild.css'
import './sandbox-loop.css'
import './guild-rewards.css'
import './strong-team.css'

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>)

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js').catch(() => undefined)
  })
}
