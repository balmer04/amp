import { createContext, useContext, useMemo, useState } from 'react'

const STORAGE_KEY = 'amp-reventa-session'

const AuthContext = createContext(null)

function getStoredSession() {
  const saved = localStorage.getItem(STORAGE_KEY)

  if (!saved) {
    return null
  }

  try {
    return JSON.parse(saved)
  } catch {
    localStorage.removeItem(STORAGE_KEY)
    return null
  }
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(getStoredSession)

  const login = async ({ email, password }) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const result = await response.json()

      if (!result.ok) {
        return {
          ok: false,
          message: result.message || 'No encontramos esa combinación. Probá con cliente@amprev.com o admin@amprev.com.',
        }
      }

      const nextSession = {
        id: result.user.id,
        email: result.user.email,
        role: result.user.role,
        name: result.user.name,
        token: result.token,
      }

      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextSession))
      setSession(nextSession)

      return { ok: true, role: result.user.role }
    } catch (err) {
      return { ok: false, message: 'Error de conexión con el servidor.' }
    }
  }

  const logout = () => {
    localStorage.removeItem(STORAGE_KEY)
    setSession(null)
  }

  const value = useMemo(
    () => ({
      session,
      login,
      logout,
      isAuthenticated: Boolean(session),
    }),
    [session],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider')
  }

  return context
}
