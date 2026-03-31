import { createContext, useContext, useMemo, useState } from 'react'

const STORAGE_KEY = 'amp-reventa-session'

const AuthContext = createContext(null)

const demoUsers = [
  {
    id: 1,
    email: 'cliente@amprev.com',
    password: 'cliente123',
    role: 'client',
    name: 'Cliente Demo',
  },
  {
    id: 99,
    email: 'admin@amprev.com',
    password: 'admin123',
    role: 'admin',
    name: 'Administrador Demo',
  },
]

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

  const login = ({ email, password }) => {
    const normalizedEmail = email.trim().toLowerCase()
    const user = demoUsers.find(
      (candidate) =>
        candidate.email === normalizedEmail && candidate.password === password,
    )

    if (!user) {
      return {
        ok: false,
        message:
          'No encontramos esa combinación. Probá con cliente@amprev.com o admin@amprev.com.',
      }
    }

    const nextSession = {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextSession))
    setSession(nextSession)

    return { ok: true, role: user.role }
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
