import { useEffect, useState } from 'react'
import { api, fmtDateTime } from '../lib/api.js'
import { T } from '../styles/tokens.js'
import { GHANA_REGIONS } from '../data/regions.js'

const STATUS_COLORS = {
  SCHEDULED: { bg: '#fef9c3', color: '#854d0e' },
  OPEN:      { bg: '#dcfce7', color: '#166534' },
  CLOSED:    { bg: '#e5e7eb', color: '#374151' },
}

// Format a Date object as "YYYY-MM-DDTHH:MM" — the value <input type="datetime-local"> expects
function toLocalInputValue(date) {
  const d = new Date(date)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default function AdminElectionsTab() {
  const [elections, setElections] = useState([])
  const [loading,   setLoading]   = useState(true)
  const [selected,  setSelected]  = useState(null)
  const [showNew,   setShowNew]   = useState(false)

  const load = () =>
    api.get('/elections')
       .then(d => setElections(d.elections))
       .catch(() => {})
       .finally(() => setLoading(false))

  useEffect(() => { load() }, [])

  if (loading) return <p style={{ color: T.brownPale, padding: '2rem 0' }}>Loading…</p>

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.2rem', gap: '1rem', flexWrap: 'wrap' }}>
        <p style={{ fontSize: 13.5, color: T.textMid, maxWidth: 560, margin: 0 }}>
          Start an election any time. Add positions and candidates, then open it for voting.
          Past results stay here — toggle "Visible to members" when you're ready to share them.
        </p>
        <button className="btn btn-gold" onClick={() => setShowNew(true)}>
          + New Election
        </button>
      </div>

      {elections.length === 0 ? (
        <div style={{ background: T.white, borderRadius: 7, padding: '3rem', textAlign: 'center', border: `1px solid rgba(122,58,24,.08)` }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '.6rem' }}>🗳️</div>
          <p style={{ color: T.brownPale, fontSize: 13 }}>No elections yet. Click "+ New Election" to start one.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '.8rem' }}>
          {elections.map(e => (
            <ElectionRow key={e.id} election={e} onOpen={() => setSelected(e)} />
          ))}
        </div>
      )}

      {showNew && (
        <NewElectionModal
          onClose={() => setShowNew(false)}
          onCreated={(e) => { setShowNew(false); load(); setSelected(e) }}
        />
      )}

      {selected && (
        <ElectionDetail
          electionId={selected.id}
          onClose={() => { setSelected(null); load() }}
          onChanged={load}
        />
      )}
    </div>
  )
}

