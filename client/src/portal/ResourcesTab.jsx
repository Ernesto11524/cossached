import { useEffect, useState, useRef } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { api, downloadFile, viewUrl, fmtDate, fmtBytes } from '../lib/api.js'
import { T } from '../styles/tokens.js'

const CATEGORIES = [
  'Governance', 'Welfare', 'Policy', 'Minutes', 'Handbook',
  'Circular', 'Photos', 'Videos', 'Other',
]

const FILTERS = [
  { id: 'all',      label: 'All',       icon: '📚' },
  { id: 'document', label: 'Documents', icon: '📄' },
  { id: 'image',    label: 'Photos',    icon: '🖼️' },
  { id: 'video',    label: 'Videos',    icon: '🎬' },
  { id: 'audio',    label: 'Audio',     icon: '🎵' },
  { id: 'other',    label: 'Other',     icon: '📦' },
]

const MIME_ICON = {
  'application/pdf': '📄',
  default: '📝',
}

export default function ResourcesTab() {
  const { user }  = useAuth()
  const isAdmin   = user?.role === 'ADMIN'

  const [items,    setItems]    = useState([])
  const [loading,  setLoading]  = useState(true)
  const [filter,   setFilter]   = useState('all')
  const [preview,  setPreview]  = useState(null) // {id, name, mimeType, mediaType}

  const [showForm, setShowForm] = useState(false)
  const [form,     setForm]     = useState({ name: '', category: CATEGORIES[0] })
  const [file,     setFile]     = useState(null)
  const [uploading,setUploading]= useState(false)
  const [error,    setError]    = useState('')
  const fileRef = useRef(null)

  const load = (mediaType = filter) => {
    setLoading(true)
    const qs = mediaType !== 'all' ? `?mediaType=${mediaType}` : ''
    api.get(`/documents${qs}`)
       .then(d => setItems(d.documents))
       .catch(() => {})
       .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  // Reload when filter changes
  useEffect(() => { load(filter) }, [filter])

  const submit = async (e) => {
    e.preventDefault()
    if (!file) { setError('Please select a file.'); return }
    setError('')
    setUploading(true)
    const fd = new FormData()
    fd.append('file', file)
    fd.append('name', form.name || file.name)
    fd.append('category', form.category)
    try {
      await api.upload('/documents', fd)
      setForm({ name: '', category: CATEGORIES[0] })
      setFile(null)
      if (fileRef.current) fileRef.current.value = ''
      setShowForm(false)
      load(filter)
    } catch (err) {
      setError(err.message)
    } finally {
      setUploading(false)
    }
  }

  const remove = async (id) => {
    if (!confirm('Delete this file? This cannot be undone.')) return
    await api.delete(`/documents/${id}`).catch(() => {})
    setItems(prev => prev.filter(d => d.id !== id))
  }

  return (
    <div className="fade-in">
      {/* ── Admin uploader ─────────────────────────────────────────── */}
      {isAdmin && (
        <div style={{ marginBottom: '1.5rem' }}>
          <button className="btn btn-gold" onClick={() => setShowForm(s => !s)}>
            {showForm ? 'Cancel' : '⬆ Upload File'}
          </button>

          {showForm && (
            <form
              onSubmit={submit}
              style={{ marginTop: '1.2rem', background: T.white, borderRadius: 8, padding: '1.8rem', border: `1px solid rgba(122,58,24,.1)`, maxWidth: 560 }}
            >
              {error && <div className="auth-error">{error}</div>}
              <div className="form-group">
                <label className="form-label">File</label>
                <input
                  ref={fileRef}
                  type="file"
                  className="form-input"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,image/*,video/*,audio/*,.zip"
                  style={{ paddingTop: 8 }}
                  onChange={e => setFile(e.target.files[0] || null)}
                  required
                />
                <small style={{ display: 'block', marginTop: 4, fontSize: 11.5, color: T.brownPale }}>
                  Documents, images, videos, audio, or ZIP archives. Max 100 MB.
                </small>
              </div>
              <div className="form-group">
                <label className="form-label">Display Name</label>
                <input
                  className="form-input"
                  placeholder="e.g. AGM 2026 group photo"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Category</label>
                <select className="form-select" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <button type="submit" className="btn btn-gold" disabled={uploading}>
                {uploading ? 'Uploading…' : 'Upload'}
              </button>
            </form>
          )}
        </div>
      )}

      {/* ── Type filter tabs ───────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: '.4rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
        {FILTERS.map(f => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={`btn btn-sm ${filter === f.id ? 'btn-gold' : 'btn-outline-dark'}`}
          >
            <span style={{ marginRight: 4 }}>{f.icon}</span>{f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p style={{ color: T.brownPale, padding: '2rem 0' }}>Loading…</p>
      ) : items.length === 0 ? (
        <div style={{ background: T.white, borderRadius: 7, padding: '3rem', textAlign: 'center', border: `1px solid rgba(122,58,24,.08)` }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '.6rem' }}>📁</div>
          <p style={{ color: T.brownPale, fontSize: 13 }}>No files in this category yet.</p>
        </div>
      ) : (
        <FilesByType
          items={items}
          isAdmin={isAdmin}
          onPreview={setPreview}
          onRemove={remove}
        />
      )}

      {preview && <PreviewModal item={preview} onClose={() => setPreview(null)} />}
    </div>
  )
}

// ── Group items by mediaType, render each group with the right layout ───
function FilesByType({ items, isAdmin, onPreview, onRemove }) {
  const groups = {
    image:    items.filter(i => i.mediaType === 'image'),
    video:    items.filter(i => i.mediaType === 'video'),
    audio:    items.filter(i => i.mediaType === 'audio'),
    document: items.filter(i => i.mediaType === 'document'),
    other:    items.filter(i => i.mediaType === 'other'),
  }

  return (
    <>
      {groups.image.length > 0    && <ImageGroup   title="Photos"    items={groups.image}    isAdmin={isAdmin} onPreview={onPreview} onRemove={onRemove} />}
      {groups.video.length > 0    && <VideoGroup   title="Videos"    items={groups.video}    isAdmin={isAdmin} onPreview={onPreview} onRemove={onRemove} />}
      {groups.audio.length > 0    && <FileGroup    title="Audio"     items={groups.audio}    isAdmin={isAdmin} onRemove={onRemove} />}
      {groups.document.length > 0 && <FileGroup    title="Documents" items={groups.document} isAdmin={isAdmin} onRemove={onRemove} />}
      {groups.other.length > 0    && <FileGroup    title="Other"     items={groups.other}    isAdmin={isAdmin} onRemove={onRemove} />}
    </>
  )
}

function ImageGroup({ title, items, isAdmin, onPreview, onRemove }) {
  return (
    <div style={{ marginBottom: '2rem' }}>
      <h3 className="serif" style={{ fontSize: '1.05rem', color: T.brownDeep, marginBottom: '.8rem' }}>
        {title}
      </h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '.9rem' }}>
        {items.map(d => (
          <div
            key={d.id}
            style={{ background: T.white, borderRadius: 6, overflow: 'hidden', border: '1px solid rgba(122,58,24,.08)', cursor: 'pointer', transition: 'transform .2s, box-shadow .2s' }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 22px rgba(30,15,8,.1)' }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none' }}
            onClick={() => onPreview(d)}
          >
            <div style={{ aspectRatio: '4/3', overflow: 'hidden', background: T.creamDeep }}>
              <img src={viewUrl(d.id)} alt={d.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
            </div>
            <div style={{ padding: '.6rem .8rem' }}>
              <div style={{ fontSize: 12.5, fontWeight: 500, color: T.brownDeep, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.name}</div>
              <div style={{ fontSize: 11, color: T.brownPale, marginTop: 2 }}>
                {fmtDate(d.uploadedAt)} · {fmtBytes(d.sizeBytes)}
              </div>
              {isAdmin && (
                <button
                  type="button"
                  onClick={e => { e.stopPropagation(); onRemove(d.id) }}
                  style={{ marginTop: 6, border: '1.5px solid #fca5a5', color: '#b91c1c', background: 'none', borderRadius: 3, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif", fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', fontSize: 10, padding: '3px 8px' }}
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function VideoGroup({ title, items, isAdmin, onPreview, onRemove }) {
  return (
    <div style={{ marginBottom: '2rem' }}>
      <h3 className="serif" style={{ fontSize: '1.05rem', color: T.brownDeep, marginBottom: '.8rem' }}>{title}</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' }}>
        {items.map(d => (
          <div key={d.id} style={{ background: T.white, borderRadius: 6, overflow: 'hidden', border: '1px solid rgba(122,58,24,.08)' }}>
            <div
              style={{ aspectRatio: '16/9', background: T.brownDeep, position: 'relative', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              onClick={() => onPreview(d)}
            >
              <div style={{ fontSize: '2.5rem', color: T.gold }}>▶</div>
            </div>
            <div style={{ padding: '.7rem .9rem' }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: T.brownDeep }}>{d.name}</div>
              <div style={{ fontSize: 11, color: T.brownPale, marginTop: 2 }}>
                {fmtDate(d.uploadedAt)} · {fmtBytes(d.sizeBytes)} · {d.category}
              </div>
              <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                <button className="btn btn-outline-dark btn-sm" onClick={() => onPreview(d)}>Play</button>
                <button className="btn btn-outline-dark btn-sm" onClick={() => downloadFile(d.id)}>Download</button>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => onRemove(d.id)}
                    style={{ border: '1.5px solid #fca5a5', color: '#b91c1c', background: 'none', borderRadius: 3, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif", fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', fontSize: 11, padding: '6px 10px' }}
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function FileGroup({ title, items, isAdmin, onRemove }) {
  return (
    <div className="widget" style={{ marginBottom: '1.4rem' }}>
      <div className="widget-header"><h3>{title}</h3></div>
      <div className="widget-body" style={{ padding: 0 }}>
        <table className="doc-table">
          <thead>
            <tr><th>Name</th><th>Category</th><th>Size</th><th>Uploaded</th><th>Action</th></tr>
          </thead>
          <tbody>
            {items.map(d => (
              <tr key={d.id}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: '1.3rem' }}>{MIME_ICON[d.mimeType] || MIME_ICON.default}</span>
                    <span style={{ fontWeight: 500, color: T.brownDeep }}>{d.name}</span>
                  </div>
                </td>
                <td><span className="doc-badge" style={{ background: T.creamDeep, color: T.brownWarm }}>{d.category}</span></td>
                <td style={{ color: T.brownPale, fontSize: 12.5 }}>{fmtBytes(d.sizeBytes)}</td>
                <td style={{ color: T.brownPale, fontSize: 12.5 }}>{fmtDate(d.uploadedAt)}</td>
                <td>
                  <div style={{ display: 'flex', gap: '.5rem' }}>
                    <button className="btn btn-outline-dark btn-sm" onClick={() => downloadFile(d.id)}>⬇ Download</button>
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => onRemove(d.id)}
                        style={{ border: '1.5px solid #fca5a5', color: '#b91c1c', background: 'none', borderRadius: 3, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif", fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', fontSize: 11, padding: '6px 10px' }}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function PreviewModal({ item, onClose }) {
  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.85)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', cursor: 'pointer' }}
    >
      <div onClick={e => e.stopPropagation()} style={{ maxWidth: '90vw', maxHeight: '90vh', cursor: 'default', position: 'relative' }}>
        <button
          onClick={onClose}
          style={{ position: 'absolute', top: -36, right: 0, background: 'none', border: 'none', color: '#fff', fontSize: 24, cursor: 'pointer' }}
          aria-label="Close"
        >✕</button>

        {item.mediaType === 'image' && (
          <img src={viewUrl(item.id)} alt={item.name} style={{ maxWidth: '90vw', maxHeight: '85vh', objectFit: 'contain', borderRadius: 6 }} />
        )}
        {item.mediaType === 'video' && (
          <video src={viewUrl(item.id)} controls autoPlay style={{ maxWidth: '90vw', maxHeight: '85vh', borderRadius: 6 }} />
        )}
        {item.mediaType === 'audio' && (
          <div style={{ background: '#fff', padding: '2rem', borderRadius: 8 }}>
            <div style={{ fontSize: 14, color: T.brownDeep, marginBottom: '1rem' }}>{item.name}</div>
            <audio src={viewUrl(item.id)} controls autoPlay />
          </div>
        )}
        <div style={{ color: '#fff', textAlign: 'center', marginTop: '.8rem', fontSize: 13 }}>
          {item.name}
        </div>
      </div>
    </div>
  )
}
