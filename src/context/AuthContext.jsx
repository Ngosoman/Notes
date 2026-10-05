import { useEffect, useState } from 'react'
import { AuthContext } from './AuthContextValue.js'
import { signOut as signOutUser } from '../services/authService.js'
import { isSupabaseConfigured, supabase } from '../services/supabaseClient.js'

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [isLoading, setIsLoading] = useState(isSupabaseConfigured)
  const [sessionError, setSessionError] = useState(false)

  useEffect(() => {
    if (!supabase) return undefined

    let isActive = true
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (isActive) {
        setSession(nextSession)
        setSessionError(false)
        setIsLoading(false)
      }
    })

    supabase.auth.getSession()
      .then(({ data, error }) => {
        if (error) throw error
        if (isActive) setSession(data.session)
      })
      .catch((error) => {
        if (import.meta.env.DEV) console.error('Unable to restore the Supabase session.', error)
        if (isActive) setSessionError(true)
      })
      .finally(() => {
        if (isActive) setIsLoading(false)
      })

    return () => {
      isActive = false
      subscription.unsubscribe()
    }
  }, [])

  async function logout() {
    await signOutUser()
  }

  const value = {
    session,
    user: session?.user ?? null,
    isLoading,
    sessionError,
    isConfigured: isSupabaseConfigured,
    signOut: logout,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}