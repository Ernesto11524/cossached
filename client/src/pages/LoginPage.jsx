import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import {
  startAuthentication,
  browserSupportsWebAuthn,
  browserSupportsWebAuthnAutofill,
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

  // If already authenticated → portal
  if (user) return <Navigate to="/portal" replace />

  const handleChange = (field) => (e) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }))

  // ── Common: take a server auth response and complete the login ──────────
  const completeLogin = async (response) => {
    const r = await fetch('/api/webauthn/login-verify', {
      method:      'POST',
      headers:     { 'Content-Type': 'application/json' },
      credentials: 'include',
      body:        JSON.stringify({ response }),
    })
    const text = await r.text()
    const data = text ? JSON.parse(text) : {}
    if (!r.ok) throw new Error(data.error || 'Biometric sign-in failed.')
    login(data.user)
    navigate('/portal', { replace: true })
  }

  // ── Auto-trigger conditional biometric on page load ─────────────────────
  // The browser quietly checks if there's a passkey for this site. If yes,
  // the user gets a passkey prompt the moment they focus the Staff ID input
  // (or immediately on some platforms). They never need to type anything.
  useEffect(() => {
    if (!browserSupportsWebAuthn()) return

    let cancelled = false
    let abortController

    ;(async () => {
      try {
        const autofill = await browserSupportsWebAuthnAutofill().catch(() => false)
        if (!autofill || cancelled) return

        const r = await fetch('/api/webauthn/discoverable-login-options', {
          method:      'POST',
          credentials: 'include',
        })
        if (!r.ok || cancelled) return
        const options = await r.json()

        // mediation: 'conditional' via the SDK's useBrowserAutofill flag
        abortController = new AbortController()
        const response = await startAuthentication(options, /* useBrowserAutofill */ true)
        if (cancelled) return
        await completeLogin(response)
      } catch (err) {
        // Silently ignore — most common reasons: no passkey saved on this
        // device, user dismissed the prompt, or browser doesn't support it.
        if (err?.name && err.name !== 'NotAllowedError' && err.name !== 'AbortError') {
          console.warn('[autofill] biometric autofill skipped:', err.message)
        }
      }
    })()

    return () => { cancelled = true; abortController?.abort() }
  }, [])

  // ── Password sign in ────────────────────────────────────────────────────
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
      if (err.name === 'SyntaxError' || err.name === 'TypeError') {
        setError("Can't reach the server. Please try again in a moment.")
      } else {
        setError(err.message)
      }
    } finally {
      setLoading(false)
    }
  }

  // ── Explicit biometric button — passwordless, no staffId required ──────
  const handleBiometric = async () => {
    setError('')
    setBioBusy(true)
    try {
      const r = await fetch('/api/webauthn/discoverable-login-options', {
        method:      'POST',
        credentials: 'include',
      })
      const data = r.ok ? await r.json() : await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(data.error || 'Biometric sign-in not available.')

      const response = await startAuthentication(data)
      await completeLogin(response)
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

        {error && <div className="auth-error">{error}</div>}

        {/* Biometric — top, prominent, no staffId required */}
        {webauthnSupported && (
          <>
            <button
              type="button"
              className="btn btn-gold"
              style={{ width: '100%', justifyContent: 'center', marginBottom: '1.1rem' }}
              onClick={handleBiometric}
              disabled={loading || bioBusy}
            >
              {bioBusy ? 'Waiting for device…' : '🔐 Sign in with biometrics'}
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '.7rem', margin: '0 0 1.1rem' }}>
              <div style={{ flex: 1, height: 1, background: 'rgba(122,58,24,.12)' }} />
              <span style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: '.1em', textTransform: 'uppercase', color: T.brownPale }}>
                or sign in manually
              </span>
              <div style={{ flex: 1, height: 1, background: 'rgba(122,58,24,.12)' }} />
            </div>
          </>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label className="form-label" htmlFor="staffId">Staff ID or Email</label>
            <input
              id="staffId"
              className="form-input"
              placeholder="e.g. 1234567"
              value={form.staffId}
              onChange={handleChange('staffId')}
              autoComplete="username webauthn"
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
            className="btn btn-outline-dark"
            style={{ width: '100%', justifyContent: 'center', marginTop: '0.5rem' }}
            disabled={loading || bioBusy}
          >
            {loading ? 'Signing in…' : 'Sign In to Portal'}
          </button>
        </form>

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
