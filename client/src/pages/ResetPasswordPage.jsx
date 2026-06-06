import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { T } from '../styles/tokens.js'

export default function ResetPasswordPage() {
  const [search] = useSearchParams()
  const navigate = useNavigate()
  const token = search.get('token') || ''

  const [pw1,     setPw1]    = useState('')
  const [pw2,     setPw2]    = useState('')
  const [busy,    setBusy]   = useState(false)
  const [error,   setError]  = useState('')
  const [done,    setDone]   = useState(false)

  if (!token) {
    return (
      <div className="auth-page">
        <div className="auth-card fade-in">
          <h2>Invalid Reset Link</h2>
          <p className="auth-sub">
            This password reset link is missing its token. Request a new one from the
            <Link to="/forgot-password" style={{ color: T.brownWarm, marginLeft: 4 }}>forgot password page</Link>.
          </p>
        </div>
      </div>
    )
  }

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    if (pw1.length < 8) { setError('Password must be at least 8 characters.'); return }
    if (pw1 !== pw2)    { setError('Passwords do not match.'); return }
    setBusy(true)
    try {
      const res = await fetch('/api/password-reset/confirm', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ token, newPassword: pw1 }),
      })
      const text = await res.text()
      const data = text ? JSON.parse(text) : {}
      if (!res.ok) throw new Error(data.error || 'Reset failed.')
      setDone(true)
      setTimeout(() => navigate('/login', { replace: true }), 2500)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card fade-in">
        <div className="auth-logo">
          <div className="auth-logo-ring">C</div>
          <div>
            <b>COSSA-CHED Portal</b>
            <small>Set a New Password</small>
          </div>
        </div>

        {done ? (
          <>
            <h2>Password Updated</h2>
            <p className="auth-sub">
              Your password has been changed. Redirecting you to sign in…
            </p>
            <Link to="/login" className="btn btn-gold" style={{ width: '100%', justifyContent: 'center' }}>
              Sign In Now
            </Link>
          </>
        ) : (
          <>
            <h2>Set a New Password</h2>
            <p className="auth-sub">Choose a strong password with at least 8 characters.</p>

            {error && <div className="auth-error">{error}</div>}

            <form onSubmit={submit} noValidate>
              <div className="form-group">
                <label className="form-label">New Password</label>
                <input
                  type="password"
                  className="form-input"
                  placeholder="••••••••"
                  value={pw1}
                  onChange={e => setPw1(e.target.value)}
                  required
                  minLength={8}
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label className="form-label">Confirm Password</label>
                <input
                  type="password"
                  className="form-input"
                  placeholder="••••••••"
                  value={pw2}
                  onChange={e => setPw2(e.target.value)}
                  required
                />
              </div>

              <button
                type="submit"
                className="btn btn-gold"
                style={{ width: '100%', justifyContent: 'center' }}
                disabled={busy}
              >
                {busy ? 'Saving…' : 'Update Password'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
