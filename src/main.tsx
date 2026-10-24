import { StrictMode, Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { useRoute } from './lib/router'
import Landing from './pages/Landing'

// The editor (and everything it pulls in) loads only when /editor is opened.
const App = lazy(() => import('./App'))

function Root() {
  const route = useRoute()
  if (route === 'editor') {
    return (
      <Suspense fallback={<div className="grid h-dvh place-items-center bg-ink-950 text-sm text-mute" role="status">Opening the editor…</div>}>
        <App />
      </Suspense>
    )
  }
  return <Landing />
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
