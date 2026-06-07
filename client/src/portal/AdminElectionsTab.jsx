import { useEffect, useRef, useState } from 'react'
import { api, fmtDateTime } from '../lib/api.js'
import { T } from '../styles/tokens.js'
import Avatar from '../components/Avatar.jsx'
import { GHANA_REGIONS } from '../data/regions.js'

const STATUS_COLORS = {
  SCHEDULED: { bg: '#fef9c3', color: '#854d0e' },
  OPEN:      { bg: '#dcfce7', color: '#166534' },
  CLOSED:    { bg: '#e5e7eb', color: '#374151' },
}

function toLocalInputValue(date) {
  const d = new Date(date)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// ────────────────────────────────────────────────────────────────────────
//  Top-level controller — swaps between list / new-election / detail pages
// ────────────────────────────────────────────────────────────────────────
export default function AdminElectionsTab() {
  const [view, setView] = useState({ kind: 'list' })
  const [elections, setElections] = useState([])
  const [loading,   setLoading]   = useState(true)

  const load = () =>
    api.get('/elections')
       .then(d => setElections(d.elections))
       .catch(() => {})
       .finally(() => setLoading(false))

  useEffect(() => { load() }, [])

  if (view.kind === 'new') {
    return <NewElectionPage
      onCancel={() => setView({ kind: 'list' })}
      onCreated={(e) => { load(); setView({ kind: 'detail', electionId: e.id }) }}
    />
  }

  if (view.kind === 'detail') {
    return <ElectionDetailPage
      electionId={view.electionId}
      onBack={() => { load(); setView({ kind: 'list' }) }}
      onChanged={load}
    />
  }

  if (loading) return <p style={{ color: T.brownPale, padding: '2rem 0' }}>Loading…</p>

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.2rem', gap: '1rem', flexWrap: 'wrap' }}>
        <p style={{ fontSize: 13.5, color: T.textMid, maxWidth: 560, margin: 0 }}>
          Start an election any time. Add positions and candidates, then open it for voting.
          Past results stay here — toggle "Visible to members" when you're ready to share them.
        </p>
        <button className="btn btn-gold" onClick={() => setView({ kind: 'new' })}>
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
            <ElectionRow key={e.id} election={e} onOpen={() => setView({ kind: 'detail', electionId: e.id })} />
          ))}
        </div>
      )}
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────
//  Election list row
// ────────────────────────────────────────────────────────────────────────
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

// ────────────────────────────────────────────────────────────────────────
//  Back-link bar shared between sub-pages
// ────────────────────────────────────────────────────────────────────────
function BackBar({ onBack, label = 'Back to elections' }) {
  return (
    <button
      type="button"
      onClick={onBack}
      style={{
        background: 'none', border: 'none', cursor: 'pointer',
        color: T.brownWarm, fontSize: 13, fontWeight: 600,
        padding: 0, marginBottom: '1.2rem',
        display: 'inline-flex', alignItems: 'center', gap: 6,
      }}
    >
      ← {label}
    </button>
  )
}

