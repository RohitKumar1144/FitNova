import { useEffect, useState } from 'react'
import { supabase } from './client'
import type { User, Session, AuthChangeEvent } from '@supabase/supabase-js'

export async function signUpWithEmail(email: string, password: string) {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('fitnova_demo_mode')
  }
  const { data: { session } } = await supabase.auth.getSession()
  if (session) {
    await supabase.auth.signOut()
  }

  return await supabase.auth.signUp({
    email,
    password,
  })
}

export async function signInWithEmail(email: string, password: string) {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('fitnova_demo_mode')
  }
  const { data: { session } } = await supabase.auth.getSession()
  if (session) {
    await supabase.auth.signOut()
  }

  return await supabase.auth.signInWithPassword({
    email,
    password,
  })
}

export async function signInAsDemoUser(): Promise<{ data: Session | null; error: Error | null }> {
  try {
    const { data, error } = await supabase.functions.invoke('demo-login', {
      method: 'POST',
    })

    if (error) {
      return { data: null, error: new Error(error.message || 'Failed to authenticate demo user.') }
    }

    if (data?.session?.access_token && data?.session?.refresh_token) {
      const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      })

      if (sessionError) {
        return { data: null, error: sessionError }
      }

      if (typeof window !== 'undefined') {
        localStorage.setItem('fitnova_demo_mode', 'true')
      }

      return { data: sessionData.session, error: null }
    }

    return {
      data: null,
      error: new Error(data?.error || 'Failed to receive demo session tokens.'),
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unexpected demo login error.'
    return { data: null, error: new Error(msg) }
  }
}

export const DEMO_USER_ID = '1967e645-513a-45b9-a1db-cbcbd7ccebd0'
export const DEMO_USER_EMAIL = 'rhtk.6772@gmail.com'
export const DEFAULT_DEMO_EMAIL = 'demo@fitnova.app'

export function isDemoMode(user?: User | null): boolean {
  if (typeof window !== 'undefined' && localStorage.getItem('fitnova_demo_mode') === 'true') {
    return true
  }
  if (user?.id && user.id === DEMO_USER_ID) {
    return true
  }
  if (user?.email) {
    const emailLower = user.email.toLowerCase()
    if (emailLower === DEMO_USER_EMAIL || emailLower === DEFAULT_DEMO_EMAIL) {
      return true
    }
  }
  return false
}

export async function signOut() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('fitnova_demo_mode')
  }
  return await supabase.auth.signOut()
}

export async function getCurrentUser(): Promise<User | null> {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function getCurrentSession(): Promise<Session | null> {
  const { data: { session } } = await supabase.auth.getSession()
  return session
}

export function onAuthStateChange(callback: (event: AuthChangeEvent, session: Session | null) => void) {
  return supabase.auth.onAuthStateChange(callback)
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    async function initAuth() {
      try {
        const { data: { session: initialSession } } = await supabase.auth.getSession()
        if (isMounted) {
          setSession(initialSession)
          setUser(initialSession?.user ?? null)
        }
      } catch (err) {
        console.error('Error fetching session:', err)
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    initAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      if (isMounted) {
        setSession(currentSession)
        setUser(currentSession?.user ?? null)
        setLoading(false)
      }
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [])

  return {
    user,
    session,
    loading,
    isAuthenticated: !!session,
  }
}