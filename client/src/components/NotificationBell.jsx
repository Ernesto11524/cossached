import { useEffect, useRef, useState } from 'react'
import { api, fmtDateTime } from '../lib/api.js'
import { T } from '../styles/tokens.js'

const TYPE_ICON = {
  message:      '💬',
  announcement: '📣',
  event:        '📅',
  resource:     '📁',
  welfare:      '🤲',
  system:       '🔔',
}

export default function NotificationBell({ onNavigate }) {
  const [open,    setOpen]   = useState(false)
  const [items,   setItems]  = useState([])
  const [unread,  setUnread] = useState(0)
  const ref = useRef(null)

  const loadCount = () =>
    api.get('/notifications/unread-count')
       .then(d => setUnread(d.unreadCount))
       .catch(() => {})

  const loadAll = () =>
    api.get('/notifications?limit=15')
       .then(d => { setItems(d.notifications); setUnread(d.unreadCount) })
       .catch(() => {})

  // Poll unread count every 15s
  useEffect(() => {
    loadCount()
    const id = setInterval(loadCount, 15000)
    return () => clearInterval(id)
  }, [])

  // When opened, load full list
  useEffect(() => {
    if (open) loadAll()
  }, [open])

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const handleClick = async (n) => {
    if (!n.read) {
      await api.post(`/notifications/${n.id}/read`, {}).catch(() => {})
      setItems(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x))
      setUnread(u => Math.max(0, u - 1))
    }
    setOpen(false)
    if (n.link && onNavigate) onNavigate(n.link)
  }

  const handleReadAll = async () => {
    await api.post('/notifications/read-all', {}).catch(() => {})
    setItems(prev => prev.map(n => ({ ...n, read: true })))
    setUnread(0)
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        className="notif-btn"
        onClick={() => setOpen(o => !o)}
        aria-label="Notifications"
      >
        🔔
        {unread > 0 && (
          <span style={{
            position: 'absolute', top: 4, right: 4,
            background: '#e34c26', color: '#fff',
            fontSize: 9.5, fontWeight: 700,
            borderRadius: 50, minWidth: 16, height: 16,
            padding: '0 4px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '2px solid #fff',
            lineHeight: 1,
          }}>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          style={{
            position: 'absolute', top: 'calc(100% + 8px)', right: 0,
            width: 360, maxWidth: 'calc(100vw - 2rem)',
            background: '#fff', borderRadius: 8,
            border: '1px solid rgba(122,58,24,.12)',
            boxShadow: '0 16px 48px rgba(30,15,8,.18)',
            zIndex: 200,
            overflow: 'hidden',
          }}
        >
          <div style={{ padding: '.9rem 1.1rem', borderBottom: '1px solid rgba(122,58,24,.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 14.5, color: T.brownDeep, fontWeight: 600 }}>
              Notifications
            </div>
            {unread > 0 && (
              <button
                type="button"
                onClick={handleReadAll}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: T.brownWarm, letterSpacing: '.05em', textTransform: 'uppercase', fontFamily: "'DM Sans',sans-serif", fontWeight: 600 }}
              >
                Mark all read
              </button>
            )}
          </div>

          <div style={{ maxHeight: 420, overflowY: 'auto' }}>
            {items.length === 0 ? (
              <div style={{ padding: '2.5rem 1rem', textAlign: 'center', color: T.brownPale, fontSize: 13 }}>
                No notifications yet.
              </div>
            ) : items.map(n => (
              <div
                key={n.id}
                onClick={() => handleClick(n)}
                style={{
                  display: 'flex', gap: '.8rem',
                  padding: '.8rem 1.1rem',
                  borderBottom: '1px solid rgba(122,58,24,.05)',
                  cursor: 'pointer',
                  background: n.read ? 'transparent' : 'rgba(201,168,76,.06)',
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#FAF5EC'}
                onMouseLeave={e => e.currentTarget.style.background = n.read ? 'transparent' : 'rgba(201,168,76,.06)'}
              >
                <div style={{ fontSize: '1.2rem', flexShrink: 0 }}>{TYPE_ICON[n.type] || '🔔'}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: n.read ? 400 : 600, color: T.brownDeep, lineHeight: 1.35 }}>
                    {n.title}
                  </div>
                  {n.body && (
                    <div style={{ fontSize: 12, color: T.textMid, marginTop: 2, lineHeight: 1.45 }}>
                      {n.body}
                    </div>
                  )}
                  <div style={{ fontSize: 10.5, color: T.brownPale, marginTop: 4 }}>
                    {fmtDateTime(n.createdAt)}
                  </div>
                </div>
                {!n.read && (
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#e34c26', flexShrink: 0, marginTop: 6 }} />
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
