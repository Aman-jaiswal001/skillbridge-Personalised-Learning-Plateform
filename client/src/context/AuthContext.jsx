import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { apiRequest, clearSession, extractData, getStoredToken, getStoredUser, setSession } from '../api/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [token, setToken] = useState(getStoredToken())
  const [user, setUser] = useState(getStoredUser())
  const [booting, setBooting] = useState(Boolean(getStoredToken()))

  useEffect(() => {
    if (!token) {
      setBooting(false)
      return
    }
    apiRequest('/auth/me')
      .then((payload) => {
        const nextUser = extractData(payload).user
        setUser(nextUser)
        setSession({ token, user: nextUser })
      })
      .catch(() => {
        clearSession()
        setToken(null)
        setUser(null)
      })
      .finally(() => setBooting(false))
  }, [token])

  const login = useCallback(async ({ identifier, password }) => {
    const payload = await apiRequest('/auth/login', {
      method: 'POST',
      body: { identifier, password },
    })
    const data = extractData(payload)
    setSession(data)
    setToken(data.token)
    setUser(data.user)
    return data.user
  }, [])

  const register = useCallback(async (form) => {
    const payload = await apiRequest('/auth/register', {
      method: 'POST',
      body: form,
    })
    const data = extractData(payload)
    setSession(data)
    setToken(data.token)
    setUser(data.user)
    return data.user
  }, [])

  const logout = useCallback(() => {
    clearSession()
    setToken(null)
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({ booting, isAuthenticated: Boolean(token && user), login, logout, register, token, user, setUser }),
    [booting, login, logout, register, token, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
