import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase, supabaseConfigured } from './supabase'

export interface Profile {
  id: string
  display_name: string
  elo: number
  wins: number
  losses: number
  draws: number
}

interface AuthCtx {
  userId: string | null
  profile: Profile | null
  loading: boolean
  /** обновить профиль из БД (после изменения рейтинга/имени) */
  refreshProfile: () => Promise<void>
  signOut: () => Promise<void>
}

const Ctx = createContext<AuthCtx | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [userId, setUserId] = useState<string | null>(
    supabaseConfigured ? null : null,
  )
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!supabase) {
      // оффлайн-режим: только матч с ИИ, локальный гость
      setUserId('local')
      setProfile({ id: 'local', display_name: 'Гость', elo: 1200, wins: 0, losses: 0, draws: 0 })
      setLoading(false)
      return
    }
    const sb = supabase!
    const loadProfile = async (uid: string | null) => {
      if (!uid) {
        setProfile(null)
        return
      }
      const { data } = await sb.from('profiles').select('*').eq('id', uid).single()
      setProfile((data as Profile) ?? null)
    }

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const uid = session?.user?.id ?? null
      setUserId(uid)
      void loadProfile(uid)
      setLoading(false)
    })
    setLoading(false)
    return () => sub.subscription.unsubscribe()
  }, [])

  const value: AuthCtx = {
    userId,
    profile,
    loading,
    refreshProfile: async () => {
      if (userId) {
        const { data } = await supabase!.from('profiles').select('*').eq('id', userId).single()
        setProfile((data as Profile) ?? null)
      }
    },
    signOut: async () => {
      if (supabase) await supabase.auth.signOut()
    },
  }

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useAuth(): AuthCtx {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useAuth outside provider')
  return ctx
}
