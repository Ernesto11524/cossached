import { useState } from 'react'
import { Link } from 'react-router-dom'
import { T } from '../styles/tokens.js'

export default function ForgotPasswordPage() {
  const [input,   setInput]   = useState('')
  const [busy,    setBusy]    = useState(false)
  const [error,   setError]   = useState('')
  const [done,    setDone]    = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const res = await fetch('/api/password-reset/request', {
        method:      'POST',
        headers:     { 'Content-Type': 'application/json' },
        body:        JSON.stringify({ staffIdOrEmail: input }),
      })
      const text = await res.text()
      const data = text ? JSON.parse(text) : {}
      if (!res.ok) throw new Error(data.error || 'Request failed.')
      setDone(true)
    } catch (err) {
      if (err.name === 'TypeError') {
        setError("Can't reach the server. Try again in a moment.")
      } else {
        setError(err.message)
      }
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
            <small>Forgot Password</small>
          </div>
        </div>

        {done ? (
          <>
            <h2>Check Your Email</h2>
            <p className="auth-sub">
              If an account matches the Staff ID or email you entered, we've sent a password
              reset link. The link is valid for 30 minutes.
            </p>
            <div style={{ background: T.creamLight, borderRadius: 5, padding: '10px 13px', fontSize: 12, color: T.brownWarm, marginBottom: '1.5rem' }}>
              <strong>No email arrived?</strong> Check your spam folder, then contact the
              secretariat at <a href="mailto:cossa-ched@cocobod.gh" style={{ color: T.brownWarm }}>cossa-ched@cocobod.gh</a> if needed.
            </div>
            <Link to="/login" className="btn btn-gold" style={{ width: '100%', justifyContent: 'center' }}>
              Back to Sign In
            </Link>
          </>
        ) : (
          <>
            <h2>Reset Your Password</h2>
            <p className="auth-sub">
              Enter your Staff ID or registered email — we'll send you a link to set a new password.
            </p>

            {error && <div className="auth-error">{error}</div>}

            <form onSubmit={submit} noValidate>
              <div className="form-group">
                <label className="form-label">Staff ID or Email</label>
                <input
                  className="form-input"
                  placeholder="e.g. 1234567 or you@cocobod.gh"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <button
                type="submit"
                className="btn btn-gold"
                style={{ width: '100%', justifyContent: 'center' }}
                disabled={busy || !input.trim()}
              >
                {busy ? 'Sending…' : 'Send Reset Link'}
              </button>
            </form>

            <div className="auth-divider" />
            <Link to="/login" style={{ fontSize: 13, color: T.brownWarm, textDecoration: 'underline' }}>
              ← Back to Sign In
            </Link>
          </>
        )}
      </div>
    </div>
  )
}
