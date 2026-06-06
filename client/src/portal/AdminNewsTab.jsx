import { useEffect, useState, useRef } from 'react'
import { api, fmtDate } from '../lib/api.js'
import { T } from '../styles/tokens.js'

const CATEGORIES = ['Congress', 'Training', 'Welfare', 'Campaign', 'Event', 'Policy', 'Other']

const EMPTY_FORM = {
  title:    '',
  category: CATEGORIES[0],
  excerpt:  '',
  body:     '',
  imageUrl: '',
}

export default function AdminNewsTab() {
  const [articles,  setArticles]  = useState([])
  const [loading,   setLoading]   = useState(true)
  const [showForm,  setShowForm]  = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form,      setForm]      = useState(EMPTY_FORM)
  const [mediaFile,    setMediaFile]    = useState(null)   // newly picked File
  const [existingMedia, setExistingMedia] = useState(null) // { mediaType, mediaUrl }
  const [removeMedia,  setRemoveMedia]   = useState(false)
  const [posting,   setPosting]   = useState(false)
  const [error,     setError]     = useState('')
  const fileInputRef = useRef(null)

  const load = () =>
    fetch('/api/news')
      .then(r => r.ok ? r.json() : { articles: [] })
      .then(d => setArticles(d.articles || []))
      .catch(() => {})
      .finally(() => setLoading(false))

  useEffect(() => { load() }, [])

  const startNew = () => {
    setForm(EMPTY_FORM)
    setEditingId(null)
    setMediaFile(null)
    setExistingMedia(null)
    setRemoveMedia(false)
    setError('')
    setShowForm(true)
  }

  const startEdit = (article) => {
    setForm({
      title:    article.title,
      category: article.category,
      excerpt:  article.excerpt,
      body:     article.body,
      imageUrl: article.imageUrl || '',
    })
    setEditingId(article.id)
    setMediaFile(null)
    setRemoveMedia(false)
    // If the article has uploaded media, surface it so admin can preview/replace
    setExistingMedia(
      article.mediaFilename
        ? { mediaType: article.mediaType, mediaUrl: article.mediaUrl }
        : null
    )
    setError('')
    setShowForm(true)
  }

  const cancelForm = () => {
    setShowForm(false)
    setEditingId(null)
    setForm(EMPTY_FORM)
    setMediaFile(null)
    setExistingMedia(null)
    setRemoveMedia(false)
    setError('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleChange = (field) => (e) =>
    setForm(prev => ({ ...prev, [field]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setPosting(true)
    try {
      // Build multipart payload so we can ship the file alongside the text fields
      const fd = new FormData()
      Object.entries(form).forEach(([k, v]) => { if (v !== '') fd.append(k, v) })
      if (mediaFile) fd.append('media', mediaFile)
      if (editingId && removeMedia) fd.append('removeMedia', 'true')

      if (editingId) {
        await api.upload(`/news/${editingId}`, fd, 'PATCH')
      } else {
        await api.upload('/news', fd)
      }
      cancelForm()
      load()
    } catch (err) {
      setError(err.message)
    } finally {
      setPosting(false)
    }
  }

  const remove = async (article) => {
    if (!confirm(`Delete "${article.title}"? This cannot be undone.`)) return
    try {
      await api.delete(`/news/${article.id}`)
      setArticles(prev => prev.filter(a => a.id !== article.id))
    } catch (err) {
      alert(err.message)
    }
  }

  if (loading) return <p style={{ color: T.brownPale, padding: '2rem 0' }}>Loading…</p>

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <p style={{ fontSize: 13.5, color: T.textMid, maxWidth: 560 }}>
          Manage the news articles shown on the public Home and News pages. Articles are
          published immediately when saved.
        </p>
        {!showForm && (
          <button className="btn btn-gold" onClick={startNew}>
            + New Article
          </button>
        )}
      </div>

      {showForm && (
        <form
          onSubmit={submit}
          style={{
            marginBottom: '2rem',
            background: T.white,
            borderRadius: 8,
            padding: '1.8rem',
            border: `1px solid rgba(122,58,24,.1)`,
            maxWidth: 820,
          }}
        >
          <h3 className="serif" style={{ fontSize: '1.1rem', color: T.brownDeep, marginBottom: '1rem' }}>
            {editingId ? 'Edit Article' : 'New Article'}
          </h3>

          {error && <div className="auth-error">{error}</div>}

          <div className="form-group">
            <label className="form-label">Title *</label>
            <input className="form-input" value={form.title} onChange={handleChange('title')} required />
          </div>

          <div className="form-group">
            <label className="form-label">Category *</label>
            <select className="form-select" value={form.category} onChange={handleChange('category')}>
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>

          {/* ── Media upload ─────────────────────────────────────────── */}
          <div className="form-group">
            <label className="form-label">Image or Video</label>

            {/* Existing media preview (when editing) */}
            {existingMedia && !mediaFile && !removeMedia && (
              <div style={{
                marginBottom: '.6rem',
                padding: '.7rem',
                background: T.creamLight,
                borderRadius: 5,
                border: `1px solid rgba(122,58,24,.08)`,
                display: 'flex',
                alignItems: 'center',
                gap: '.8rem',
              }}>
                {existingMedia.mediaType === 'image' ? (
                  <img
                    src={existingMedia.mediaUrl}
                    alt=""
                    style={{ width: 80, height: 60, objectFit: 'cover', borderRadius: 4 }}
                  />
                ) : (
                  <video
                    src={existingMedia.mediaUrl}
                    style={{ width: 80, height: 60, objectFit: 'cover', borderRadius: 4, background: '#000' }}
                  />
                )}
                <div style={{ flex: 1, fontSize: 12, color: T.brownWarm }}>
                  Current {existingMedia.mediaType} attached. Pick a new file below to replace it,
                  or click Remove to delete it.
                </div>
                <button
                  type="button"
                  className="btn btn-outline-dark btn-sm"
                  onClick={() => { setRemoveMedia(true); setExistingMedia(null) }}
                >
                  Remove
                </button>
              </div>
            )}

            {/* New file picked */}
            {mediaFile && (
              <div style={{ marginBottom: '.6rem', padding: '.6rem', background: '#f0fdf4', borderRadius: 5, fontSize: 12.5, color: '#166534' }}>
                ✓ <strong>{mediaFile.name}</strong> selected ({(mediaFile.size / (1024 * 1024)).toFixed(1)} MB)
                <button
                  type="button"
                  onClick={() => { setMediaFile(null); if (fileInputRef.current) fileInputRef.current.value = '' }}
                  style={{ marginLeft: 10, background: 'none', border: 'none', color: '#b91c1c', cursor: 'pointer', fontSize: 11, fontWeight: 600 }}
                >
                  Remove pick
                </button>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime"
              onChange={(e) => setMediaFile(e.target.files?.[0] || null)}
              className="form-input"
              style={{ paddingTop: 8 }}
            />
            <small style={{ display: 'block', marginTop: 4, fontSize: 11, color: T.brownPale }}>
              JPEG, PNG, WebP, GIF, or MP4/WebM/MOV video. Max 100 MB.
              Leave empty to keep the existing media (or use Image URL below as a fallback).
            </small>
          </div>

          <div className="form-group">
            <label className="form-label">Image URL (optional fallback)</label>
            <input
              className="form-input"
              placeholder="https://… (used if no file is uploaded)"
              value={form.imageUrl}
              onChange={handleChange('imageUrl')}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Excerpt — shown on cards *</label>
            <textarea
              className="form-textarea"
              style={{ minHeight: 70 }}
              value={form.excerpt}
              onChange={handleChange('excerpt')}
              maxLength={500}
              required
            />
            <small style={{ fontSize: 11, color: T.brownPale }}>
              {form.excerpt.length} / 500 characters
            </small>
          </div>

          <div className="form-group">
            <label className="form-label">Full Article Body *</label>
            <textarea
              className="form-textarea"
              style={{ minHeight: 220 }}
              placeholder="Use blank lines to separate paragraphs."
              value={form.body}
              onChange={handleChange('body')}
              required
            />
          </div>

          <div style={{ display: 'flex', gap: '.6rem' }}>
            <button type="submit" className="btn btn-gold" disabled={posting}>
              {posting ? 'Saving…' : (editingId ? 'Save Changes' : 'Publish Article')}
            </button>
            <button type="button" className="btn btn-outline-dark" onClick={cancelForm}>
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="widget">
        <div className="widget-header">
          <h3>All News Articles ({articles.length})</h3>
        </div>
        <div className="widget-body" style={{ padding: 0 }}>
          {articles.length === 0 ? (
            <p style={{ padding: '1.2rem 1.4rem', fontSize: 13, color: T.brownPale }}>
              No articles yet. Click "New Article" to publish your first one.
            </p>
          ) : (
            <>
              {/* Desktop: table */}
              <table className="doc-table admin-news-table-desktop">
                <thead>
                  <tr><th>Title</th><th>Category</th><th>Media</th><th>Published</th><th>Action</th></tr>
                </thead>
                <tbody>
                  {articles.map(a => (
                    <tr key={a.id}>
                      <td>
                        <div style={{ fontWeight: 500, color: T.brownDeep, fontSize: 13.5 }}>{a.title}</div>
                        <div style={{ fontSize: 11, color: T.brownPale, marginTop: 2 }}>
                          {a.excerpt?.slice(0, 80)}…
                        </div>
                      </td>
                      <td>
                        <span className="doc-badge" style={{ background: T.creamDeep, color: T.brownWarm }}>
                          {a.category}
                        </span>
                      </td>
                      <td>
                        {a.mediaType === 'video' ? '🎬 Video'
                         : a.mediaType === 'image' ? '🖼️ Image'
                         : a.imageUrl ? '🔗 URL'
                         : '—'}
                      </td>
                      <td style={{ fontSize: 12.5, color: T.brownPale }}>
                        {fmtDate(a.publishedAt)}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '.5rem' }}>
                          <button className="btn btn-outline-dark btn-sm" onClick={() => startEdit(a)}>
                            Edit
                          </button>
                          <button
                            className="btn btn-sm"
                            style={{ border: '1.5px solid #fca5a5', color: '#b91c1c', background: 'none', borderRadius: 3, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif", fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', fontSize: 11 }}
                            onClick={() => remove(a)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Mobile: stacked cards (no horizontal scroll) */}
              <div className="admin-news-cards-mobile">
                {articles.map(a => (
                  <div key={a.id} className="admin-news-card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: '.5rem' }}>
                      <span className="doc-badge" style={{ background: T.creamDeep, color: T.brownWarm }}>
                        {a.category}
                      </span>
                      <span style={{ fontSize: 11, color: T.brownPale }}>
                        {a.mediaType === 'video' ? '🎬 Video'
                         : a.mediaType === 'image' ? '🖼️ Image'
                         : a.imageUrl ? '🔗 URL'
                         : '—'}
                      </span>
                      <span style={{ fontSize: 11, color: T.brownPale, marginLeft: 'auto' }}>
                        {fmtDate(a.publishedAt)}
                      </span>
                    </div>

                    <div style={{ fontWeight: 600, color: T.brownDeep, fontSize: 14, lineHeight: 1.35, marginBottom: '.35rem' }}>
                      {a.title}
                    </div>
                    <div style={{ fontSize: 12.5, color: T.textMid, lineHeight: 1.55, marginBottom: '.8rem' }}>
                      {a.excerpt}
                    </div>

                    <div style={{ display: 'flex', gap: '.5rem' }}>
                      <button className="btn btn-outline-dark btn-sm" onClick={() => startEdit(a)}>
                        Edit
                      </button>
                      <button
                        className="btn btn-sm"
                        style={{ border: '1.5px solid #fca5a5', color: '#b91c1c', background: 'none', borderRadius: 3, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif", fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', fontSize: 11 }}
                        onClick={() => remove(a)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
