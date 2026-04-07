import { createContext, useContext, useState, useCallback } from 'react'
import api from '../api/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('sdn_token'))
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('sdn_user') || 'null') } catch { return null }
  })

  const login = useCallback(async (username, password, mfa_code) => {
    const res = await api.post('/auth/login', { username, password, mfa_code })
    const { access_token, refresh_token } = res.data.data
    localStorage.setItem('sdn_token', access_token)
    localStorage.setItem('sdn_refresh', refresh_token)
    localStorage.setItem('sdn_user', JSON.stringify({ username }))
    setToken(access_token)
    setUser({ username })
    return res.data
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('sdn_token')
    localStorage.removeItem('sdn_refresh')
    localStorage.removeItem('sdn_user')
    setToken(null)
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ token, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
