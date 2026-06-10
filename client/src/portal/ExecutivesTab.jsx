import { useEffect, useState } from 'react'
import { api } from '../lib/api.js'
import { T } from '../styles/tokens.js'
import Avatar from '../components/Avatar.jsx'
import { GHANA_REGIONS } from '../data/regions.js'
import { NATIONAL_POSITIONS, REGIONAL_POSITIONS } from '../data/positions.js'

export default function ExecutivesTab() {
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/members')
       .then(d => setMembers(d.members))
       .catch(() => {})
       .finally(() => setLoading(false))
  }, [])

  if (loading) return <p style={{ color: T.brownPale, padding: '2rem 0' }}>Loading executives…</p>

  // For a given position (and optional region), find the member holding it.
  const memberFor = (pos, region = null) =>
    members.find(m =>
      m.position === pos &&
      (region == null || m.region === region)
    ) || null

  const chairman      = memberFor(NATIONAL_POSITIONS[0])
  const otherNational = NATIONAL_POSITIONS.slice(1).map(pos => ({ pos, member: memberFor(pos) }))

  // For each region build the 6-slot card list.
  const byRegion = GHANA_REGIONS.map(region => ({
    region,
    slots: REGIONAL_POSITIONS.map(pos => ({ pos, member: memberFor(pos, region) })),
    filled: REGIONAL_POSITIONS.filter(pos => memberFor(pos, region)).length,
  }))

  return (
    <div className="fade-in">
      {/* ── Chairman hero ────────────────────────────────────────────────── */}
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
          }}>★ CHAIRMAN</div>
          {chairman ? (
            <Avatar
              name={chairman.name}
              avatarFilename={chairman.avatarFilename}
              size={130}
              border={`4px solid ${T.gold}`}
            />
          ) : (
            <PlaceholderCircle size={130} />
          )}
        </div>
        <div style={{ flex: 1, minWidth: 240 }}>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '2rem', color: T.brownDeep, fontWeight: 600, lineHeight: 1.15, marginBottom: '.4rem' }}>
            {chairman?.name || 'Position to be filled'}
          </h2>
          <div style={{ fontSize: 13, color: T.gold, letterSpacing: '.1em', textTransform: 'uppercase', fontWeight: 600, marginBottom: '.6rem' }}>
            Chairman
          </div>
          {chairman?.department && (
            <div style={{ fontSize: 13, color: T.textMid }}>{chairman.department}</div>
          )}
        </div>
      </div>

      {/* ── Other National Executives ────────────────────────────────────── */}
      <div style={{ marginBottom: '2.5rem' }}>
        <SectionHeader title="National Executives" subtitle="Head-office officers serving the entire association" />
        <SlotsGrid slots={otherNational} />
      </div>

      {/* ── Regional Executives ──────────────────────────────────────────── */}
      <div>
        <SectionHeader title="Regional Executives" subtitle="Officers leading COSSA-CHED chapters in each region" />
        {byRegion.map(({ region, slots, filled }) => (
          <RegionBlock key={region} region={region} slots={slots} filled={filled} />
        ))}
      </div>
    </div>
  )
}

// ── Sub-components ──────────────────────────────────────────────────────

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

function RegionBlock({ region, slots, filled }) {
  const [open, setOpen] = useState(filled > 0)
  return (
    <div style={{ marginBottom: '1.4rem' }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', background: 'none', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '.6rem .2rem', textAlign: 'left',
        }}
      >
        <h4 style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: '1.05rem',
          color: T.brownWarm,
          margin: 0,
          display: 'flex', alignItems: 'center', gap: '.5rem',
        }}>
          📍 {region} Region
          <span style={{
            fontSize: 11, color: T.brownPale, fontWeight: 400,
            fontFamily: "'DM Sans', sans-serif",
          }}>
            {filled} of 6 filled
          </span>
        </h4>
        <span style={{ fontSize: 12, color: T.brownPale }}>{open ? '▾ Hide' : '▸ Show'}</span>
      </button>
      {open && (
        <div style={{ marginTop: '.4rem' }}>
          <SlotsGrid slots={slots} />
        </div>
      )}
    </div>
  )
}

function SlotsGrid({ slots }) {
  return (
    <div className="dir-grid">
      {slots.map(({ pos, member }) => (
        <SlotCard key={pos} pos={pos} member={member} />
      ))}
    </div>
  )
}

function SlotCard({ pos, member }) {
  return (
    <div className="member-card" style={{ opacity: member ? 1 : 0.85 }}>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
        {member ? (
          <Avatar
            name={member.name}
            avatarFilename={member.avatarFilename}
            size={100}
            border={`4px solid ${T.gold}`}
          />
        ) : (
          <PlaceholderCircle size={100} />
        )}
      </div>
      <h4>{member?.name || 'To be filled'}</h4>
      <div className="member-role">{pos}</div>
      <p>{member?.department || '—'}</p>
    </div>
  )
}

function PlaceholderCircle({ size }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: 'rgba(122,58,24,.06)',
      border: `4px dashed rgba(201,168,76,.4)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.34, color: 'rgba(122,58,24,.25)',
    }}>👤</div>
  )
}
