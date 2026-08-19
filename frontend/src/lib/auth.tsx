import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { api, clearToken, getToken, setToken } from '@/api/client'

export interface AuthUser {
  id: string
  email: string
  name: string
}

interface TokenResponse {
  access_token: string
  user: AuthUser
}

interface AuthState {
  user: AuthUser | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(() => getToken() !== null)

  useEffect(() => {
    if (getToken() === null) return
    api<AuthUser>('/api/me')
      .then(setUser)
      .catch(() => clearToken())
      .finally(() => setIsLoading(false))
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const response = await api<TokenResponse>('/api/auth/login', {
      method: 'POST',
      body: { email, password },
    })
    setToken(response.access_token)
    queryClient.clear()
    setUser(response.user)
  }, [queryClient])

  const register = useCallback(
    async (name: string, email: string, password: string) => {
      const response = await api<TokenResponse>('/api/auth/register', {
        method: 'POST',
        body: { name, email, password },
      })
      setToken(response.access_token)
      queryClient.clear()
      setUser(response.user)
    },
    [queryClient],
  )

  const logout = useCallback(() => {
    clearToken()
    queryClient.clear()
    setUser(null)
  }, [queryClient])

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
