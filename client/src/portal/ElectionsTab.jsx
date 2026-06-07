import { useEffect, useState } from 'react'
import { api, fmtDateTime } from '../lib/api.js'
import { T } from '../styles/tokens.js'

const STATUS_COLORS = {
  SCHEDULED: { bg: '#fef9c3', color: '#854d0e' },
  OPEN:      { bg: '#dcfce7', color: '#166534' },
  CLOSED:    { bg: '#e5e7eb', color: '#374151' },
}

export default function ElectionsTab() {
  const [elections, setElections] = useState([])
  const [loading,   setLoading]   = useState(true)
  const [voting,    setVoting]    = useState(null)
  const [viewing,   setViewing]   = useState(null)

  const load = () =>
    api.get('/elections')
       .then(d => setElections(d.elections))
       .catch(() => {})
       .finally(() => setLoading(false))

  useEffect(() => { load() }, [])

  if (loading) return <p style={{ color: T.brownPale, padding: '2rem 0' }}>Loading…</p>

  const openVotes  = elections.filter(e => e.status === 'OPEN' && e.eligible && !e.hasVoted)
  const upcoming   = elections.filter(e => e.status === 'SCHEDULED' && e.eligible)
  const voted      = elections.filter(e => e.status === 'OPEN' && e.hasVoted)
  const past       = elections.filter(e => e.status === 'CLOSED')

  return (
    <div className="fade-in">
      <p style={{ fontSize: 13.5, color: T.textMid, marginBottom: '1.5rem', maxWidth: 600, lineHeight: 1.6 }}>
        Cast your ballot in open elections you're eligible for. Your vote is anonymous —
        no one can see who you voted for, only that you voted.
      </p>

      {/* Open & eligible to vote */}
      {openVotes.length > 0 && (
        <Section title="🗳️  Open — your vote is needed" tint="#dcfce7" tintBorder="#86efac">
          {openVotes.map(e => (
            <ElectionRow key={e.id} election={e} action="VOTE" onAction={() => setVoting(e)} />
          ))}
        </Section>
      )}

      {voted.length > 0 && (
        <Section title="✅  You've voted" tint={T.creamLight}>
          {voted.map(e => (
            <ElectionRow
              key={e.id}
              election={e}
              statusNote="Thank you — your ballot has been recorded."
              action={e.resultsPublic ? 'VIEW' : null}
              onAction={() => setViewing(e)}
            />
          ))}
        </Section>
      )}

      {upcoming.length > 0 && (
        <Section title="⏰  Upcoming" tint={T.creamLight}>
          {upcoming.map(e => (
            <ElectionRow key={e.id} election={e} statusNote={`Voting opens ${fmtDateTime(e.startsAt)}`} />
          ))}
        </Section>
      )}

      {past.length > 0 && (
        <Section title="🏛️  Past elections" tint="#fff">
          {past.map(e => (
            <ElectionRow
              key={e.id}
              election={e}
              action={e.resultsPublic ? 'VIEW' : null}
              statusNote={!e.resultsPublic ? 'Results not yet published.' : null}
              onAction={() => setViewing(e)}
            />
          ))}
        </Section>
      )}

      {elections.length === 0 && (
        <div style={{ background: T.white, borderRadius: 7, padding: '3rem', textAlign: 'center', border: `1px solid rgba(122,58,24,.08)` }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '.6rem' }}>🗳️</div>
          <p style={{ color: T.brownPale, fontSize: 13 }}>
            No elections scheduled yet. You'll see them here when the administrator opens one.
          </p>
        </div>
      )}

      {voting && (
        <VoteModal
          election={voting}
          onClose={() => setVoting(null)}
          onSubmitted={() => { setVoting(null); load() }}
        />
      )}

      {viewing && (
        <ResultsModal election={viewing} onClose={() => setViewing(null)} />
      )}
    </div>
  )
}

// ── Section header + group of rows ───────────────────────────────────────
function Section({ title, tint, tintBorder, children }) {
  return (
    <div style={{ marginBottom: '2rem' }}>
      <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.1rem', color: T.brownDeep, marginBottom: '.8rem' }}>
        {title}
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '.7rem' }}>
        {Array.isArray(children)
          ? children.map((c, i) =>
              <div key={i} style={{ background: tint || T.white, border: `1px solid ${tintBorder || 'rgba(122,58,24,.08)'}`, borderRadius: 7 }}>{c}</div>
            )
          : <div style={{ background: tint || T.white, border: `1px solid ${tintBorder || 'rgba(122,58,24,.08)'}`, borderRadius: 7 }}>{children}</div>}
      </div>
    </div>
  )
}

