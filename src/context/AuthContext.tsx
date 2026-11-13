import React, { createContext, useContext, useEffect, useState } from 'react'
import { authClient, UserSession } from '@/lib/auth'

interface AuthContextType {
  session: UserSession | null
  isLoading: boolean
  login: (data: Parameters<typeof authClient.signIn>[0]) => Promise<void>
  signup: (data: Parameters<typeof authClient.signUp>[0]) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<UserSession | null>(() => authClient.getSavedSession())
  const [isLoading, setIsLoading] = useState<boolean>(true)

  useEffect(() => {
    let mounted = true
    async function check() {
      try {
        const current = await authClient.getSession()
        if (mounted) {
          setSession(current)
        }
      } catch (err) {
        console.error('Erro ao verificar sessão:', err)
      } finally {
        if (mounted) {
          setIsLoading(false)
        }
      }
    }
    check()
    return () => {
      mounted = false
    }
  }, [])

  const login = async (params: Parameters<typeof authClient.signIn>[0]) => {
    const userSession = await authClient.signIn(params)
    setSession(userSession)
  }

  const signup = async (params: Parameters<typeof authClient.signUp>[0]) => {
    const userSession = await authClient.signUp(params)
    setSession(userSession)
  }

  const logout = async () => {
    await authClient.signOut()
    setSession(null)
  }

  return (
    <AuthContext.Provider value={{ session, isLoading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider')
  }
  return context
}