// ────────────────────────────────────────────────────────────────────────
//  New Election PAGE (was a modal — now a full page)
// ────────────────────────────────────────────────────────────────────────
function NewElectionPage({ onCancel, onCreated }) {
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
    <div className="fade-in">
      <BackBar onBack={onCancel} />

      <div style={{ maxWidth: 720 }}>
        <h2 className="serif" style={{ fontSize: '1.55rem', color: T.brownDeep, marginBottom: '.3rem' }}>
          Start a New Election
        </h2>
        <p style={{ fontSize: 13, color: T.brownPale, marginBottom: '1.5rem' }}>
          Set the basics here. You can add positions and candidates on the next page.
        </p>

        <form onSubmit={submit} style={{ background: T.white, padding: '1.5rem 1.6rem', borderRadius: 8, border: `1px solid rgba(122,58,24,.08)` }}>
          {error && <div className="auth-error">{error}</div>}

          <div className="form-group">
            <label className="form-label">Election Title *</label>
            <input
              className="form-input"
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="e.g. 2027 National Executive Election"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Description / Voter Instructions (optional)</label>
            <textarea
              className="form-textarea"
              style={{ minHeight: 90 }}
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Background, ground rules, or instructions members should see before voting…"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Election Scope *</label>
            <div style={{ display: 'flex', gap: '.6rem', flexWrap: 'wrap' }}>
              {[
                { v: 'NATIONAL', icon: '🇬🇭', label: 'National', sub: 'Every active member can vote.' },
                { v: 'REGIONAL', icon: '📍', label: 'Regional', sub: 'Only members of the chosen region vote.' },
              ].map(opt => (
                <label key={opt.v} style={{
                  flex: '1 1 240px', padding: '.9rem 1rem', borderRadius: 6, cursor: 'pointer',
                  border: `1.5px solid ${form.scope === opt.v ? T.gold : 'rgba(122,58,24,.18)'}`,
                  background: form.scope === opt.v ? 'rgba(201,168,76,.08)' : '#fff',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <input
                      type="radio" name="scope" value={opt.v}
                      checked={form.scope === opt.v}
                      onChange={e => setForm(f => ({ ...f, scope: e.target.value }))}
                    />
                    <span style={{ fontSize: 14, fontWeight: 600, color: T.brownDeep }}>
                      {opt.icon} {opt.label}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: T.brownPale, marginTop: 4, paddingLeft: 26 }}>{opt.sub}</div>
                </label>
              ))}
            </div>
          </div>

          {form.scope === 'REGIONAL' && (
            <div className="form-group">
              <label className="form-label">Region *</label>
              <select
                className="form-select"
                value={form.region}
                onChange={e => setForm(f => ({ ...f, region: e.target.value }))}
                required
              >
                <option value="">— Select a region —</option>
                {GHANA_REGIONS.map(r => <option key={r}>{r}</option>)}
              </select>
              <div style={{ fontSize: 11.5, color: T.brownPale, marginTop: 4 }}>
                Only candidates from this region will be selectable in the next step.
              </div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Voting Opens *</label>
              <input
                type="datetime-local" className="form-input"
                value={form.startsAt}
                onChange={e => setForm(f => ({ ...f, startsAt: e.target.value }))}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Voting Closes *</label>
              <input
                type="datetime-local" className="form-input"
                value={form.endsAt}
                onChange={e => setForm(f => ({ ...f, endsAt: e.target.value }))}
                required
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '.5rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
            <button type="button" className="btn btn-outline-dark" onClick={onCancel}>Cancel</button>
            <button type="submit" className="btn btn-gold" disabled={busy}>
              {busy ? 'Creating…' : 'Create & Continue →'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────
//  Election Detail PAGE (was a modal — now full page with positions/candidates)
// ────────────────────────────────────────────────────────────────────────
function ElectionDetailPage({ electionId, onBack, onChanged }) {
  const [election,  setElection]  = useState(null)
  const [results,   setResults]   = useState(null)
  const [error,     setError]     = useState('')
  const [eligibleMembers, setEligibleMembers] = useState([])

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

  // Fetch members & filter by election eligibility — used by candidate autocomplete
  useEffect(() => {
    if (!election) return
    api.get('/members').then(d => {
      const eligible = d.members.filter(m => {
        if (election.scope === 'NATIONAL') return true
        if (election.scope === 'REGIONAL') return m.region === election.region
        return false
      })
      setEligibleMembers(eligible)
    }).catch(() => {})
  }, [election?.id, election?.scope, election?.region])

  if (!election) {
    return (
      <div className="fade-in">
        <BackBar onBack={onBack} />
        {error ? <div className="auth-error">{error}</div> : <p>Loading…</p>}
      </div>
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
    } catch (err) { alert(err.message) }
  }

  const removePosition = async (positionId) => {
    if (!confirm('Remove this position and any candidates under it?')) return
    try {
      await api.delete(`/elections/positions/${positionId}`)
      await load(); onChanged()
    } catch (err) { alert(err.message) }
  }

  const removeCandidate = async (candidateId) => {
    if (!confirm('Remove this candidate?')) return
    try {
      await api.delete(`/elections/candidates/${candidateId}`)
      await load(); onChanged()
    } catch (err) { alert(err.message) }
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
      await load(); onChanged()
    } catch (err) { alert(err.message) }
  }

  const toggleResults = async () => {
    try {
      await api.post(`/elections/${electionId}/publish-results`, { resultsPublic: !election.resultsPublic })
      await load(); onChanged()
    } catch (err) { alert(err.message) }
  }

  const removeElection = async () => {
    if (!confirm('Delete this election? This cannot be undone.')) return
    try {
      await api.delete(`/elections/${electionId}`)
      onBack()
    } catch (err) { alert(err.message) }
  }

  return (
    <div className="fade-in">
      <BackBar onBack={onBack} />

      {/* Header */}
      <div style={{ background: T.white, borderRadius: 8, padding: '1.4rem 1.5rem', border: `1px solid rgba(122,58,24,.08)`, marginBottom: '1.2rem' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '.8rem', flexWrap: 'wrap', marginBottom: '.5rem' }}>
          <div style={{ flex: 1, minWidth: 240 }}>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.55rem', color: T.brownDeep, fontWeight: 600, marginBottom: '.3rem' }}>
              {election.title}
            </h2>
            <div style={{ fontSize: 12.5, color: T.brownPale }}>
              {election.scope === 'NATIONAL' ? '🇬🇭 National' : `📍 ${election.region} Region`} ·{' '}
              {fmtDateTime(election.startsAt)} → {fmtDateTime(election.endsAt)}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '.4rem', flexWrap: 'wrap' }}>
            <span className="tag-pill" style={STATUS_COLORS[election.status]}>{election.status}</span>
            {election.resultsPublic && (
              <span className="tag-pill" style={{ background: T.gold, color: T.brownDeep }}>Results public</span>
            )}
          </div>
        </div>
        {election.description && (
          <p style={{ fontSize: 13.5, color: T.textMid, marginTop: '.5rem', whiteSpace: 'pre-wrap', lineHeight: 1.55 }}>
            {election.description}
          </p>
        )}

        {/* Action row */}
        <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap', borderTop: `1px solid rgba(122,58,24,.06)`, paddingTop: '.9rem', marginTop: '1rem' }}>
          {election.status === 'OPEN' && (
            <button className="btn btn-outline-dark btn-sm" onClick={extend}>⏰ Extend end time</button>
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
            >🗑 Delete election</button>
          )}
        </div>
      </div>

      {/* Tally banner */}
      {(election.status === 'OPEN' || election.status === 'CLOSED') && results && (
        <div style={{ background: T.creamLight, borderRadius: 6, padding: '.8rem 1.1rem', marginBottom: '1.2rem', border: `1px solid rgba(122,58,24,.08)` }}>
          <div style={{ fontSize: 12.5, color: T.brownWarm, fontWeight: 600 }}>
            📊 Tally · {results.totalBallots} ballot{results.totalBallots === 1 ? '' : 's'} cast
          </div>
          <div style={{ fontSize: 11.5, color: T.brownPale, marginTop: 2 }}>
            Live counts visible to you (admin). Members see them only when results are published.
          </div>
        </div>
      )}

      {/* Positions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '.8rem', gap: '.8rem', flexWrap: 'wrap' }}>
        <h3 style={{ fontSize: '1.05rem', color: T.brownDeep, margin: 0 }}>
          Positions ({election.positions.length})
        </h3>
        {locked && (
          <span style={{ fontSize: 11.5, color: T.brownPale, fontStyle: 'italic' }}>
            🔒 Locked — voting has started, positions & candidates cannot be changed.
          </span>
        )}
      </div>

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
            eligibleMembers={eligibleMembers}
            existingCandidateUserIds={new Set(pos.candidates.map(c => c.userId).filter(Boolean))}
            onAddCandidate={async (payload) => {
              try {
                await api.post(`/elections/positions/${pos.id}/candidates`, payload)
                await load(); onChanged()
              } catch (err) { alert(err.message) }
            }}
            onRemoveCandidate={removeCandidate}
            onRemove={() => removePosition(pos.id)}
          />
        ))}
      </div>

      {!locked && (
        <div style={{ background: T.white, padding: '1rem 1.1rem', borderRadius: 6, border: `1px dashed rgba(122,58,24,.2)`, marginBottom: '1.5rem' }}>
          <label className="form-label" style={{ marginBottom: 6 }}>Add a position</label>
          <div style={{ display: 'flex', gap: '.5rem' }}>
            <input
              className="form-input"
              placeholder="e.g. President, Vice President, Secretary…"
              value={newPosTitle}
              onChange={e => setNewPosTitle(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addPosition())}
              style={{ flex: 1 }}
            />
            <button type="button" className="btn btn-gold btn-sm" onClick={addPosition}>
              + Add
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────
//  Single position with candidate list + autocomplete add form
// ────────────────────────────────────────────────────────────────────────
function PositionBlock({
  position, locked, results, totalBallots,
  eligibleMembers, existingCandidateUserIds,
  onAddCandidate, onRemoveCandidate, onRemove,
}) {
  const [showForm, setShowForm]   = useState(false)
  const [name,     setName]       = useState('')
  const [bio,      setBio]        = useState('')
  const [pickedUserId, setPickedUserId] = useState(null)

  const submit = (e) => {
    e.preventDefault()
    if (!name.trim()) return
    onAddCandidate({
      name: name.trim(),
      bio:  bio.trim() || null,
      userId: pickedUserId || null,
    })
    setName(''); setBio(''); setPickedUserId(null); setShowForm(false)
  }

  const sorted = results
    ? [...results.candidates].sort((a, b) => b.votes - a.votes)
    : position.candidates

  return (
    <div style={{ background: T.white, border: `1px solid rgba(122,58,24,.1)`, borderRadius: 6, padding: '1rem 1.1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '.7rem' }}>
        <div style={{ fontWeight: 600, color: T.brownDeep, fontSize: 14.5 }}>
          {position.title}
          <span style={{ fontSize: 11.5, color: T.brownPale, fontWeight: 400, marginLeft: 8 }}>
            ({position.candidates.length} candidate{position.candidates.length === 1 ? '' : 's'})
          </span>
        </div>
        {!locked && (
          <button
            type="button"
            onClick={onRemove}
            style={{ background: 'none', border: 'none', color: '#b91c1c', cursor: 'pointer', fontSize: 11, fontWeight: 600, letterSpacing: '.05em', textTransform: 'uppercase' }}
          >Remove</button>
        )}
      </div>

      {sorted.length === 0 ? (
        <p style={{ fontSize: 12, color: T.brownPale, marginBottom: '.6rem' }}>No candidates yet.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '.35rem', marginBottom: '.6rem' }}>
          {sorted.map(c => {
            const member = c.member ?? eligibleMembers.find(m => m.id === c.userId)
            const r   = results?.candidates.find(x => x.id === c.id)
            const pct = (results && totalBallots > 0 && r) ? (r.votes / totalBallots) * 100 : 0
            return (
              <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '.6rem', padding: '.5rem .6rem', borderRadius: 5, background: T.creamLight }}>
                {member ? (
                  <Avatar name={member.name} avatarFilename={member.avatarFilename} size={34} />
                ) : (
                  <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(122,58,24,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.brownWarm, fontSize: 13, fontWeight: 700 }}>
                    {(c.name || '?').charAt(0).toUpperCase()}
                  </div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 500, color: T.brownDeep }}>{c.name}</div>
                  {c.bio && <div style={{ fontSize: 11.5, color: T.brownPale, marginTop: 1 }}>{c.bio}</div>}
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
                    style={{ background: 'none', border: 'none', color: '#b91c1c', cursor: 'pointer', fontSize: 16, padding: 0, lineHeight: 1 }}
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
          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '.45rem', background: T.creamLight, padding: '.8rem', borderRadius: 5 }}>
            <CandidateNameInput
              value={name}
              onChange={(v) => { setName(v); setPickedUserId(null) }}
              eligibleMembers={eligibleMembers}
              excludeUserIds={existingCandidateUserIds}
              onSelectMember={(m) => {
                setName(m.name)
                setPickedUserId(m.id)
                setBio(m.position || m.department || '')
              }}
            />
            <input
              className="form-input"
              placeholder="Short bio / position (optional)"
              value={bio}
              onChange={e => setBio(e.target.value)}
            />
            {pickedUserId && (
              <div style={{ fontSize: 11.5, color: T.brownWarm, display: 'flex', alignItems: 'center', gap: 6 }}>
                ✓ Linked to a registered member
              </div>
            )}
            <div style={{ display: 'flex', gap: '.4rem' }}>
              <button type="submit" className="btn btn-gold btn-sm">Add Candidate</button>
              <button type="button" className="btn btn-outline-dark btn-sm" onClick={() => { setShowForm(false); setName(''); setBio(''); setPickedUserId(null) }}>Cancel</button>
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

// ────────────────────────────────────────────────────────────────────────
//  Candidate name input with eligible-member autocomplete
// ────────────────────────────────────────────────────────────────────────
function CandidateNameInput({ value, onChange, eligibleMembers, excludeUserIds, onSelectMember }) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef(null)

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const q = value.trim().toLowerCase()
  const suggestions = (q.length > 0 ? eligibleMembers : [])
    .filter(m => !excludeUserIds?.has(m.id))
    .filter(m =>
      m.name.toLowerCase().includes(q) ||
      (m.staffId && m.staffId.toLowerCase().includes(q)) ||
      (m.department && m.department.toLowerCase().includes(q))
    )
    .slice(0, 6)

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <input
        className="form-input"
        placeholder="Type a member's name to find them…"
        value={value}
        onChange={e => { onChange(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        autoFocus
      />
      {open && suggestions.length > 0 && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
          background: '#fff', border: `1px solid rgba(122,58,24,.18)`,
          borderRadius: 6, maxHeight: 260, overflowY: 'auto',
          boxShadow: '0 10px 24px rgba(30,15,8,.12)', zIndex: 30,
        }}>
          {suggestions.map(m => (
            <div
              key={m.id}
              onClick={() => { onSelectMember(m); setOpen(false) }}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '.55rem .7rem', cursor: 'pointer',
                borderBottom: '1px solid rgba(122,58,24,.06)',
              }}
              onMouseEnter={e => e.currentTarget.style.background = T.creamLight}
              onMouseLeave={e => e.currentTarget.style.background = '#fff'}
            >
              <Avatar name={m.name} avatarFilename={m.avatarFilename} size={32} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: T.brownDeep }}>{m.name}</div>
                <div style={{ fontSize: 11.5, color: T.brownPale }}>
                  {[m.position, m.department, m.region].filter(Boolean).join(' · ') || 'Member'}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {open && q.length > 0 && suggestions.length === 0 && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
          background: '#fff', border: `1px solid rgba(122,58,24,.18)`,
          borderRadius: 6, padding: '.6rem .8rem', boxShadow: '0 10px 24px rgba(30,15,8,.12)', zIndex: 30,
          fontSize: 12, color: T.brownPale,
        }}>
          No eligible members match "{value}". You can still type a custom name above.
        </div>
      )}
    </div>
  )
}