// ── Single election row ──────────────────────────────────────────────────
function ElectionRow({ election, statusNote, action, onAction }) {
  return (
    <div style={{ padding: '1rem 1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
      <div style={{ flex: 1, minWidth: 200 }}>
        <div style={{ fontWeight: 600, color: T.brownDeep, fontSize: 14, marginBottom: '.2rem' }}>
          {election.title}
        </div>
        <div style={{ fontSize: 11.5, color: T.brownPale }}>
          {election.scope === 'NATIONAL' ? '🇬🇭 National' : `📍 ${election.region}`} ·{' '}
          {election.positions.length} position{election.positions.length === 1 ? '' : 's'} ·{' '}
          Closes {fmtDateTime(election.endsAt)}
        </div>
        {statusNote && (
          <div style={{ fontSize: 11.5, color: T.brownWarm, marginTop: '.3rem' }}>{statusNote}</div>
        )}
      </div>
      {action === 'VOTE' && (
        <button className="btn btn-gold btn-sm" onClick={onAction}>
          🗳️ Cast Vote
        </button>
      )}
      {action === 'VIEW' && (
        <button className="btn btn-outline-dark btn-sm" onClick={onAction}>
          📊 View Results
        </button>
      )}
    </div>
  )
}

// ── Vote modal ──────────────────────────────────────────────────────────
function VoteModal({ election, onClose, onSubmitted }) {
  // ballot[positionId] = candidateId | '' (abstain)
  const [ballot, setBallot] = useState(() => {
    const init = {}
    election.positions.forEach(p => { init[p.id] = '' })
    return init
  })
  const [error,    setError]    = useState('')
  const [busy,     setBusy]     = useState(false)
  const [step,     setStep]     = useState('vote') // 'vote' | 'confirm'

  const submit = async () => {
    setError('')
    setBusy(true)
    try {
      const votes = election.positions.map(p => ({
        positionId:  p.id,
        candidateId: ballot[p.id] || null,
      }))
      await api.post(`/elections/${election.id}/vote`, { votes })
      onSubmitted()
    } catch (err) {
      setError(err.message)
      setStep('vote')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(30,15,8,0.75)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: T.white, borderRadius: 10, maxWidth: 600, width: '100%', maxHeight: '92vh', overflow: 'auto', padding: '1.8rem', position: 'relative' }}>
        <button onClick={onClose} aria-label="Close" style={{ position: 'absolute', top: 12, right: 14, background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: T.brownPale, padding: 0 }}>✕</button>

        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.4rem', color: T.brownDeep, fontWeight: 600, marginBottom: '.3rem' }}>
          {election.title}
        </h2>
        <p style={{ fontSize: 12.5, color: T.brownPale, marginBottom: '1.2rem' }}>
          Voting closes {fmtDateTime(election.endsAt)} · Your vote is anonymous
        </p>

        {error && <div className="auth-error">{error}</div>}

        {step === 'vote' ? (
          <>
            {election.positions.map(pos => (
              <div key={pos.id} style={{ marginBottom: '1.4rem', paddingBottom: '1.4rem', borderBottom: `1px solid rgba(122,58,24,.08)` }}>
                <h3 style={{ fontSize: '1rem', color: T.brownDeep, fontWeight: 600, marginBottom: '.7rem' }}>
                  {pos.title}
                </h3>
                {pos.candidates.length === 0 ? (
                  <p style={{ fontSize: 12, color: T.brownPale }}>No candidates standing for this position.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
                    {pos.candidates.map(c => (
                      <label key={c.id} style={{
                        display: 'flex', alignItems: 'flex-start', gap: '.7rem',
                        padding: '.8rem 1rem', borderRadius: 5,
                        border: `1.5px solid ${ballot[pos.id] === c.id ? T.gold : 'rgba(122,58,24,.18)'}`,
                        background: ballot[pos.id] === c.id ? 'rgba(201,168,76,.06)' : '#fff',
                        cursor: 'pointer',
                      }}>
                        <input
                          type="radio"
                          name={`pos-${pos.id}`}
                          value={c.id}
                          checked={ballot[pos.id] === c.id}
                          onChange={() => setBallot(b => ({ ...b, [pos.id]: c.id }))}
                          style={{ marginTop: 3 }}
                        />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13.5, fontWeight: 600, color: T.brownDeep }}>{c.name}</div>
                          {c.bio && <div style={{ fontSize: 12, color: T.textMid, marginTop: 3, lineHeight: 1.5 }}>{c.bio}</div>}
                        </div>
                      </label>
                    ))}
                    <label style={{
                      display: 'flex', alignItems: 'center', gap: '.7rem',
                      padding: '.6rem 1rem', borderRadius: 5,
                      border: `1.5px dashed ${ballot[pos.id] === '' ? T.brownPale : 'rgba(122,58,24,.12)'}`,
                      background: '#fff', cursor: 'pointer',
                    }}>
                      <input
                        type="radio"
                        name={`pos-${pos.id}`}
                        value=""
                        checked={ballot[pos.id] === ''}
                        onChange={() => setBallot(b => ({ ...b, [pos.id]: '' }))}
                      />
                      <span style={{ fontSize: 12.5, color: T.brownPale }}>Abstain</span>
                    </label>
                  </div>
                )}
              </div>
            ))}

            <div style={{ display: 'flex', gap: '.5rem', justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-outline-dark" onClick={onClose}>Cancel</button>
              <button
                type="button"
                className="btn btn-gold"
                onClick={() => setStep('confirm')}
              >
                Review & Submit →
              </button>
            </div>
          </>
        ) : (
          <>
            <div style={{ background: T.creamLight, borderRadius: 6, padding: '1rem 1.2rem', marginBottom: '1.2rem', border: `1px solid rgba(122,58,24,.1)` }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: T.brownWarm, letterSpacing: '.05em', textTransform: 'uppercase', marginBottom: '.6rem' }}>
                Your Ballot
              </div>
              {election.positions.map(pos => {
                const candidateId = ballot[pos.id]
                const candidate   = pos.candidates.find(c => c.id === candidateId)
                return (
                  <div key={pos.id} style={{ marginBottom: '.5rem' }}>
                    <span style={{ fontSize: 12, color: T.brownPale }}>{pos.title}: </span>
                    <strong style={{ fontSize: 13, color: candidate ? T.brownDeep : T.brownPale }}>
                      {candidate ? candidate.name : '(abstain)'}
                    </strong>
                  </div>
                )
              })}
            </div>

            <p style={{ fontSize: 12.5, color: T.textMid, marginBottom: '1.2rem', lineHeight: 1.55 }}>
              ⚠️ Once submitted you cannot change your vote. Your ballot will be recorded anonymously — no one will be able to link it back to you.
            </p>

            <div style={{ display: 'flex', gap: '.5rem', justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-outline-dark" onClick={() => setStep('vote')} disabled={busy}>← Back</button>
              <button type="button" className="btn btn-gold" onClick={submit} disabled={busy}>
                {busy ? 'Submitting…' : '✓ Submit Final Vote'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ── Results modal (public results for closed elections) ─────────────────
function ResultsModal({ election, onClose }) {
  const [data, setData]   = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get(`/elections/${election.id}/results`)
       .then(d => setData(d))
       .catch(err => setError(err.message))
  }, [election.id])

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(30,15,8,0.75)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: T.white, borderRadius: 10, maxWidth: 700, width: '100%', maxHeight: '92vh', overflow: 'auto', padding: '1.8rem', position: 'relative' }}>
        <button onClick={onClose} aria-label="Close" style={{ position: 'absolute', top: 12, right: 14, background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: T.brownPale, padding: 0 }}>✕</button>

        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.4rem', color: T.brownDeep, fontWeight: 600, marginBottom: '.3rem' }}>
          {election.title}
        </h2>
        <p style={{ fontSize: 12.5, color: T.brownPale, marginBottom: '1.2rem' }}>
          Final results · {fmtDateTime(election.endsAt)}
        </p>

        {error && <div className="auth-error">{error}</div>}

        {!data ? <p>Loading…</p> : (
          <>
            <div style={{ background: T.creamLight, borderRadius: 6, padding: '.8rem 1rem', marginBottom: '1.2rem', fontSize: 12.5, color: T.brownWarm, fontWeight: 600 }}>
              📊 Total ballots cast: {data.totalBallots}
            </div>

            {data.results.map(pos => {
              const sorted = [...pos.candidates].sort((a, b) => b.votes - a.votes)
              const winner = sorted[0]
              return (
                <div key={pos.id} style={{ marginBottom: '1.5rem', paddingBottom: '1.2rem', borderBottom: `1px solid rgba(122,58,24,.08)` }}>
                  <h3 style={{ fontSize: '1rem', color: T.brownDeep, fontWeight: 600, marginBottom: '.7rem' }}>
                    {pos.title}
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
                    {sorted.map((c, i) => {
                      const pct = data.totalBallots > 0 ? (c.votes / data.totalBallots) * 100 : 0
                      const isWinner = i === 0 && winner.votes > 0
                      return (
                        <div key={c.id} style={{
                          padding: '.7rem .9rem', borderRadius: 5,
                          background: isWinner ? 'rgba(201,168,76,.12)' : T.creamLight,
                          border: `1px solid ${isWinner ? T.gold : 'rgba(122,58,24,.08)'}`,
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.4rem' }}>
                            <span style={{ fontSize: 13.5, fontWeight: 600, color: T.brownDeep }}>
                              {isWinner ? '🏆 ' : ''}{c.name}
                            </span>
                            <span style={{ fontSize: 13, fontWeight: 700, color: T.brownWarm }}>
                              {c.votes} ({pct.toFixed(1)}%)
                            </span>
                          </div>
                          <div style={{ height: 6, background: 'rgba(122,58,24,.1)', borderRadius: 3, overflow: 'hidden' }}>
                            <div style={{ width: `${pct}%`, height: '100%', background: isWinner ? T.gold : T.brownLight }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </>
        )}
      </div>
    </div>
  )
}
