import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { Icon } from './icons'
import { Link, navigate } from '../lib/router'
import { btn } from './ui'

export function UserMenu() {
  const { user, signOut, openAuthModal } = useAuth()
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  if (!user) {
    return (
      <div className="flex items-center gap-2">
        <button
          onClick={() => openAuthModal('signin')}
          className={`${btn} h-8 px-3 text-xs text-mute hover:text-white`}
        >
          Sign in
        </button>
        <button
          onClick={() => openAuthModal('signup')}
          className="h-8 px-3 text-xs font-semibold rounded-md bg-[#ffe14d] text-[#0b0c0f] hover:bg-[#ffe76a] transition-colors"
        >
          Sign up
        </button>
      </div>
    )
  }

  const email = user.email ?? 'User'
  const name = user.user_metadata?.full_name || email.split('@')[0]
  const initials = name.slice(0, 2).toUpperCase()

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-lg border border-line bg-ink-850 px-2 py-1 text-xs text-fg hover:border-white/20 transition-colors"
        aria-expanded={open}
        aria-haspopup="true"
        aria-label="User account menu"
      >
        <span className="grid h-6 w-6 place-items-center rounded-full bg-accent-500/20 text-accent-300 font-bold text-[11px]">
          {initials}
        </span>
        <span className="max-w-[120px] truncate text-xs font-medium hidden sm:inline">{name}</span>
        <Icon name="down" size={13} className="text-mute" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-line bg-ink-900 p-1.5 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-100">
          <div className="border-b border-line px-3 py-2">
            <p className="text-xs font-semibold text-fg truncate">{name}</p>
            <p className="text-[11px] text-mute truncate mt-0.5">{email}</p>
          </div>

          <div className="py-1">
            <Link
              to="/dashboard"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-fg hover:bg-ink-800 transition-colors"
            >
              <Icon name="folder" size={14} className="text-accent-400" />
              <span>My Projects</span>
            </Link>
            <Link
              to="/editor"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-fg hover:bg-ink-800 transition-colors"
            >
              <Icon name="film" size={14} className="text-accent-400" />
              <span>Studio Editor</span>
            </Link>
          </div>

          <div className="border-t border-line pt-1">
            <button
              onClick={async () => {
                setOpen(false)
                await signOut()
                navigate('/')
              }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-red-300 hover:bg-red-950/40 hover:text-red-200 transition-colors"
            >
              <Icon name="x" size={14} />
              <span>Sign out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
