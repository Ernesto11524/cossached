import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { api, fmtDate } from '../lib/api.js'
import { T } from '../styles/tokens.js'

const EVENT_TYPES = ['AGM', 'Training', 'Meeting', 'Social', 'Other']

export default function EventsTab() {
  const { user }  = useAuth()
  const isAdmin   = user?.role === 'ADMIN'

  const [events,   setEvents]   = useState([])
  const [loading,  setLoading]  = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form,     setForm]     = useState({ title: '', location: '', eventDate: '', type: EVENT_TYPES[0] })
  const [posting,  setPosting]  = useState(false)
  const [error,    setError]    = useState('')

  const load = () =>
    api.get('/events').then(d => setEvents(d.events)).catch(() => {}).finally(() => setLoading(false))

  useEffect(() => { load() }, [])

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setPosting(true)
    try {
      await api.post('/events', { ...form, eventDate: new Date(form.eventDate).toISOString() })
      setForm({ title: '', location: '', eventDate: '', type: EVENT_TYPES[0] })
      setShowForm(false)
      load()
    } catch (err) {
      setError(err.message)
    } finally {
      setPosting(false)
    }
  }

  const remove = async (id) => {
    if (!confirm('Delete this event?')) return
    await api.delete(`/events/${id}`).catch(() => {})
    setEvents(prev => prev.filter(e => e.id !== id))
  }

  const now = new Date()
  const upcoming = events.filter(e => new Date(e.eventDate) >= now)
  const past     = events.filter(e => new Date(e.eventDate) < now)

  const renderEvent = (e, isPast) => (
    <div
      key={e.id}
      style={{ display: 'flex', alignItems: 'center', gap: '1.2rem', padding: '1rem 0', borderBottom: '1px solid rgba(122,58,24,.07)' }}
    >
      {/* Date chip */}
      <div
        style={{
          background: isPast ? T.creamDeep : '#fdf6ee',
          borderRadius: 6, padding: '.7rem 1rem', textAlign: 'center', minWidth: 64,
          border: `1px solid ${isPast ? 'rgba(122,58,24,.1)' : 'rgba(201,168,76,.3)'}`,
        }}
      >
        <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.2rem', fontWeight: 700, color: isPast ? T.brownPale : T.brownDeep, lineHeight: 1 }}>
          {new Date(e.eventDate).getDate()}
        </div>
        <div style={{ fontSize: 10, color: T.brownPale, letterSpacing: '.08em', marginTop: 2 }}>
          {new Date(e.eventDate).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}
        </div>
      </div>

      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: isPast ? T.brownPale : T.brownDeep }}>{e.title}</div>
        <div style={{ fontSize: 12, color: T.brownPale, marginTop: 3 }}>📍 {e.location}</div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem' }}>
        <span className="tag-pill" style={{ background: isPast ? T.creamDeep : '#fef9ee', color: isPast ? T.brownPale : T.brownWarm, border: `1px solid ${isPast ? 'rgba(122,58,24,.15)' : 'rgba(201,168,76,.3)'}` }}>
          {isPast ? 'Past' : e.type}
        </span>
        {isAdmin && !isPast && (
          <button
            className="btn btn-sm"
            style={{ border: '1.5px solid #fca5a5', color: '#b91c1c', background: 'none', borderRadius: 3, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif", fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', fontSize: 10 }}
            onClick={() => remove(e.id)}
          >
            Delete
          </button>
        )}
      </div>
    </div>
  )

  if (loading) return <p style={{ color: T.brownPale, padding: '2rem 0' }}>Loading…</p>

  return (
    <div className="fade-in">
      {isAdmin && (
        <div style={{ marginBottom: '1.5rem' }}>
          <button className="btn btn-gold" onClick={() => setShowForm(s => !s)}>
            {showForm ? 'Cancel' : '+ Add Event'}
          </button>

          {showForm && (
            <form onSubmit={submit} style={{ marginTop: '1.2rem', background: T.white, borderRadius: 8, padding: '1.8rem', border: `1px solid rgba(122,58,24,.1)`, maxWidth: 560 }}>
              {error && <div className="auth-error">{error}</div>}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group" style={{ gridColumn: '1/-1' }}>
                  <label className="form-label">Event Title</label>
                  <input className="form-input" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
                </div>
                <div className="form-group" style={{ gridColumn: '1/-1' }}>
                  <label className="form-label">Location</label>
                  <input className="form-input" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Date & Time</label>
                  <input className="form-input" type="datetime-local" value={form.eventDate} onChange={e => setForm(f => ({ ...f, eventDate: e.target.value }))} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Type</label>
                  <select className="form-select" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                    {EVENT_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <button type="submit" className="btn btn-gold" disabled={posting}>
                {posting ? 'Saving…' : 'Add Event'}
              </button>
            </form>
          )}
        </div>
      )}

      <div className="widget">
        <div className="widget-header"><h3>Upcoming Events</h3></div>
        <div className="widget-body">
          {upcoming.length === 0
            ? <p style={{ fontSize: 13, color: T.brownPale }}>No upcoming events.</p>
            : upcoming.map(e => renderEvent(e, false))}
        </div>
      </div>

      {past.length > 0 && (
        <div className="widget" style={{ marginTop: '1.4rem' }}>
          <div className="widget-header"><h3>Past Events</h3></div>
          <div className="widget-body">
            {past.map(e => renderEvent(e, true))}
          </div>
        </div>
      )}
    </div>
  )
}
