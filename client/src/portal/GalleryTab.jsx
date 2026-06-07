import { useEffect, useState, useRef } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { api, fmtDate } from '../lib/api.js'
import { T } from '../styles/tokens.js'
import Avatar from '../components/Avatar.jsx'

export default function GalleryTab() {
  const { user } = useAuth()
  const isAdmin  = user?.role === 'ADMIN'

  const [items,   setItems]   = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [showForm, setShowForm] = useState(false)

  const load = () =>
    api.get('/gallery')
       .then(d => setItems(d.items))
       .catch(() => {})
       .finally(() => setLoading(false))

  useEffect(() => { load() }, [])

  if (loading) return <p style={{ color: T.brownPale, padding: '2rem 0' }}>Loading…</p>

  return (
    <div className="fade-in">
      <p style={{ fontSize: 13.5, color: T.textMid, marginBottom: '1.2rem', maxWidth: 700, lineHeight: 1.65 }}>
        A private archive of COSSA-CHED's history — photos and videos from past events, initiatives,
        and milestones. Visible to members only.
      </p>

      {isAdmin && (
        <button className="btn btn-gold" onClick={() => setShowForm(true)} style={{ marginBottom: '1.5rem' }}>
          + Upload Photo / Video
        </button>
      )}

      {items.length === 0 ? (
        <div style={{ background: T.white, borderRadius: 7, padding: '3rem', textAlign: 'center', border: `1px solid rgba(122,58,24,.08)` }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '.6rem' }}>📸</div>
          <p style={{ color: T.brownPale, fontSize: 13 }}>
            No photos or videos yet.{isAdmin ? ' Click "Upload" to add the first one.' : ''}
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem' }}>
          {items.map(item => (
            <GalleryCard key={item.id} item={item} onOpen={() => setSelected(item)} />
          ))}
        </div>
      )}

      {selected && (
        <ViewModal
          item={selected}
          isAdmin={isAdmin}
          onClose={() => setSelected(null)}
          onDeleted={() => { setSelected(null); load() }}
        />
      )}

      {showForm && (
        <UploadModal
          onClose={() => setShowForm(false)}
          onUploaded={() => { setShowForm(false); load() }}
        />
      )}
    </div>
  )
}

