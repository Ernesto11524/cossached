import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { T } from '../styles/tokens.js'

function LoadingScreen() {
  return (
    <div
      style={{
        minHeight: '80vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <span
        style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: '1.1rem',
          color: T.brownPale,
          letterSpacing: '0.05em',
        }}
      >
        Loading…
      </span>
    </div>
  )
}

/**
 * Wraps any route that requires authentication.
 * Shows a spinner while the /api/auth/me check is in flight, then
 * either renders children (logged in) or redirects to /login.
 */
export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <LoadingScreen />
  if (!user)   return <Navigate to="/login" replace />
  return children
}
