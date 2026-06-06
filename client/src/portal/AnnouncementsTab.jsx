import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { api, fmtDate } from '../lib/api.js'
import { T } from '../styles/tokens.js'

const CATEGORIES = ['Urgent', 'Welfare', 'Document', 'Policy', 'General']

export default function AnnouncementsTab() {
  const { user } = useAuth()
  const isAdmin  = user?.role === 'ADMIN'

  const [items,   setItems]   = useState([])
  const [loading, setLoading] = useState(true)
  const [form,    setForm]    = useState({ title: '', body: '', category: CATEGORIES[0] })
  const [posting, setPosting] = useState(false)
  const [showForm,setShowForm]= useState(false)
  const [error,   setError]   = useState('')

  const load = () =>
    api.get('/announcements')
       .then(d => setItems(d.announcements))
       .catch(() => {})
       .finally(() => setLoading(false))

  useEffect(() => { load() }, [])

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setPosting(true)
    try {
      await api.post('/announcements', form)
      setForm({ title: '', body: '', category: CATEGORIES[0] })
      setShowForm(false)
      load()
    } catch (err) {
      setError(err.message)
    } finally {
      setPosting(false)
    }
  }

  const remove = async (id) => {
    if (!confirm('Delete this announcement?')) return
    await api.delete(`/announcements/${id}`).catch(() => {})
    setItems(prev => prev.filter(a => a.id !== id))
  }

  if (loading) return <p style={{ color: T.brownPale, padding: '2rem 0' }}>Loading…</p>

  return (
    <div className="fade-in">
      {isAdmin && (
        <div style={{ marginBottom: '1.5rem' }}>
          <button className="btn btn-gold" onClick={() => setShowForm(s => !s)}>
            {showForm ? 'Cancel' : '+ Post Announcement'}
          </button>

          {showForm && (
            <form
              onSubmit={submit}
              style={{
                marginTop: '1.2rem', background: T.white, borderRadius: 8,
                padding: '1.8rem', border: `1px solid rgba(122,58,24,.1)`,
                maxWidth: 640,
              }}
            >
              {error && <div className="auth-error">{error}</div>}
              <div className="form-group">
                <label className="form-label">Category</label>
                <select className="form-select" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Title</label>
                <input className="form-input" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
              </div>
              <div className="form-group">
                <label className="form-label">Body</label>
                <textarea className="form-textarea" value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))} required />
              </div>
              <button type="submit" className="btn btn-gold" disabled={posting}>
                {posting ? 'Posting…' : 'Post Announcement'}
              </button>
            </form>
          )}
        </div>
      )}

      <div className="widget">
        <div className="widget-header"><h3>All Announcements</h3></div>
        <div className="widget-body">
          {items.length === 0 ? (
            <p style={{ color: T.brownPale, fontSize: 13 }}>No announcements yet.</p>
          ) : items.map(a => (
            <div
              key={a.id}
              style={{
                padding: '1.1rem 1.2rem', borderRadius: 6, marginBottom: '.7rem',
                border: `1px solid rgba(122,58,24,.09)`, background: T.creamLight,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <span className="tag-pill" style={{ background: T.creamDeep, color: T.brownWarm, marginBottom: '.4rem', display: 'inline-block' }}>
                    {a.category}
                  </span>
                  <div style={{ fontWeight: 500, color: T.brownDeep, fontSize: 14, marginBottom: '.3rem' }}>{a.title}</div>
                  <div style={{ fontSize: 13, color: T.textMid, lineHeight: 1.6, marginBottom: '.3rem' }}>{a.body}</div>
                  <div style={{ fontSize: 11, color: T.brownPale }}>{fmtDate(a.createdAt)} · {a.author?.name}</div>
                </div>
                {isAdmin && (
                  <button
                    className="btn btn-outline-dark btn-sm"
                    style={{ flexShrink: 0, color: '#b91c1c', borderColor: '#fca5a5' }}
                    onClick={() => remove(a.id)}
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
