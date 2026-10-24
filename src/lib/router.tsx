import { useEffect, useState } from 'react'
import type { AnchorHTMLAttributes, MouseEvent, ReactNode } from 'react'

/**
 * Minimal History-API router for two pages: "/" (landing) and "/editor". No dependency needed.
 * Deployment hosts must serve index.html for /editor (vite dev does this by default; vercel.json does it on Vercel).
 */
export type Route = 'home' | 'editor'

export const routeOf = (pathname: string): Route => (pathname.replace(/\/+$/, '') === '/editor' ? 'editor' : 'home')

export function navigate(to: string, opts: { replace?: boolean } = {}) {
  if (opts.replace) history.replaceState(null, '', to)
  else history.pushState(null, '', to)
  window.dispatchEvent(new PopStateEvent('popstate'))
  window.scrollTo(0, 0)
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() => routeOf(location.pathname))
  useEffect(() => {
    const on = () => setRoute(routeOf(location.pathname))
    window.addEventListener('popstate', on)
    return () => window.removeEventListener('popstate', on)
  }, [])
  return route
}

/** A real <a href> (so middle-click and "open in new tab" work) that navigates without a page reload on a plain click. */
export function Link({ to, children, onClick, ...rest }: { to: string; children: ReactNode } & AnchorHTMLAttributes<HTMLAnchorElement>) {
  const go = (e: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(e)
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
    e.preventDefault()
    navigate(to)
  }
  return <a href={to} onClick={go} {...rest}>{children}</a>
}
