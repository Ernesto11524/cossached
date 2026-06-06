import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import {
  startAuthentication,
  browserSupportsWebAuthn,
} from '@simplewebauthn/browser'
import { useAuth } from '../context/AuthContext.jsx'
import { T } from '../styles/tokens.js'

export default function LoginPage() {
  const { user, login } = useAuth()
  const navigate = useNavigate()

  const [form,    setForm]    = useState({ staffId: '', password: '' })
  const [error,   setError]   = useState('')
  const [loading, setLoading] = useState(false)
  const [bioBusy, setBioBusy] = useState(false)

  // Already authenticated — go straight to the portal
  if (user) return <Navigate to="/portal" replace />

  const handleChange = (field) => (e) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/auth/login', {
        method:      'POST',
        headers:     { 'Content-Type': 'application/json' },
        credentials: 'include',
        body:        JSON.stringify(form),
      })
      const text = await res.text()
      const data = text ? JSON.parse(text) : {}
      if (!res.ok) throw new Error(data.error || `Login failed (HTTP ${res.status}).`)
      login(data.user)
      navigate('/portal', { replace: true })
    } catch (err) {
      // SyntaxError = empty/non-JSON body, TypeError = network unreachable
      if (err.name === 'SyntaxError' || err.name === 'TypeError') {
        setError("Can't reach the server. Is the backend running on http://localhost:3001?")
      } else {
        setError(err.message)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleBiometric = async () => {
    setError('')
    if (!form.staffId.trim()) {
      setError('Enter your Staff ID first, then tap "Sign in with biometrics".')
      return
    }
    setBioBusy(true)
    try {
      // 1. Ask server for auth options + the user it identifies
      const r1 = await fetch('/api/webauthn/login-options', {
        method:      'POST',
        headers:     { 'Content-Type': 'application/json' },
        credentials: 'include',
        body:        JSON.stringify({ staffId: form.staffId.trim() }),
      })
      const text1 = await r1.text()
      const data1 = text1 ? JSON.parse(text1) : {}
      if (!r1.ok) throw new Error(data1.error || 'Biometric sign-in not available for this account.')

      // 2. Browser unlocks credential (fingerprint, face, etc.)
      const response = await startAuthentication(data1.options)

      // 3. Server verifies + issues JWT cookie
      const r2 = await fetch('/api/webauthn/login-verify', {
        method:      'POST',
        headers:     { 'Content-Type': 'application/json' },
        credentials: 'include',
        body:        JSON.stringify({ userId: data1.userId, response }),
      })
      const text2 = await r2.text()
      const data2 = text2 ? JSON.parse(text2) : {}
      if (!r2.ok) throw new Error(data2.error || 'Biometric sign-in failed.')

      login(data2.user)
      navigate('/portal', { replace: true })
    } catch (err) {
      if (err.name === 'NotAllowedError' || err.name === 'AbortError') {
        setError('Biometric sign-in was cancelled.')
      } else {
        setError(err.message || 'Biometric sign-in failed.')
      }
    } finally {
      setBioBusy(false)
    }
  }

  const webauthnSupported = browserSupportsWebAuthn()

  return (
    <div className="auth-page">
      <div className="auth-card fade-in">
        {/* Logo */}
        <div className="auth-logo">
          <div className="auth-logo-ring">C</div>
          <div>
            <b>COSSA-CHED Portal</b>
            <small>Member Login</small>
          </div>
        </div>

        <h2>Welcome Back</h2>
        <p className="auth-sub">
          Sign in with your COCOBOD Staff credentials to access the member portal.
        </p>

        {/* Error */}
        {error && <div className="auth-error">{error}</div>}

        {/* Form */}
        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label className="form-label" htmlFor="staffId">Staff ID or Email</label>
            <input
              id="staffId"
              className="form-input"
              placeholder="e.g. 1234567"
              value={form.staffId}
              onChange={handleChange('staffId')}
              autoComplete="username"
              required
            />
            <small style={{ display: 'block', marginTop: 4, fontSize: 11.5, color: T.brownPale }}>
              Use your COCOBOD staff number or your registered email.
            </small>
          </div>

          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <label className="form-label" htmlFor="password">Password</label>
              <Link
                to="/forgot-password"
                style={{ fontSize: 11.5, color: T.brownWarm, textDecoration: 'underline', fontWeight: 500 }}
              >
                Forgot password?
              </Link>
            </div>
            <input
              id="password"
              type="password"
              className="form-input"
              placeholder="••••••••"
              value={form.password}
              onChange={handleChange('password')}
              autoComplete="current-password"
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-gold"
            style={{ width: '100%', justifyContent: 'center', marginTop: '0.5rem' }}
            disabled={loading || bioBusy}
          >
            {loading ? 'Signing in…' : 'Sign In to Portal'}
          </button>
        </form>

        {webauthnSupported && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '.7rem', margin: '1.3rem 0 1rem' }}>
              <div style={{ flex: 1, height: 1, background: 'rgba(122,58,24,.12)' }} />
              <span style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: '.1em', textTransform: 'uppercase', color: T.brownPale }}>
                or
              </span>
              <div style={{ flex: 1, height: 1, background: 'rgba(122,58,24,.12)' }} />
            </div>

            <button
              type="button"
              className="btn btn-outline-dark"
              style={{ width: '100%', justifyContent: 'center' }}
              onClick={handleBiometric}
              disabled={loading || bioBusy}
            >
              {bioBusy ? 'Waiting for device…' : '🔐 Sign in with biometrics'}
            </button>
            <small style={{ display: 'block', marginTop: 6, fontSize: 11, color: T.brownPale, textAlign: 'center' }}>
              Enter your Staff ID above, then use your fingerprint, face, or device PIN.
            </small>
          </>
        )}

        <div className="auth-divider" />

        <p style={{ fontSize: 12.5, color: T.textMid, lineHeight: 1.6 }}>
          This portal is for confirmed CHED senior staff members only.{' '}
          <Link
            to="/contact"
            style={{ color: T.brownWarm, textDecoration: 'underline' }}
          >
            Contact us
          </Link>{' '}
          if you need assistance with your account.
        </p>
      </div>
    </div>
  )
}
