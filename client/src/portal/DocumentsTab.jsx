import { useEffect, useState, useRef } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { api, downloadFile, fmtDate, fmtBytes } from '../lib/api.js'
import { T } from '../styles/tokens.js'

const CATEGORIES = ['Governance', 'Welfare', 'Policy', 'Minutes', 'Handbook', 'Circular', 'Other']

const MIME_ICON = { 'application/pdf': '📄', default: '📝' }

export default function DocumentsTab() {
  const { user }  = useAuth()
  const isAdmin   = user?.role === 'ADMIN'

  const [docs,     setDocs]     = useState([])
  const [loading,  setLoading]  = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form,     setForm]     = useState({ name: '', category: CATEGORIES[0] })
  const [file,     setFile]     = useState(null)
  const [uploading,setUploading]= useState(false)
  const [error,    setError]    = useState('')
  const fileRef = useRef(null)

  const load = () =>
    api.get('/documents')
       .then(d => setDocs(d.documents))
       .catch(() => {})
       .finally(() => setLoading(false))

  useEffect(() => { load() }, [])

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
      load()
    } catch (err) {
      setError(err.message)
    } finally {
      setUploading(false)
    }
  }

  const remove = async (id) => {
    if (!confirm('Delete this document?')) return
    await api.delete(`/documents/${id}`).catch(() => {})
    setDocs(prev => prev.filter(d => d.id !== id))
  }

  if (loading) return <p style={{ color: T.brownPale, padding: '2rem 0' }}>Loading…</p>

  return (
    <div className="fade-in">
      {isAdmin && (
        <div style={{ marginBottom: '1.5rem' }}>
          <button className="btn btn-gold" onClick={() => setShowForm(s => !s)}>
            {showForm ? 'Cancel' : '⬆ Upload Document'}
          </button>

          {showForm && (
            <form
              onSubmit={submit}
              style={{
                marginTop: '1.2rem', background: T.white, borderRadius: 8,
                padding: '1.8rem', border: `1px solid rgba(122,58,24,.1)`, maxWidth: 560,
              }}
            >
              {error && <div className="auth-error">{error}</div>}
              <div className="form-group">
                <label className="form-label">File</label>
                <input
                  ref={fileRef}
                  type="file"
                  className="form-input"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.txt"
                  style={{ paddingTop: 8 }}
                  onChange={e => setFile(e.target.files[0] || null)}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Display Name</label>
                <input
                  className="form-input"
                  placeholder="e.g. COSSA-CHED Constitution 2026"
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
                {uploading ? 'Uploading…' : 'Upload Document'}
              </button>
            </form>
          )}
        </div>
      )}

      <div className="widget">
        <div className="widget-header"><h3>Association Documents</h3></div>
        <div className="widget-body" style={{ padding: 0 }}>
          {docs.length === 0 ? (
            <p style={{ color: T.brownPale, fontSize: 13, padding: '1.2rem 1.4rem' }}>No documents uploaded yet.</p>
          ) : (
            <table className="doc-table">
              <thead>
                <tr>
                  <th>Document</th><th>Category</th><th>Size</th><th>Uploaded</th><th>Action</th>
                </tr>
              </thead>
              <tbody>
                {docs.map(d => (
                  <tr key={d.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: '1.4rem' }}>
                          {MIME_ICON[d.mimeType] || MIME_ICON.default}
                        </span>
                        <span style={{ fontWeight: 500, color: T.brownDeep }}>{d.name}</span>
                      </div>
                    </td>
                    <td>
                      <span className="doc-badge" style={{ background: T.creamDeep, color: T.brownWarm }}>
                        {d.category}
                      </span>
                    </td>
                    <td style={{ color: T.brownPale, fontSize: 12.5 }}>{fmtBytes(d.sizeBytes)}</td>
                    <td style={{ color: T.brownPale, fontSize: 12.5 }}>{fmtDate(d.uploadedAt)}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '.5rem' }}>
                        <button className="btn btn-outline-dark btn-sm" onClick={() => downloadFile(d.id)}>
                          ⬇ Download
                        </button>
                        {isAdmin && (
                          <button
                            className="btn btn-sm"
                            style={{ border: '1.5px solid #fca5a5', color: '#b91c1c', background: 'none', borderRadius: 3, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', fontSize: 11 }}
                            onClick={() => remove(d.id)}
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
          )}
        </div>
      </div>
    </div>
  )
}
