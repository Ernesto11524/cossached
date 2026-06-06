import { useEffect, useState } from 'react'
import {
  startRegistration,
  browserSupportsWebAuthn,
} from '@simplewebauthn/browser'
import { api } from '../lib/api.js'
import { T } from '../styles/tokens.js'

export default function BiometricSection() {
  const supported = browserSupportsWebAuthn()

  const [list,     setList]     = useState([])
  const [loading,  setLoading]  = useState(true)
  const [enrolling, setEnrolling] = useState(false)
  const [msg,      setMsg]      = useState('')
  const [err,      setErr]      = useState('')

  const load = () =>
    api.get('/webauthn/authenticators')
       .then(d => setList(d.authenticators))
       .catch(() => {})
       .finally(() => setLoading(false))

  useEffect(() => { load() }, [])

  const enroll = async () => {
    setErr('')
    setMsg('')
    setEnrolling(true)
    try {
      const options = await api.post('/webauthn/register-options', {})
      const response = await startRegistration({ optionsJSON: options })
      await api.post('/webauthn/register-verify', {
        response,
        deviceName: navigator.platform || 'This device',
      })
      setMsg('Biometric login set up successfully. You can now sign in with your device.')
      load()
    } catch (e) {
      // User-cancelled, no platform authenticator, etc.
      if (e.name === 'NotAllowedError' || e.name === 'AbortError') {
        setErr('Setup was cancelled.')
      } else {
        setErr(e.message || 'Could not set up biometric login.')
      }
    } finally {
      setEnrolling(false)
    }
  }

  const remove = async (id) => {
    if (!confirm('Remove this biometric login? You can re-enroll any time.')) return
    try {
      await api.delete(`/webauthn/authenticators/${id}`)
      load()
    } catch (e) {
      alert(e.message)
    }
  }

  return (
    <div style={{ background: T.white, borderRadius: 8, padding: '2rem', border: `1px solid rgba(122,58,24,.09)`, marginTop: '1.5rem' }}>
      <h3 className="serif" style={{ fontSize: '1.1rem', color: T.brownDeep, marginBottom: '.3rem' }}>
        Biometric Login
      </h3>
      <p style={{ fontSize: 13, color: T.textMid, marginBottom: '1.2rem', lineHeight: 1.6 }}>
        Sign in with your fingerprint, face scan, or device PIN — no password required.
        Works with Windows Hello, Touch ID / Face ID, and Android biometrics.
      </p>

      {!supported && (
        <div className="auth-error">
          Your browser doesn't support biometric login. Try Chrome, Edge, Safari, or Firefox on a recent version.
        </div>
      )}

      {msg && <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 4, padding: '9px 12px', fontSize: 13, color: '#166534', marginBottom: '1rem' }}>{msg}</div>}
      {err && <div className="auth-error">{err}</div>}

      {!loading && (
        <>
          {list.length > 0 && (
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: T.brownPale, marginBottom: '.5rem' }}>
                Enrolled devices
              </div>
              {list.map(a => (
                <div
                  key={a.id}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '.7rem .9rem', borderRadius: 5, marginBottom: '.4rem',
                    background: T.creamLight, border: '1px solid rgba(122,58,24,.07)',
                  }}
                >
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: T.brownDeep }}>
                      🔐 {a.deviceName || 'Unknown device'}
                    </div>
                    <div style={{ fontSize: 11, color: T.brownPale, marginTop: 2 }}>
                      Added {new Date(a.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn btn-sm"
                    style={{ border: '1.5px solid #fca5a5', color: '#b91c1c', background: 'none', borderRadius: 3, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif", fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', fontSize: 11 }}
                    onClick={() => remove(a.id)}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}

          <button
            type="button"
            className="btn btn-gold"
            onClick={enroll}
            disabled={!supported || enrolling}
          >
            {enrolling ? 'Waiting for device…' : (list.length === 0 ? 'Set Up Biometric Login' : '+ Add Another Device')}
          </button>
        </>
      )}
    </div>
  )
}