// ── Election row card ────────────────────────────────────────────────────
function ElectionRow({ election, onOpen }) {
  const colors = STATUS_COLORS[election.status]
  return (
    <div
      onClick={onOpen}
      style={{
        background: T.white,
        border: `1px solid rgba(122,58,24,.08)`,
        borderRadius: 7,
        padding: '1.1rem 1.3rem',
        cursor: 'pointer',
        transition: 'box-shadow 0.2s',
      }}
      onMouseEnter={e => e.currentTarget.style.boxShadow = '0 6px 20px rgba(30,15,8,.08)'}
      onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '.8rem', marginBottom: '.5rem', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.1rem', color: T.brownDeep, fontWeight: 600, marginBottom: '.2rem' }}>
            {election.title}
          </div>
          <div style={{ fontSize: 11.5, color: T.brownPale }}>
            {election.scope === 'NATIONAL' ? '🇬🇭 National' : `📍 ${election.region}`} ·{' '}
            {election.positions.length} position{election.positions.length === 1 ? '' : 's'} ·{' '}
            {fmtDateTime(election.startsAt)} → {fmtDateTime(election.endsAt)}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '.4rem', flexWrap: 'wrap' }}>
          <span className="tag-pill" style={{ background: colors.bg, color: colors.color }}>
            {election.status}
          </span>
          {election.resultsPublic && (
            <span className="tag-pill" style={{ background: T.gold, color: T.brownDeep }}>
              Results public
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Detail / management modal ─────────────────────────────────────────────
function ElectionDetail({ electionId, onClose, onChanged }) {
  const [election,  setElection]  = useState(null)
  const [results,   setResults]   = useState(null)
  const [error,     setError]     = useState('')

  const [newPosTitle, setNewPosTitle] = useState('')

  const load = async () => {
    try {
      const { election: e } = await api.get(`/elections/${electionId}`)
      setElection(e)
      try {
        const r = await api.get(`/elections/${electionId}/results`)
        setResults(r)
      } catch {
        setResults(null)
      }
    } catch (err) {
      setError(err.message)
    }
  }

  useEffect(() => { load() }, [electionId])

  if (!election) {
    return (
      <Modal onClose={onClose}>
        {error ? <div className="auth-error">{error}</div> : <p>Loading…</p>}
      </Modal>
    )
  }

  const locked = election.status === 'OPEN' || election.status === 'CLOSED'

  const addPosition = async () => {
    if (!newPosTitle.trim()) return
    try {
      await api.post(`/elections/${electionId}/positions`, { title: newPosTitle.trim() })
      setNewPosTitle('')
      await load()
      onChanged()
    } catch (err) {
      alert(err.message)
    }
  }

  const removePosition = async (positionId) => {
    if (!confirm('Remove this position and any candidates under it?')) return
    try {
      await api.delete(`/elections/positions/${positionId}`)
      await load()
      onChanged()
    } catch (err) {
      alert(err.message)
    }
  }

  const removeCandidate = async (candidateId) => {
    if (!confirm('Remove this candidate?')) return
    try {
      await api.delete(`/elections/candidates/${candidateId}`)
      await load()
      onChanged()
    } catch (err) {
      alert(err.message)
    }
  }

  const extend = async () => {
    const value = prompt(
      `New end date/time (YYYY-MM-DD HH:MM, 24-hour).\nCurrent: ${new Date(election.endsAt).toLocaleString()}`,
      toLocalInputValue(election.endsAt).replace('T', ' ')
    )
    if (!value) return
    const parsed = new Date(value.replace(' ', 'T'))
    if (isNaN(parsed.getTime())) { alert('Could not parse that date.'); return }
    try {
      await api.post(`/elections/${electionId}/extend`, { endsAt: parsed.toISOString() })
      await load()
      onChanged()
    } catch (err) {
      alert(err.message)
    }
  }

  const toggleResults = async () => {
    try {
      await api.post(`/elections/${electionId}/publish-results`, { resultsPublic: !election.resultsPublic })
      await load()
      onChanged()
    } catch (err) {
      alert(err.message)
    }
  }

  const removeElection = async () => {
    if (!confirm('Delete this election? This cannot be undone.')) return
    try {
      await api.delete(`/elections/${electionId}`)
      onClose()
    } catch (err) {
      alert(err.message)
    }
  }

  return (
    <Modal onClose={onClose} wide>
      <div style={{ marginBottom: '1.2rem' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '.8rem', flexWrap: 'wrap', marginBottom: '.4rem' }}>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.4rem', color: T.brownDeep, fontWeight: 600 }}>
            {election.title}
          </h2>
          <span className="tag-pill" style={STATUS_COLORS[election.status]}>{election.status}</span>
        </div>
        <div style={{ fontSize: 12.5, color: T.brownPale }}>
          {election.scope === 'NATIONAL' ? '🇬🇭 National' : `📍 ${election.region} Region`} ·{' '}
          {fmtDateTime(election.startsAt)} → {fmtDateTime(election.endsAt)}
        </div>
        {election.description && (
          <p style={{ fontSize: 13, color: T.textMid, marginTop: '.5rem', whiteSpace: 'pre-wrap' }}>
            {election.description}
          </p>
        )}
      </div>

      {/* ── Positions + candidates ──────────────────────────────────────── */}
      <h3 style={{ fontSize: '1rem', color: T.brownDeep, marginBottom: '.7rem' }}>
        Positions ({election.positions.length})
      </h3>

      {election.positions.length === 0 && (
        <p style={{ fontSize: 13, color: T.brownPale, marginBottom: '1rem' }}>
          No positions yet. Add one below.
        </p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '.8rem', marginBottom: '1rem' }}>
        {election.positions.map(pos => (
          <PositionBlock
            key={pos.id}
            position={pos}
            locked={locked}
            results={results?.results?.find(r => r.id === pos.id)}
            totalBallots={results?.totalBallots}
            onAddCandidate={async (name, bio) => {
              try {
                await api.post(`/elections/positions/${pos.id}/candidates`, { name, bio })
                await load()
                onChanged()
              } catch (err) { alert(err.message) }
            }}
            onRemoveCandidate={removeCandidate}
            onRemove={() => removePosition(pos.id)}
          />
        ))}
      </div>

      {!locked && (
        <div style={{ display: 'flex', gap: '.5rem', marginBottom: '1.5rem' }}>
          <input
            className="form-input"
            placeholder="New position (e.g. President)"
            value={newPosTitle}
            onChange={e => setNewPosTitle(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addPosition())}
            style={{ flex: 1 }}
          />
          <button type="button" className="btn btn-gold btn-sm" onClick={addPosition}>
            + Position
          </button>
        </div>
      )}

      {/* ── Results panel ───────────────────────────────────────────────── */}
      {(election.status === 'OPEN' || election.status === 'CLOSED') && results && (
        <div style={{ background: T.creamLight, borderRadius: 6, padding: '1rem 1.2rem', marginBottom: '1.2rem', border: `1px solid rgba(122,58,24,.08)` }}>
          <div style={{ fontSize: 12, color: T.brownWarm, fontWeight: 600, marginBottom: '.4rem' }}>
            📊 Tally · {results.totalBallots} ballot{results.totalBallots === 1 ? '' : 's'} cast
          </div>
          <div style={{ fontSize: 11, color: T.brownPale }}>
            Live counts visible to you (admin). Toggle below to share with members.
          </div>
        </div>
      )}

      {/* ── Action row ──────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap', borderTop: `1px solid rgba(122,58,24,.08)`, paddingTop: '1rem' }}>
        {election.status === 'OPEN' && (
          <button className="btn btn-outline-dark btn-sm" onClick={extend}>
            ⏰ Extend end time
          </button>
        )}
        {election.status === 'CLOSED' && (
          <button className="btn btn-gold btn-sm" onClick={toggleResults}>
            {election.resultsPublic ? '🔒 Hide results from members' : '👁 Publish results to members'}
          </button>
        )}
        {election.status === 'SCHEDULED' && (
          <button
            type="button"
            onClick={removeElection}
            style={{ background: '#b91c1c', color: '#fff', border: 'none', borderRadius: 3, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif", fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', fontSize: 11, padding: '8px 14px' }}
          >
            🗑 Delete election
          </button>
        )}
      </div>
    </Modal>
  )
}

// ── A single position block (with candidates + add form when unlocked) ──
function PositionBlock({ position, locked, results, totalBallots, onAddCandidate, onRemoveCandidate, onRemove }) {
  const [showForm, setShowForm] = useState(false)
  const [name,     setName]     = useState('')
  const [bio,      setBio]      = useState('')

  const submit = (e) => {
    e.preventDefault()
    if (!name.trim()) return
    onAddCandidate(name.trim(), bio.trim() || null)
    setName(''); setBio(''); setShowForm(false)
  }

  // Sort candidates by vote count desc when results present
  const sorted = results
    ? [...results.candidates].sort((a, b) => b.votes - a.votes)
    : position.candidates

  return (
    <div style={{ background: T.white, border: `1px solid rgba(122,58,24,.1)`, borderRadius: 6, padding: '.9rem 1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '.6rem' }}>
        <div style={{ fontWeight: 600, color: T.brownDeep, fontSize: 14 }}>
          {position.title}
        </div>
        {!locked && (
          <button
            type="button"
            onClick={onRemove}
            style={{ background: 'none', border: 'none', color: '#b91c1c', cursor: 'pointer', fontSize: 11, fontWeight: 600, letterSpacing: '.05em', textTransform: 'uppercase' }}
          >
            Remove
          </button>
        )}
      </div>

      {sorted.length === 0 ? (
        <p style={{ fontSize: 12, color: T.brownPale, marginBottom: '.5rem' }}>No candidates yet.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '.3rem', marginBottom: '.5rem' }}>
          {sorted.map(c => {
            const r = results?.candidates.find(x => x.id === c.id)
            const pct = (results && totalBallots > 0 && r) ? (r.votes / totalBallots) * 100 : 0
            return (
              <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '.5rem', padding: '.4rem .5rem', borderRadius: 4, background: T.creamLight }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: T.brownDeep }}>{c.name}</div>
                  {c.bio && <div style={{ fontSize: 11, color: T.brownPale, marginTop: 1 }}>{c.bio}</div>}
                </div>
                {results && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
                    <div style={{ width: 80, height: 6, background: 'rgba(122,58,24,.12)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: T.gold, transition: 'width 0.3s' }} />
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 600, color: T.brownWarm, minWidth: 50, textAlign: 'right' }}>
                      {r?.votes ?? 0} ({pct.toFixed(0)}%)
                    </span>
                  </div>
                )}
                {!locked && (
                  <button
                    type="button"
                    onClick={() => onRemoveCandidate(c.id)}
                    style={{ background: 'none', border: 'none', color: '#b91c1c', cursor: 'pointer', fontSize: 14, padding: 0, lineHeight: 1 }}
                    aria-label="Remove candidate"
                  >✕</button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {!locked && (
        showForm ? (
          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '.4rem' }}>
            <input className="form-input" placeholder="Candidate name" value={name} onChange={e => setName(e.target.value)} autoFocus />
            <input className="form-input" placeholder="Short bio (optional)" value={bio} onChange={e => setBio(e.target.value)} />
            <div style={{ display: 'flex', gap: '.4rem' }}>
              <button type="submit" className="btn btn-gold btn-sm">Add</button>
              <button type="button" className="btn btn-outline-dark btn-sm" onClick={() => { setShowForm(false); setName(''); setBio('') }}>Cancel</button>
            </div>
          </form>
        ) : (
          <button type="button" onClick={() => setShowForm(true)} className="btn btn-outline-dark btn-sm">
            + Candidate
          </button>
        )
      )}
    </div>
  )
}

// ── New election modal ────────────────────────────────────────────────────
function NewElectionModal({ onClose, onCreated }) {
  const [form, setForm] = useState({
    title:       '',
    description: '',
    scope:       'NATIONAL',
    region:      '',
    startsAt:    '',
    endsAt:      '',
  })
  const [error, setError] = useState('')
  const [busy,  setBusy]  = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError('')

    if (!form.startsAt || !form.endsAt) { setError('Set both start and end times.'); return }
    if (form.scope === 'REGIONAL' && !form.region) { setError('Pick a region.'); return }
    if (new Date(form.endsAt) <= new Date(form.startsAt)) {
      setError('End time must be after start time.'); return
    }

    setBusy(true)
    try {
      const { election } = await api.post('/elections', {
        title:       form.title.trim(),
        description: form.description.trim() || undefined,
        scope:       form.scope,
        region:      form.scope === 'REGIONAL' ? form.region : null,
        startsAt:    new Date(form.startsAt).toISOString(),
        endsAt:      new Date(form.endsAt).toISOString(),
      })
      onCreated(election)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal onClose={onClose}>
      <form onSubmit={submit}>
        <h3 className="serif" style={{ fontSize: '1.25rem', color: T.brownDeep, marginBottom: '1rem' }}>
          Start a New Election
        </h3>
        {error && <div className="auth-error">{error}</div>}

        <div className="form-group">
          <label className="form-label">Title *</label>
          <input className="form-input" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. 2027 National Executive Election" required />
        </div>

        <div className="form-group">
          <label className="form-label">Description (optional)</label>
          <textarea className="form-textarea" style={{ minHeight: 70 }} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Background or instructions for voters…" />
        </div>

        <div className="form-group">
          <label className="form-label">Scope *</label>
          <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
            {[
              { v: 'NATIONAL', label: '🇬🇭 National — all members vote' },
              { v: 'REGIONAL', label: '📍 Regional — one region only' },
            ].map(opt => (
              <label key={opt.v} style={{
                flex: '1 1 200px', padding: '.7rem .9rem', borderRadius: 5, cursor: 'pointer',
                border: `1.5px solid ${form.scope === opt.v ? T.gold : 'rgba(122,58,24,.18)'}`,
                background: form.scope === opt.v ? 'rgba(201,168,76,.08)' : '#fff',
                fontSize: 13, fontWeight: 500, color: T.brownDeep,
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <input type="radio" name="scope" value={opt.v} checked={form.scope === opt.v} onChange={e => setForm(f => ({ ...f, scope: e.target.value }))} />
                {opt.label}
              </label>
            ))}
          </div>
        </div>

        {form.scope === 'REGIONAL' && (
          <div className="form-group">
            <label className="form-label">Region *</label>
            <select className="form-select" value={form.region} onChange={e => setForm(f => ({ ...f, region: e.target.value }))} required>
              <option value="">— Select a region —</option>
              {GHANA_REGIONS.map(r => <option key={r}>{r}</option>)}
            </select>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div className="form-group">
            <label className="form-label">Voting opens *</label>
            <input type="datetime-local" className="form-input" value={form.startsAt} onChange={e => setForm(f => ({ ...f, startsAt: e.target.value }))} required />
          </div>
          <div className="form-group">
            <label className="form-label">Voting closes *</label>
            <input type="datetime-local" className="form-input" value={form.endsAt} onChange={e => setForm(f => ({ ...f, endsAt: e.target.value }))} required />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '.5rem', justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-outline-dark" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-gold" disabled={busy}>
            {busy ? 'Creating…' : 'Create Election'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

// ── Generic modal shell ──────────────────────────────────────────────────
function Modal({ children, onClose, wide }) {
  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(30,15,8,0.7)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background: T.white, borderRadius: 10, maxWidth: wide ? 760 : 560, width: '100%', maxHeight: '92vh', overflow: 'auto', padding: '1.8rem', position: 'relative' }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          style={{ position: 'absolute', top: 12, right: 14, background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: T.brownPale, padding: 0 }}
        >✕</button>
        {children}
      </div>
    </div>
  )
}
