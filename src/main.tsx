import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { App } from './app/App'

async function bootstrap() {
  // The mock layer is loaded dynamically so it can be removed without touching app code (AD-6).
  const { enableMocking } = await import('./mocks/browser')
  await enableMocking()
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

void bootstrap()
