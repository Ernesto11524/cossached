import { useEffect, useState } from 'react'
import { api } from '../lib/api.js'
import { T } from '../styles/tokens.js'
import Avatar from '../components/Avatar.jsx'
import { GHANA_REGIONS } from '../data/regions.js'

export default function DirectoryTab() {
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search,  setSearch]  = useState('')

  const load = (q = '') =>
    api.get(`/members${q ? `?search=${encodeURIComponent(q)}` : ''}`)
       .then(d => setMembers(d.members))
       .catch(() => {})
       .finally(() => setLoading(false))

  useEffect(() => { load() }, [])

  const handleSearch = (e) => {
    const q = e.target.value
    setSearch(q)
    clearTimeout(window._dirTimer)
    window._dirTimer = setTimeout(() => load(q), 300)
  }

  if (loading) return <p style={{ color: T.brownPale, padding: '2rem 0' }}>Loading…</p>

  // ── Build region groups ───────────────────────────────────────────────
  // Within each region: National execs first, then Regional execs, then
  // regular members — all in a single grid. Their badges still show who's
  // who. (The dedicated Executives tab is the leadership-only view.)
  const groups = GHANA_REGIONS.map(region => {
    const inRegion = members.filter(m => m.region === region)
    const national = inRegion.filter(m => m.positionScope === 'NATIONAL')
    const regional = inRegion.filter(m => m.positionScope === 'REGIONAL')
    const regular  = inRegion.filter(m => !m.positionScope)
    const execCount = national.length + regional.length
    return {
      region,
      members: [...national, ...regional, ...regular], // exec-first ordering preserved
      execCount,
      memberCount: regular.length,
      total: inRegion.length,
    }
  }).filter(g => g.total > 0)

  const unassigned = members.filter(m => !m.region)

  return (
    <div className="fade-in">
      <div style={{ marginBottom: '1.5rem' }}>
        <input
          className="form-input"
          style={{ maxWidth: 340 }}
          placeholder="Search by name, role or department…"
          value={search}
          onChange={handleSearch}
        />
      </div>

      {members.length === 0 ? (
        <p style={{ color: T.brownPale, fontSize: 13 }}>No members found.</p>
      ) : (
        <>
          {/* ── Regional sections (in official region order) ────────── */}
          {groups.map(({ region, members: regionMembers, execCount, total }) => (
            <section key={region} style={{ marginBottom: '2.5rem' }}>
              <BlockHeader
                title={`${region} Region`}
                subtitle={execCount > 0 ? `Includes ${execCount} executive${execCount === 1 ? '' : 's'}` : 'No executives'}
                count={total}
              />
              <div className="dir-grid">
                {regionMembers.map(m => <MemberCard key={m.id} member={m} />)}
              </div>
            </section>
          ))}

          {/* ── Members with no region set ──────────────────────────── */}
          {unassigned.length > 0 && (
            <section>
              <BlockHeader
                title="Other Members"
                subtitle="Members without a region assigned yet"
                count={unassigned.length}
              />
              <div className="dir-grid">
                {unassigned.map(m => <MemberCard key={m.id} member={m} />)}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  )
}

// ── Subcomponents ─────────────────────────────────────────────────────────

function BlockHeader({ title, subtitle, count }) {
  return (
    <div style={{
      marginBottom: '1.1rem',
      paddingBottom: '.7rem',
      borderBottom: `2px solid ${T.gold}`,
      display: 'flex',
      alignItems: 'baseline',
      justifyContent: 'space-between',
      gap: '1rem',
      flexWrap: 'wrap',
    }}>
      <div>
        <h3 style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: '1.25rem',
          color: T.brownDeep,
          marginBottom: '.2rem',
          display: 'flex',
          alignItems: 'center',
          gap: '.5rem',
        }}>
          <span>📍</span>{title}
        </h3>
        <p style={{ fontSize: 12, color: T.brownPale, margin: 0 }}>{subtitle}</p>
      </div>
      <span style={{
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: '.1em',
        color: T.brownWarm,
        background: T.creamDeep,
        padding: '3px 10px',
        borderRadius: 12,
      }}>
        {count} {count === 1 ? 'PERSON' : 'PEOPLE'}
      </span>
    </div>
  )
}

function MemberCard({ member: m }) {
  const isExec = !!m.positionScope
  return (
    <div className="member-card">
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '.9rem' }}>
        <Avatar
          name={m.name}
          avatarFilename={m.avatarFilename}
          size={70}
          border={isExec ? `3px solid ${T.gold}` : '3px solid rgba(201,168,76,0.3)'}
        />
      </div>
      <h4>{m.name}</h4>
      <div className="member-role">
        {m.position || (m.role === 'ADMIN' ? 'Administrator' : 'Member')}
      </div>
      <p>{m.department || '—'}</p>
      <div style={{ marginTop: '.8rem', display: 'flex', gap: '.3rem', justifyContent: 'center', flexWrap: 'wrap' }}>
        {m.role === 'ADMIN' && (
          <span className="tag-pill" style={{ background: '#fdf6ee', color: T.brownWarm }}>Admin</span>
        )}
        {m.positionScope === 'NATIONAL' && (
          <span className="tag-pill" style={{ background: T.gold, color: T.brownDeep }}>National Exec</span>
        )}
        {m.positionScope === 'REGIONAL' && (
          <span className="tag-pill" style={{ background: '#fdf6ee', color: T.brownWarm }}>Regional Exec</span>
        )}
      </div>
    </div>
  )
}
