import React, { createContext, useContext, useEffect, useState } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase, isSupabaseConfigured } from '../lib/supabase'

export interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  isConfigured: boolean
  signUp: (email: string, pass: string, name?: string) => Promise<{ error: Error | null; needsEmailConfirmation?: boolean }>
  signIn: (email: string, pass: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<{ error: Error | null }>
  updatePassword: (password: string) => Promise<{ error: Error | null }>
  authModalOpen: boolean
  authModalTab: 'signin' | 'signup' | 'forgot'
  openAuthModal: (tab?: 'signin' | 'signup' | 'forgot') => void
  closeAuthModal: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(isSupabaseConfigured)
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [authModalTab, setAuthModalTab] = useState<'signin' | 'signup' | 'forgot'>('signin')

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false)
      return
    }

    // Get current session
    void supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen to auth state transitions
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const openAuthModal = (tab: 'signin' | 'signup' | 'forgot' = 'signin') => {
    setAuthModalTab(tab)
    setAuthModalOpen(true)
  }

  const closeAuthModal = () => {
    setAuthModalOpen(false)
  }

  const signUp = async (email: string, pass: string, name?: string) => {
    if (!isSupabaseConfigured) {
      return { error: new Error('Supabase authentication is not configured yet. Add your credentials in .env.') }
    }
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password: pass,
        options: {
          data: {
            full_name: name || '',
          },
        },
      })
      if (error) return { error }
      const needsEmailConfirmation = !data.session && !!data.user
      return { error: null, needsEmailConfirmation }
    } catch (e) {
      return { error: e instanceof Error ? e : new Error(String(e)) }
    }
  }

  const signIn = async (email: string, pass: string) => {
    if (!isSupabaseConfigured) {
      return { error: new Error('Supabase authentication is not configured yet. Add your credentials in .env.') }
    }
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password: pass,
      })
      return { error: error ?? null }
    } catch (e) {
      return { error: e instanceof Error ? e : new Error(String(e)) }
    }
  }

  const signOut = async () => {
    if (!isSupabaseConfigured) return
    try {
      await supabase.auth.signOut()
    } catch (e) {
      console.error('Error signing out:', e)
    }
  }

  const resetPassword = async (email: string) => {
    if (!isSupabaseConfigured) {
      return { error: new Error('Supabase authentication is not configured yet. Add your credentials in .env.') }
    }
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })
      return { error: error ?? null }
    } catch (e) {
      return { error: e instanceof Error ? e : new Error(String(e)) }
    }
  }

  const updatePassword = async (newPassword: string) => {
    if (!isSupabaseConfigured) {
      return { error: new Error('Supabase authentication is not configured yet. Add your credentials in .env.') }
    }
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      })
      return { error: error ?? null }
    } catch (e) {
      return { error: e instanceof Error ? e : new Error(String(e)) }
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        isConfigured: isSupabaseConfigured,
        signUp,
        signIn,
        signOut,
        resetPassword,
        updatePassword,
        authModalOpen,
        authModalTab,
        openAuthModal,
        closeAuthModal,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return ctx
}