// ── Gallery card thumbnail ──────────────────────────────────────────────
function GalleryCard({ item, onOpen }) {
  return (
    <div
      onClick={onOpen}
      style={{
        background: T.white,
        borderRadius: 6,
        overflow: 'hidden',
        border: '1px solid rgba(122,58,24,.08)',
        cursor: 'pointer',
        transition: 'transform .2s, box-shadow .2s',
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 22px rgba(30,15,8,.1)' }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none' }}
    >
      <div style={{ aspectRatio: '4/3', overflow: 'hidden', background: T.brownDeep, position: 'relative' }}>
        {item.mediaType === 'video' ? (
          <>
            <video
              src={item.mediaUrl}
              muted
              preload="metadata"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
            <div style={{
              position: 'absolute', top: '50%', left: '50%',
              transform: 'translate(-50%, -50%)',
              fontSize: 36, color: '#fff', textShadow: '0 2px 8px rgba(0,0,0,0.6)',
              pointerEvents: 'none',
            }}>▶</div>
          </>
        ) : (
          <img
            src={item.mediaUrl}
            alt={item.title}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            loading="lazy"
          />
        )}
      </div>
      <div style={{ padding: '.7rem .85rem' }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: T.brownDeep, lineHeight: 1.3, marginBottom: 3 }}>
          {item.title}
        </div>
        <div style={{ fontSize: 11, color: T.brownPale, marginBottom: '.4rem' }}>
          {item.category ? `${item.category} · ` : ''}{fmtDate(item.createdAt)}
        </div>
        {item.tags.length > 0 && (
          <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', marginTop: '.3rem' }}>
            {item.tags.slice(0, 3).map(t => (
              <span key={t.id} style={{
                fontSize: 9.5, fontWeight: 600, padding: '2px 6px',
                background: T.creamDeep, color: T.brownWarm,
                borderRadius: 10, whiteSpace: 'nowrap',
              }}>
                {t.name.split(' ')[0]}
              </span>
            ))}
            {item.tags.length > 3 && (
              <span style={{ fontSize: 9.5, color: T.brownPale }}>+{item.tags.length - 3}</span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── View modal — full size with full tag list ───────────────────────────
function ViewModal({ item, isAdmin, onClose, onDeleted }) {
  const remove = async () => {
    if (!confirm(`Delete "${item.title}"? This cannot be undone.`)) return
    try {
      await api.delete(`/gallery/${item.id}`)
      onDeleted()
    } catch (err) {
      alert(err.message)
    }
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 500,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1.5rem', cursor: 'pointer',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: T.white, borderRadius: 10, maxWidth: 920, width: '100%',
          maxHeight: '92vh', overflow: 'hidden',
          display: 'flex', flexDirection: 'column', cursor: 'default',
          position: 'relative',
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: 12, right: 12, zIndex: 1,
            background: 'rgba(0,0,0,0.5)', color: '#fff', border: 'none',
            width: 36, height: 36, borderRadius: 18, fontSize: 18, cursor: 'pointer',
          }}
        >✕</button>

        <div style={{ background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', maxHeight: '60vh', overflow: 'hidden' }}>
          {item.mediaType === 'video' ? (
            <video src={item.mediaUrl} controls autoPlay style={{ maxWidth: '100%', maxHeight: '60vh' }} />
          ) : (
            <img src={item.mediaUrl} alt={item.title} style={{ maxWidth: '100%', maxHeight: '60vh', objectFit: 'contain' }} />
          )}
        </div>

        <div style={{ padding: '1.2rem 1.4rem', overflow: 'auto' }}>
          <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.3rem', color: T.brownDeep, marginBottom: '.3rem' }}>
            {item.title}
          </h3>
          <div style={{ fontSize: 12, color: T.brownPale, marginBottom: '.8rem' }}>
            {item.category ? `${item.category} · ` : ''}{fmtDate(item.createdAt)} · by {item.uploadedBy?.name}
          </div>
          {item.caption && (
            <p style={{ fontSize: 14, color: T.textDark, lineHeight: 1.65, marginBottom: '1rem', whiteSpace: 'pre-wrap' }}>
              {item.caption}
            </p>
          )}

          {item.tags.length > 0 && (
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: T.brownPale, marginBottom: '.5rem' }}>
                Tagged ({item.tags.length})
              </div>
              <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
                {item.tags.map(t => (
                  <div
                    key={t.id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '4px 10px 4px 4px',
                      background: T.creamDeep, color: T.brownWarm,
                      borderRadius: 50, fontSize: 12, fontWeight: 600,
                    }}
                  >
                    <Avatar name={t.name} avatarFilename={t.avatarFilename} size={22} />
                    {t.name}
                  </div>
                ))}
              </div>
            </div>
          )}

          {isAdmin && (
            <button
              type="button"
              onClick={remove}
              style={{ background: '#b91c1c', color: '#fff', border: 'none', borderRadius: 3, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif", fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', fontSize: 11, padding: '8px 14px' }}
            >
              🗑 Delete
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Upload modal ──────────────────────────────────────────────────────────
function UploadModal({ onClose, onUploaded }) {
  const [file,     setFile]     = useState(null)
  const [title,    setTitle]    = useState('')
  const [caption,  setCaption]  = useState('')
  const [category, setCategory] = useState('')

  const [members,  setMembers]  = useState([])
  const [picked,   setPicked]   = useState(new Set())
  const [search,   setSearch]   = useState('')

  const [posting, setPosting] = useState(false)
  const [error,   setError]   = useState('')
  const fileRef = useRef(null)

  useEffect(() => {
    api.get('/members').then(d => setMembers(d.members)).catch(() => {})
  }, [])

  const toggle = (id) => setPicked(prev => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })

  const submit = async (e) => {
    e.preventDefault()
    if (!file) { setError('Please select a photo or video.'); return }
    if (!title.trim()) { setError('Title is required.'); return }
    setError('')
    setPosting(true)
    try {
      const fd = new FormData()
      fd.append('media', file)
      fd.append('title', title.trim())
      if (caption.trim())  fd.append('caption',  caption.trim())
      if (category.trim()) fd.append('category', category.trim())
      if (picked.size > 0) fd.append('tagIds', [...picked].join(','))
      await api.upload('/gallery', fd)
      onUploaded()
    } catch (err) {
      setError(err.message)
    } finally {
      setPosting(false)
    }
  }

  const filtered = members.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(30,15,8,0.7)', zIndex: 500,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1.5rem',
      }}
    >
      <form
        onClick={e => e.stopPropagation()}
        onSubmit={submit}
        style={{
          background: T.white, borderRadius: 10, maxWidth: 560, width: '100%',
          maxHeight: '92vh', overflow: 'auto', padding: '1.8rem',
        }}
      >
        <h3 className="serif" style={{ fontSize: '1.3rem', color: T.brownDeep, marginBottom: '1rem' }}>
          Upload to Gallery
        </h3>

        {error && <div className="auth-error">{error}</div>}

        <div className="form-group">
          <label className="form-label">Photo or Video *</label>
          <input
            ref={fileRef}
            type="file"
            className="form-input"
            accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime"
            onChange={e => setFile(e.target.files?.[0] || null)}
            style={{ paddingTop: 8 }}
            required
          />
          <small style={{ fontSize: 11, color: T.brownPale, display: 'block', marginTop: 4 }}>
            Images or videos, max 200 MB.
          </small>
        </div>

        <div className="form-group">
          <label className="form-label">Title *</label>
          <input className="form-input" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. 2026 Annual Health Walk" required />
        </div>

        <div className="form-group">
          <label className="form-label">Album / Event (optional)</label>
          <input className="form-input" value={category} onChange={e => setCategory(e.target.value)} placeholder="e.g. Annual Congress 2026" />
        </div>

        <div className="form-group">
          <label className="form-label">Caption (optional)</label>
          <textarea className="form-textarea" style={{ minHeight: 80 }} value={caption} onChange={e => setCaption(e.target.value)} maxLength={1000} placeholder="Describe what's happening in the photo or video…" />
        </div>

        <div className="form-group">
          <label className="form-label">Tag Members ({picked.size} selected)</label>
          <input className="form-input" placeholder="Search members…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        <div style={{ maxHeight: 220, overflowY: 'auto', marginBottom: '1.2rem', border: '1px solid rgba(122,58,24,.08)', borderRadius: 5 }}>
          {filtered.length === 0 ? (
            <p style={{ padding: '.8rem', textAlign: 'center', color: T.brownPale, fontSize: 12 }}>No matching members.</p>
          ) : filtered.map(m => (
            <div
              key={m.id}
              onClick={() => toggle(m.id)}
              className={`msg-member-row ${picked.has(m.id) ? 'picked' : ''}`}
            >
              <Avatar name={m.name} avatarFilename={m.avatarFilename} size={34} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: T.brownDeep }}>{m.name}</div>
                <div style={{ fontSize: 11, color: T.brownPale }}>
                  {m.position || m.role}{m.region ? ` · ${m.region}` : ''}
                </div>
              </div>
              {picked.has(m.id) && <span style={{ color: T.gold, fontSize: 18, fontWeight: 700 }}>✓</span>}
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '.5rem', justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-outline-dark" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-gold" disabled={posting}>
            {posting ? 'Uploading…' : 'Upload'}
          </button>
        </div>
      </form>
    </div>
  )
}
