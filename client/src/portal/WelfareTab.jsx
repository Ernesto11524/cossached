import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { api, fmtDate, fmtDateTime, STATUS_STYLE } from '../lib/api.js'
import { T } from '../styles/tokens.js'

const WELFARE_TYPES = [
  { id: 'Medical Support',      icon: '⚕️'  },
  { id: 'Bereavement Aid',      icon: '🕯️'  },
  { id: 'Education Grant',      icon: '📚'  },
  { id: 'Retirement Support',   icon: '🏡'  },
  { id: 'Emergency Loan',       icon: '💳'  },
  { id: 'Other Request',        icon: '📋'  },
]

export default function WelfareTab() {
  const { user } = useAuth()
  const isAdmin  = user?.role === 'ADMIN'

  const [myRequests,   setMyRequests]   = useState([])
  const [allRequests,  setAllRequests]  = useState([])
  const [loading,      setLoading]      = useState(true)
  const [selectedType, setSelectedType] = useState(null)
  const [form,         setForm]         = useState({ description: '', amountGhs: '' })
  const [submitting,   setSubmitting]   = useState(false)
  const [submitted,    setSubmitted]    = useState(false)
  const [error,        setError]        = useState('')

  const loadMine = () =>
    api.get('/welfare/mine').then(d => setMyRequests(d.requests)).catch(() => {})

  const loadAll = () =>
    api.get('/welfare').then(d => setAllRequests(d.requests)).catch(() => {})

  useEffect(() => {
    Promise.all([loadMine(), isAdmin ? loadAll() : Promise.resolve()]).finally(() => setLoading(false))
  }, [isAdmin])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!selectedType) { setError('Please select a request type.'); return }
    setError('')
    setSubmitting(true)
    try {
      await api.post('/welfare', {
        type:        selectedType,
        description: form.description,
        amountGhs:   form.amountGhs ? Number(form.amountGhs) : undefined,
      })
      setSubmitted(true)
      await loadMine()
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const updateStatus = async (id, status) => {
    await api.patch(`/welfare/${id}`, { status }).catch(() => {})
    loadAll()
  }

  if (loading) return <p style={{ color: T.brownPale, padding: '2rem 0' }}>Loading…</p>

  return (
    <div className="fade-in">
      {/* Intro / explainer */}
      <div
        style={{
          background: '#fdf6ee',
          border: `1px solid rgba(201,168,76,.3)`,
          borderLeft: `4px solid ${T.gold}`,
          borderRadius: 6,
          padding: '1rem 1.2rem',
          marginBottom: '1.8rem',
          maxWidth: 900,
        }}
      >
        <div style={{ fontSize: 13.5, color: T.brownDeep, fontWeight: 600, marginBottom: '.3rem' }}>
          About the Welfare Fund
        </div>
        <div style={{ fontSize: 13, color: T.textMid, lineHeight: 1.65 }}>
          The welfare fund supports COSSA-CHED members in times of need. Members can apply for
          financial assistance toward medical bills, bereavement (funeral expenses), school
          fees for their children, retirement support, or short-term emergency loans. The
          Welfare Officer reviews each application and updates the status — your request will
          move from <strong>Pending</strong> to <strong>Approved</strong> and then{' '}
          <strong>Disbursed</strong> once payment is released.
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', alignItems: 'start' }}>
        {/* Submit form */}
        <div>
          <h3 className="serif" style={{ fontSize: '1.2rem', color: T.brownDeep, marginBottom: '1rem' }}>
            Submit a Welfare Request
          </h3>

          {submitted ? (
            <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 7, padding: '1.5rem', textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '.5rem' }}>✅</div>
              <h4 className="serif" style={{ color: T.brownDeep, marginBottom: '.3rem' }}>Request Submitted</h4>
              <p style={{ fontSize: 13, color: T.textMid, marginBottom: '1rem' }}>
                The Welfare Officer will review your request within 5 working days.
              </p>
              <button className="btn btn-outline-dark btn-sm" onClick={() => { setSubmitted(false); setSelectedType(null); setForm({ description: '', amountGhs: '' }) }}>
                Submit Another
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ background: T.white, borderRadius: 8, padding: '1.8rem', border: `1px solid rgba(122,58,24,.1)` }}>
              {error && <div className="auth-error">{error}</div>}
              <p style={{ fontSize: 13, color: T.textMid, marginBottom: '1rem' }}>Select request type:</p>

              <div className="welfare-type-grid">
                {WELFARE_TYPES.map(t => (
                  <div
                    key={t.id}
                    className={`welfare-type ${selectedType === t.id ? 'selected' : ''}`}
                    onClick={() => setSelectedType(t.id)}
                  >
                    <div className="welfare-type-icon">{t.icon}</div>
                    <span>{t.id}</span>
                  </div>
                ))}
              </div>

              {selectedType && (
                <>
                  <div className="form-group">
                    <label className="form-label">Brief Description</label>
                    <textarea className="form-textarea" style={{ minHeight: 80 }}
                      placeholder="Describe your request and circumstances…"
                      value={form.description}
                      onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Amount Requested (GH₵) — optional</label>
                    <input className="form-input" type="number" min="0" step="0.01" placeholder="0.00"
                      value={form.amountGhs}
                      onChange={e => setForm(f => ({ ...f, amountGhs: e.target.value }))}
                    />
                  </div>
                  <button type="submit" className="btn btn-gold" style={{ width: '100%', justifyContent: 'center' }} disabled={submitting}>
                    {submitting ? 'Submitting…' : 'Submit Request'}
                  </button>
                </>
              )}
            </form>
          )}
        </div>

        {/* My history */}
        <div>
          <h3 className="serif" style={{ fontSize: '1.2rem', color: T.brownDeep, marginBottom: '1rem' }}>
            My Request History
          </h3>
          {myRequests.length === 0 ? (
            <p style={{ fontSize: 13, color: T.brownPale }}>No requests submitted yet.</p>
          ) : myRequests.map((r, i) => (
            <div className="welfare-row" key={r.id}>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 500, color: T.brownDeep }}>{r.type}</div>
                <div style={{ fontSize: 11.5, color: T.brownPale, marginTop: 2 }}>
                  {fmtDateTime(r.createdAt)}{r.amountGhs ? ` · GH₵ ${Number(r.amountGhs).toLocaleString()}` : ''}
                </div>
              </div>
              <span className="status-badge" style={STATUS_STYLE[r.status]}>
                {r.status}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Admin: all requests */}
      {isAdmin && (
        <div style={{ marginTop: '2.5rem' }}>
          <div className="widget">
            <div className="widget-header"><h3>All Welfare Requests — Admin Review</h3></div>
            <div className="widget-body" style={{ padding: 0 }}>
              {allRequests.length === 0 ? (
                <p style={{ padding: '1.2rem 1.4rem', fontSize: 13, color: T.brownPale }}>No requests yet.</p>
              ) : (
                <table className="doc-table">
                  <thead>
                    <tr><th>Member</th><th>Type</th><th>Amount</th><th>Date</th><th>Status</th><th>Action</th></tr>
                  </thead>
                  <tbody>
                    {allRequests.map(r => (
                      <tr key={r.id}>
                        <td>
                          <div style={{ fontWeight: 500, color: T.brownDeep, fontSize: 13 }}>{r.member?.name}</div>
                          <div style={{ fontSize: 11, color: T.brownPale }}>{r.member?.staffId} · {r.member?.department}</div>
                        </td>
                        <td style={{ fontSize: 13 }}>{r.type}</td>
                        <td style={{ fontSize: 13, color: T.brownPale }}>{r.amountGhs ? `GH₵ ${Number(r.amountGhs).toLocaleString()}` : '—'}</td>
                        <td style={{ fontSize: 12.5, color: T.brownPale }}>{fmtDateTime(r.createdAt)}</td>
                        <td><span className="status-badge" style={STATUS_STYLE[r.status]}>{r.status}</span></td>
                        <td>
                          <select
                            className="form-select"
                            style={{ fontSize: 12, padding: '5px 8px', width: 'auto' }}
                            value={r.status}
                            onChange={e => updateStatus(r.id, e.target.value)}
                          >
                            {['PENDING','APPROVED','DISBURSED','REJECTED'].map(s => <option key={s}>{s}</option>)}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
