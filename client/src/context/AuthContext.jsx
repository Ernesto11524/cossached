import { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext(null)

/**
 * Wraps the app and exposes { user, loading, login, logout }.
 * On mount it calls /api/auth/me to rehydrate the session from the
 * httpOnly cookie — so the user stays logged in across page refreshes.
 */
export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (data?.user) setUser(data.user) })
      .catch(() => {}) // backend not running yet — silently skip
      .finally(() => setLoading(false))
  }, [])

  const login  = (userData) => setUser(userData)
  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }).catch(() => {})
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
