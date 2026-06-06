import { useEffect, useState } from 'react'
import { T } from '../styles/tokens.js'

const STORAGE_KEY = 'chedssa_push_decision'

/**
 * One-shot prompt the first time a user lands in the portal — asks
 * whether they want browser notifications.  Stores their decision in
 * localStorage so we never nag again.  Browser permission is actually
 * requested only if they say yes.
 */
export default function PushPrompt() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (typeof Notification === 'undefined') return // unsupported (e.g. iOS Safari)
    const decided = localStorage.getItem(STORAGE_KEY)
    if (decided) return
    if (Notification.permission === 'granted' || Notification.permission === 'denied') {
      localStorage.setItem(STORAGE_KEY, Notification.permission)
      return
    }
    // First-time visitor — show the gentle in-app prompt
    const t = setTimeout(() => setShow(true), 1500)
    return () => clearTimeout(t)
  }, [])

  const enable = async () => {
    setShow(false)
    try {
      const perm = await Notification.requestPermission()
      localStorage.setItem(STORAGE_KEY, perm)
      if (perm === 'granted') {
        new Notification('COSSA-CHED notifications enabled', {
          body: "We'll let you know about new messages, announcements, and events.",
          icon: '/favicon.svg',
        })
      }
    } catch {
      localStorage.setItem(STORAGE_KEY, 'denied')
    }
  }

  const decline = () => {
    setShow(false)
    localStorage.setItem(STORAGE_KEY, 'declined')
  }

  if (!show) return null

  return (
    <div
      style={{
        position: 'fixed', bottom: 24, right: 24,
        zIndex: 250,
        background: '#fff', borderRadius: 10,
        border: `1px solid rgba(122,58,24,.12)`,
        boxShadow: '0 16px 48px rgba(30,15,8,.18)',
        padding: '1.1rem 1.2rem',
        maxWidth: 320,
        animation: 'slideUp .3s ease',
      }}
    >
      <div style={{ display: 'flex', gap: '.7rem', alignItems: 'flex-start', marginBottom: '.8rem' }}>
        <div style={{ fontSize: '1.6rem' }}>🔔</div>
        <div>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '1rem', color: T.brownDeep, fontWeight: 600 }}>
            Enable notifications?
          </div>
          <div style={{ fontSize: 12.5, color: T.textMid, marginTop: 4, lineHeight: 1.5 }}>
            Get notified about new messages, announcements, events, and welfare updates — even when this tab is closed.
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: '.5rem', justifyContent: 'flex-end' }}>
        <button
          type="button"
          onClick={decline}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: T.brownPale, letterSpacing: '.05em', textTransform: 'uppercase', fontFamily: "'DM Sans',sans-serif", fontWeight: 600, padding: '6px 10px' }}
        >
          Not now
        </button>
        <button type="button" className="btn btn-gold btn-sm" onClick={enable}>
          Enable
        </button>
      </div>
    </div>
  )
}
