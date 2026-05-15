import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { getDemoLoginHint } from '../lib/brandConfig'

const STORAGE_KEY = 'nexoft-session'
const LEGACY_STORAGE_KEY = 'amp-reventa-session'

// Backward-compat migration (one-shot): remove old key first, then write new.
function migrateLegacyKey() {
  if (typeof localStorage === 'undefined') return
  try {
    const legacy = localStorage.getItem(LEGACY_STORAGE_KEY)
    if (!legacy) return
    if (localStorage.getItem(STORAGE_KEY)) {
      localStorage.removeItem(LEGACY_STORAGE_KEY)
      return
    }
    localStorage.removeItem(LEGACY_STORAGE_KEY)
    try {
      localStorage.setItem(STORAGE_KEY, legacy)
    } catch {
      // Quota tight; user will just need to log in again.
    }
  } catch {
    // localStorage unavailable.
  }
}
migrateLegacyKey()

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

function buildSessionFromResult(result) {
  return {
    id: result.user.id,
    email: result.user.email,
    role: result.user.role,
    name: result.user.name,
    token: result.token,
    profile: result.profile ?? null,
  }
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(getStoredSession)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const persistSession = (result) => {
    const nextSession = buildSessionFromResult(result)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextSession))
    setSession(nextSession)
    return nextSession
  }

  const clearSession = () => {
    localStorage.removeItem(STORAGE_KEY)
    setSession(null)
  }

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
          message:
            result.message ||
            `No encontramos esa combinación. ${getDemoLoginHint()}`,
        }
      }

      persistSession(result)

      return { ok: true, role: result.user.role }
    } catch {
      return { ok: false, message: 'Error de conexion con el servidor.' }
    }
  }

  const register = async (payload) => {
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const result = await response.json()

      if (!result.ok) {
        return {
          ok: false,
          message: result.message || 'No se pudo crear la cuenta en este momento.',
        }
      }

      persistSession(result)

      return { ok: true, role: result.user.role }
    } catch {
      return { ok: false, message: 'Error de conexion con el servidor.' }
    }
  }

  const updateProfile = async (payload) => {
    if (!session?.token) {
      return { ok: false, message: 'No hay una sesion activa.' }
    }

    try {
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${session.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      const result = await response.json()

      if (!response.ok || !result.ok) {
        return {
          ok: false,
          message: result.message || 'No se pudo actualizar el perfil.',
        }
      }

      const nextSession = {
        ...session,
        name: result.user?.name ?? session.name,
        profile: result.profile ?? session.profile ?? null,
      }

      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextSession))
      setSession(nextSession)

      return { ok: true, session: nextSession }
    } catch {
      return { ok: false, message: 'Error de conexion con el servidor.' }
    }
  }

  const refreshSession = async () => {
    if (!session?.token) {
      return { ok: false }
    }

    setIsRefreshing(true)

    try {
      const response = await fetch('/api/auth/me', {
        headers: {
          Authorization: `Bearer ${session.token}`,
        },
      })

      const result = await response.json()

      if (!response.ok || !result.ok) {
        clearSession()
        return { ok: false, message: result.message || 'La sesion ya no es valida.' }
      }

      const nextSession = {
        ...session,
        id: result.user.id,
        email: result.user.email,
        role: result.user.role,
        name: result.user.name,
        profile: result.profile ?? session.profile ?? null,
      }

      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextSession))
      setSession(nextSession)

      return { ok: true, session: nextSession }
    } catch {
      clearSession()
      return { ok: false, message: 'No se pudo validar la sesion actual.' }
    } finally {
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    if (!session?.token) {
      return
    }

    // Validate token in background. If it fails (network/backend issue),
    // we silently keep the local session so the UI doesn't blank out.
    // ProtectedRoute will redirect to /login if isAuthenticated becomes false.
    refreshSession().catch(() => {
      // noop — refreshSession already handles errors internally
    })
  }, [])

  const logout = () => {
    clearSession()
  }

  const value = useMemo(
    () => ({
      session,
      login,
      register,
      updateProfile,
      refreshSession,
      logout,
      isRefreshing,
      isAuthenticated: Boolean(session),
    }),
    [session, isRefreshing],
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
