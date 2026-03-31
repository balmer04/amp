import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export function ProtectedRoute({ allowedRole, children }) {
  const { isAuthenticated, session } = useAuth()
  const location = useLocation()

  if (!isAuthenticated) {
    return <Navigate to="/" replace state={{ from: location.pathname }} />
  }

  if (session.role !== allowedRole) {
    const fallbackPath = session.role === 'admin' ? '/admin' : '/cliente'
    return <Navigate to={fallbackPath} replace />
  }

  return children
}
