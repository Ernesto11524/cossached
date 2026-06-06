import { useEffect, useState } from 'react'
import { api, fmtDateTime } from '../lib/api.js'
import { T } from '../styles/tokens.js'

export default function ContactMessagesTab() {
  const [items,    setItems]    = useState([])
  const [loading,  setLoading]  = useState(true)
  const [selected, setSelected] = useState(null)

  const load = () =>
    api.get('/contact/messages')
       .then(d => setItems(d.messages))
       .catch(() => {})
       .finally(() => setLoading(false))

  useEffect(() => { load() }, [])

  const remove = async (id) => {
    if (!confirm('Delete this message? It will be removed permanently.')) return
    await api.delete(`/contact/messages/${id}`).catch(() => {})
    setItems(prev => prev.filter(m => m.id !== id))
    if (selected?.id === id) setSelected(null)
  }

  if (loading) return <p style={{ color: T.brownPale, padding: '2rem 0' }}>Loading…</p>

  return (
    <div className="fade-in">
      <p style={{ fontSize: 13.5, color: T.textMid, marginBottom: '1.2rem' }}>
        Messages submitted via the <strong>Contact</strong> form on the public website appear here.
        Each message is also emailed to the secretariat (when SMTP is configured).
      </p>

      {items.length === 0 ? (
        <div style={{ background: T.white, borderRadius: 7, padding: '3rem', textAlign: 'center', border: `1px solid rgba(122,58,24,.08)` }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '.6rem' }}>📭</div>
          <p style={{ color: T.brownPale, fontSize: 13 }}>No contact messages yet.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: '1.4rem', alignItems: 'start' }}>
          {/* List */}
          <div className="widget" style={{ maxHeight: 'calc(100vh - 240px)', overflowY: 'auto' }}>
            <div className="widget-body" style={{ padding: 0 }}>
              {items.map(m => (
                <div
                  key={m.id}
                  onClick={() => setSelected(m)}
                  style={{
                    padding: '.9rem 1.1rem',
                    borderBottom: '1px solid rgba(122,58,24,.06)',
                    cursor: 'pointer',
                    background: selected?.id === m.id ? 'rgba(201,168,76,.08)' : 'transparent',
                  }}
                  onMouseEnter={e => { if (selected?.id !== m.id) e.currentTarget.style.background = '#FAF5EC' }}
                  onMouseLeave={e => { if (selected?.id !== m.id) e.currentTarget.style.background = 'transparent' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '.5rem', alignItems: 'baseline' }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: T.brownDeep, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {m.firstName} {m.lastName}
                    </div>
                    <div style={{ fontSize: 10.5, color: T.brownPale, flexShrink: 0 }}>{fmtDateTime(m.createdAt)}</div>
                  </div>
                  <div style={{ fontSize: 12, color: T.brownWarm, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {m.subject}
                  </div>
                  <div style={{ fontSize: 11.5, color: T.textMid, marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {m.message}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Detail */}
          <div className="widget">
            {!selected ? (
              <div style={{ padding: '3rem 1rem', textAlign: 'center', color: T.brownPale, fontSize: 13 }}>
                Select a message to view the full content.
              </div>
            ) : (
              <div style={{ padding: '1.4rem' }}>
                <div style={{ marginBottom: '1rem' }}>
                  <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.2rem', color: T.brownDeep, fontWeight: 600 }}>
                    {selected.subject}
                  </div>
                  <div style={{ fontSize: 12.5, color: T.brownPale, marginTop: 4 }}>
                    From <strong style={{ color: T.brownWarm }}>{selected.firstName} {selected.lastName}</strong> &lt;
                    <a href={`mailto:${selected.email}`} style={{ color: T.brownWarm }}>{selected.email}</a>
                    &gt; · {fmtDateTime(selected.createdAt)}
                  </div>
                </div>

                <div style={{ fontSize: 14, color: T.textDark, lineHeight: 1.7, whiteSpace: 'pre-wrap', padding: '1rem', background: T.creamLight, borderRadius: 6, marginBottom: '1rem' }}>
                  {selected.message}
                </div>

                <div style={{ display: 'flex', gap: '.5rem' }}>
                  <a
                    className="btn btn-gold btn-sm"
                    href={`mailto:${selected.email}?subject=Re: ${encodeURIComponent(selected.subject)}`}
                    style={{ textDecoration: 'none' }}
                  >
                    Reply via Email
                  </a>
                  <button
                    type="button"
                    onClick={() => remove(selected.id)}
                    style={{ border: '1.5px solid #fca5a5', color: '#b91c1c', background: 'none', borderRadius: 3, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif", fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', fontSize: 11, padding: '8px 14px' }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
