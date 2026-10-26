import { StrictMode, Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { useRoute } from './lib/router'
import { AuthProvider } from './context/AuthContext'
import Landing from './pages/Landing'

// Lazy-load editor and dashboard to optimize initial landing bundle size
const App = lazy(() => import('./App'))
const Dashboard = lazy(() => import('./pages/Dashboard'))

function Root() {
  const route = useRoute()

  if (route === 'editor') {
    return (
      <Suspense fallback={<div className="grid h-dvh place-items-center bg-ink-950 text-sm text-mute" role="status">Opening the editor…</div>}>
        <App />
      </Suspense>
    )
  }

  if (route === 'dashboard') {
    return (
      <Suspense fallback={<div className="grid h-dvh place-items-center bg-ink-950 text-sm text-mute" role="status">Loading dashboard…</div>}>
        <Dashboard />
      </Suspense>
    )
  }

  return <Landing />
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <Root />
    </AuthProvider>
  </StrictMode>,
)
