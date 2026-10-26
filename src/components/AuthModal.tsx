import React, { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { Icon } from './icons'
import { LogoMark } from './Logo'
import { btn, btnPrimary, input } from './ui'

export function AuthModal() {
  const {
    authModalOpen,
    authModalTab,
    closeAuthModal,
    openAuthModal,
    signIn,
    signUp,
    resetPassword,
    isConfigured,
  } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)

  if (!authModalOpen) return null

  const handleTabChange = (tab: 'signin' | 'signup' | 'forgot') => {
    setError(null)
    setSuccess(null)
    openAuthModal(tab)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setLoading(true)

    try {
      if (authModalTab === 'signin') {
        if (!email.trim() || !password) {
          setError('Please provide both your email and password.')
          setLoading(false)
          return
        }
        const { error: err } = await signIn(email.trim(), password)
        if (err) {
          setError(err.message || 'Failed to sign in. Please check your credentials.')
        } else {
          closeAuthModal()
        }
      } else if (authModalTab === 'signup') {
        if (!email.trim() || !password) {
          setError('Please enter your email and a secure password.')
          setLoading(false)
          return
        }
        if (password.length < 6) {
          setError('Password must be at least 6 characters long.')
          setLoading(false)
          return
        }
        const { error: err, needsEmailConfirmation } = await signUp(email.trim(), password, fullName.trim())
        if (err) {
          setError(err.message || 'Could not create account.')
        } else if (needsEmailConfirmation) {
          setSuccess('Account created! Please check your inbox to confirm your email.')
        } else {
          closeAuthModal()
        }
      } else if (authModalTab === 'forgot') {
        if (!email.trim()) {
          setError('Please provide your email address.')
          setLoading(false)
          return
        }
        const { error: err } = await resetPassword(email.trim())
        if (err) {
          setError(err.message || 'Could not send reset link.')
        } else {
          setSuccess('Password reset link sent! Check your inbox.')
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/75 p-4 backdrop-blur-sm animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-label="Account Authentication"
      onClick={closeAuthModal}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-line bg-ink-900 p-6 shadow-2xl relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Subtle Ambient Glow */}
        <div className="pointer-events-none absolute -top-24 -right-24 h-48 w-48 rounded-full bg-accent-500/15 blur-3xl" />

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <LogoMark size={28} />
            <div>
              <h2 className="font-display text-base font-semibold text-fg leading-tight">
                {authModalTab === 'signin'
                  ? 'Sign in to CutPilot'
                  : authModalTab === 'signup'
                  ? 'Create your account'
                  : 'Reset your password'}
              </h2>
              <p className="text-xs text-mute mt-0.5">
                {authModalTab === 'signin'
                  ? 'Access your cloud projects and continuous drafts'
                  : authModalTab === 'signup'
                  ? 'Keep and sync all your video editing projects'
                  : 'We will send a secure reset link to your email'}
              </p>
            </div>
          </div>
          <button
            onClick={closeAuthModal}
            className="grid h-8 w-8 place-items-center rounded-lg text-mute hover:bg-ink-800 hover:text-white transition-colors"
            aria-label="Close"
          >
            <Icon name="x" size={16} />
          </button>
        </div>

        {/* Warning if Supabase is unconfigured */}
        {!isConfigured && (
          <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">
            <div className="flex items-start gap-2">
              <Icon name="alert" size={16} className="text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-100">Supabase credentials pending</p>
                <p className="mt-0.5 text-amber-200/80 leading-relaxed">
                  Add <code className="bg-black/40 px-1 py-0.5 rounded text-[11px]">VITE_SUPABASE_URL</code> and{' '}
                  <code className="bg-black/40 px-1 py-0.5 rounded text-[11px]">VITE_SUPABASE_ANON_KEY</code> to your{' '}
                  <code className="bg-black/40 px-1 py-0.5 rounded text-[11px]">.env</code> file for live cloud auth. In the meantime, all your projects are saved locally on this device!
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tab Switcher (Sign In vs Sign Up) */}
        {authModalTab !== 'forgot' && (
          <div className="mb-5 flex rounded-lg border border-line bg-ink-950 p-1 text-xs">
            <button
              type="button"
              onClick={() => handleTabChange('signin')}
              className={`flex-1 rounded-md py-1.5 font-medium transition-colors ${
                authModalTab === 'signin'
                  ? 'bg-ink-800 text-white shadow-sm'
                  : 'text-mute hover:text-white'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => handleTabChange('signup')}
              className={`flex-1 rounded-md py-1.5 font-medium transition-colors ${
                authModalTab === 'signup'
                  ? 'bg-ink-800 text-white shadow-sm'
                  : 'text-mute hover:text-white'
              }`}
            >
              Create Account
            </button>
          </div>
        )}

        {/* Feedback Alerts */}
        {error && (
          <div role="alert" className="mb-4 flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-950/80 p-3 text-xs text-red-200">
            <Icon name="alert" size={15} className="text-red-400 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{error}</span>
          </div>
        )}
        {success && (
          <div role="status" className="mb-4 flex items-start gap-2 rounded-lg border border-emerald-500/30 bg-emerald-950/80 p-3 text-xs text-emerald-200">
            <Icon name="check" size={15} className="text-emerald-400 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{success}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {authModalTab === 'signup' && (
            <div>
              <label className="block text-xs font-medium text-mute mb-1">Full Name (optional)</label>
              <input
                type="text"
                placeholder="Jane Creator"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className={`${input} h-9 text-xs`}
                disabled={loading}
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-mute mb-1">Email address</label>
            <input
              type="email"
              required
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`${input} h-9 text-xs`}
              disabled={loading}
              autoComplete="email"
            />
          </div>

          {authModalTab !== 'forgot' && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-mute">Password</label>
                {authModalTab === 'signin' && (
                  <button
                    type="button"
                    onClick={() => handleTabChange('forgot')}
                    className="text-[11px] text-accent-400 hover:text-accent-300 transition-colors"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder={authModalTab === 'signup' ? 'At least 6 characters' : 'Your password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`${input} h-9 text-xs pr-9`}
                  disabled={loading}
                  autoComplete={authModalTab === 'signup' ? 'new-password' : 'current-password'}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-mute hover:text-white p-1"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  <Icon name={showPassword ? 'x' : 'type'} size={14} />
                </button>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className={`${btnPrimary} w-full h-9 mt-2 text-xs font-medium justify-center`}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Please wait…
              </span>
            ) : authModalTab === 'signin' ? (
              'Sign In'
            ) : authModalTab === 'signup' ? (
              'Create Account'
            ) : (
              'Send Reset Link'
            )}
          </button>
        </form>

        {/* Footer switches */}
        <div className="mt-5 text-center text-xs text-mute border-t border-line pt-4">
          {authModalTab === 'forgot' ? (
            <button
              type="button"
              onClick={() => handleTabChange('signin')}
              className="text-accent-400 hover:text-accent-300 font-medium transition-colors"
            >
              ← Back to Sign In
            </button>
          ) : authModalTab === 'signin' ? (
            <span>
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => handleTabChange('signup')}
                className="text-accent-400 hover:text-accent-300 font-medium transition-colors"
              >
                Sign up free
              </button>
            </span>
          ) : (
            <span>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => handleTabChange('signin')}
                className="text-accent-400 hover:text-accent-300 font-medium transition-colors"
              >
                Sign in
              </button>
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
