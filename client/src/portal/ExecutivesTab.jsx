import { useEffect, useState } from 'react'
import { api } from '../lib/api.js'
import { T } from '../styles/tokens.js'
import Avatar from '../components/Avatar.jsx'
import { GHANA_REGIONS, isPresident } from '../data/regions.js'

export default function ExecutivesTab() {
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Server returns members already sorted (President → other National → Regional by region → others)
    api.get('/members')
       .then(d => setMembers(d.members))
       .catch(() => {})
       .finally(() => setLoading(false))
  }, [])

  if (loading) return <p style={{ color: T.brownPale, padding: '2rem 0' }}>Loading executives…</p>

  const president = members.find(isPresident) || null
  const otherNational = members.filter(m => m.positionScope === 'NATIONAL' && !isPresident(m))
  const regional = members.filter(m => m.positionScope === 'REGIONAL')

  // Group regional execs by region (preserves Ghana's official region order)
  const byRegion = GHANA_REGIONS.map(region => ({
    region,
    members: regional.filter(m => m.region === region),
  })).filter(g => g.members.length > 0)

  if (!president && otherNational.length === 0 && regional.length === 0) {
    return (
      <div className="fade-in">
        <div style={{ background: T.white, borderRadius: 7, padding: '3rem', textAlign: 'center', border: `1px solid rgba(122,58,24,.08)` }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '.6rem' }}>👥</div>
          <h3 className="serif" style={{ fontSize: '1.2rem', color: T.brownDeep, marginBottom: '.4rem' }}>
            No executives recorded yet
          </h3>
          <p style={{ fontSize: 13.5, color: T.textMid, maxWidth: 460, margin: '0 auto', lineHeight: 1.65 }}>
            Once the administrator tags a member with an executive position (from{' '}
            <strong>Manage Members</strong>), they will appear here.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="fade-in">
      {/* ── President hero card ──────────────────────────────────────────── */}
      {president && (
        <div style={{
          background: `linear-gradient(135deg, #FAF5EC 0%, #F0E4CC 100%)`,
          border: `1px solid rgba(201,168,76,.4)`,
          borderRadius: 10,
          padding: '2rem',
          marginBottom: '2rem',
          display: 'flex',
          gap: '1.8rem',
          alignItems: 'center',
          flexWrap: 'wrap',
        }}>
          <div style={{ position: 'relative' }}>
            <div style={{
              position: 'absolute', top: -6, left: '50%', transform: 'translateX(-50%)',
              background: T.gold, color: T.brownDeep,
              fontSize: 10, fontWeight: 700, letterSpacing: '.1em',
              padding: '3px 10px', borderRadius: 12,
              zIndex: 1, whiteSpace: 'nowrap',
            }}>
              ★ PRESIDENT
            </div>
            <Avatar
              name={president.name}
              avatarFilename={president.avatarFilename}
              size={130}
              border={`4px solid ${T.gold}`}
            />
          </div>
          <div style={{ flex: 1, minWidth: 240 }}>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '2rem', color: T.brownDeep, fontWeight: 600, lineHeight: 1.15, marginBottom: '.4rem' }}>
              {president.name}
            </h2>
            <div style={{ fontSize: 13, color: T.gold, letterSpacing: '.1em', textTransform: 'uppercase', fontWeight: 600, marginBottom: '.6rem' }}>
              {president.position}
            </div>
            {president.department && (
              <div style={{ fontSize: 13, color: T.textMid }}>{president.department}</div>
            )}
          </div>
        </div>
      )}

      {/* ── Other National Executives ────────────────────────────────────── */}
      {otherNational.length > 0 && (
        <div style={{ marginBottom: '2.5rem' }}>
          <SectionHeader title="National Executives" subtitle="Head-office officers serving the entire association" />
          <div className="dir-grid">
            {otherNational.map(m => <ExecCard key={m.id} member={m} />)}
          </div>
        </div>
      )}

      {/* ── Regional Executives ──────────────────────────────────────────── */}
      {byRegion.length > 0 && (
        <div>
          <SectionHeader title="Regional Executives" subtitle="Officers leading COSSA-CHED chapters in each region" />
          {byRegion.map(({ region, members }) => (
            <div key={region} style={{ marginBottom: '1.8rem' }}>
              <h3 style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: '1rem',
                color: T.brownWarm,
                marginBottom: '.7rem',
                display: 'flex',
                alignItems: 'center',
                gap: '.5rem',
              }}>
                📍 {region} Region
                <span style={{ fontSize: 11, color: T.brownPale, fontWeight: 400, fontFamily: "'DM Sans', sans-serif" }}>
                  ({members.length})
                </span>
              </h3>
              <div className="dir-grid">
                {members.map(m => <ExecCard key={m.id} member={m} />)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function SectionHeader({ title, subtitle }) {
  return (
    <div style={{ marginBottom: '1.2rem', borderBottom: `1px solid rgba(122,58,24,.1)`, paddingBottom: '.7rem' }}>
      <h3 style={{
        fontFamily: "'Playfair Display', serif",
        fontSize: '1.25rem',
        color: T.brownDeep,
        marginBottom: '.25rem',
        display: 'flex', alignItems: 'center', gap: '.5rem',
      }}>
        <span style={{ color: T.gold }}>★</span>{title}
      </h3>
      <p style={{ fontSize: 12.5, color: T.brownPale, margin: 0 }}>{subtitle}</p>
    </div>
  )
}

function ExecCard({ member }) {
  return (
    <div className="member-card">
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '.9rem' }}>
        <Avatar
          name={member.name}
          avatarFilename={member.avatarFilename}
          size={75}
          border="3px solid rgba(201,168,76,0.35)"
        />
      </div>
      <h4>{member.name}</h4>
      <div className="member-role">{member.position}</div>
      <p>{member.department || '—'}</p>
    </div>
  )
}
