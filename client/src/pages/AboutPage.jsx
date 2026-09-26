import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import SectionTag from '../components/SectionTag.jsx'
import Avatar from '../components/Avatar.jsx'
import { useReveal } from '../hooks/useReveal.js'
import { ABOUT_PILLARS_FULL, CHED_UNITS } from '../data/placeholder.js'
import { NATIONAL_POSITIONS } from '../data/positions.js'
import { api } from '../lib/api.js'
import { T } from '../styles/tokens.js'

const FEATURED_PARAGRAPHS = [
  'Formal Congratulatory Message:',
  'Commendation and Call to Collaborative Action – Newly Elected COSSA-CHED Executive Council',
  'The Executive Director of the Cocoa Health and Extension Division (CHED), Dr. Richard Adu-Acheampong, extends his sincere congratulations to the newly elected national executives of the Cocoa Officers Senior Staff Association (COSSA-CHED).',
  'Dr. Adu-Acheampong commends the members of the association for the successful exercise of their democratic mandate. In his address to the new leadership, he emphasized the critical role of the association in advancing the division\'s strategic objectives.',
  '"I urge the incoming executive council to prioritize a spirit of synergy and collaboration," stated Dr. Adu-Acheampong.',
  'By fostering a cohesive partnership with CHED management and remaining steadfast in your commitment to the welfare and professional development of our members, you will play an indispensable role in the continued success of our organization.',
  'The Executive Director reaffirmed his commitment to maintaining an open dialogue with the new leadership, ensuring that the association remains a vital partner in the collective mission to drive excellence within the cocoa sector.',
]

export default function AboutPage() {
  const navigate = useNavigate()
  useReveal()

  const [execs, setExecs] = useState([])

  useEffect(() => {
    api.get('/members/public-executives')
       .then(d => setExecs(d.executives || []))
       .catch(() => setExecs([]))
  }, [])

  // Find who's serving each canonical national position (if anyone).
  // The first position (Chairman) gets the hero card; the rest go into the grid.
  const memberFor = (pos) => execs.find(m => m.position === pos) || null
  const chairman      = memberFor(NATIONAL_POSITIONS[0])
  const otherNational = NATIONAL_POSITIONS.slice(1).map(pos => ({ pos, member: memberFor(pos) }))

  return (
    <>
      {/* ── Banner ───────────────────────────────────────────────────────── */}
      <div className="page-banner">
        <div className="page-banner-inner">
          <SectionTag label="About" />
          <h1>
            About <em>COSSA-CHED</em>
          </h1>
          <p>
            The CHED Senior Staff Association — our history, mission and the
            people we serve.
          </p>
        </div>
      </div>

      {/* ── Story section ────────────────────────────────────────────────── */}
      <section className="section" style={{ background: T.white }}>
        <div className="section-inner">
          <div className="about-grid reveal">
            {/* Image */}
            <div className="about-img">
              <img
                src="/about-hero.jpg"
                alt="COSSA-CHED members on an international study tour"
                loading="lazy"
              />
              <div className="about-img-overlay" />
              <div className="about-img-caption">
                "Standing together, growing together"
              </div>
            </div>

            {/* Text */}
            <div>
              <SectionTag label="Our Story" />
              <h2 className="section-title">
                Rooted in <em>Service</em>
              </h2>
              <p className="section-body">
                The CHED Senior Staff Association (COSSA-CHED) represents the
                interests of senior staff across the Cocoa Health &amp; Extension
                Division of COCOBOD — one of Ghana's most critical agricultural
                bodies. Our members are the extension officers, disease-control
                supervisors, researchers, and administrators who protect the
                health of Ghana's cocoa crop and support the farmers who grow it.
              </p>
              <p className="section-body" style={{ marginTop: '1rem' }}>
                COSSA-CHED works to ensure fair treatment, protect member welfare,
                and maintain constructive industrial relations between our members
                and CHED / COCOBOD management. The association organises training,
                advocates on policy matters, and provides social support to members
                and their families.
              </p>
              <p className="section-body" style={{ marginTop: '1rem' }}>
                COCOBOD was established in 1947 with the mandate to facilitate the
                production, processing, and marketing of quality cocoa, coffee, and
                sheanut in Ghana. CHED — and the staff COSSA-CHED serves — sit at the
                heart of that mission every day.
              </p>

              {/* Mission / Vision / Values / CSR */}
              <div className="pillars">
                {ABOUT_PILLARS_FULL.map(({ icon, title, desc }) => (
                  <div className="pillar" key={title}>
                    <div style={{ fontSize: '1.4rem' }}>{icon}</div>
                    <h4>{title}</h4>
                    <p>{desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Featured article ─────────────────────────────────────────────── */}
      <section className="section" style={{ background: T.creamDeep }}>
        <div className="section-inner">
          <div className="reveal" style={{ maxWidth: 820, margin: '0 auto' }}>
            <SectionTag label="Latest" />
            <h2 className="section-title" style={{ marginBottom: '1.5rem' }}>
              Commendation and Call To Collaborative Action — Newly Elected COSSA-CHED Executive Council
            </h2>
            <div style={{
              borderRadius: 10,
              overflow: 'hidden',
              marginBottom: '1.8rem',
              boxShadow: '0 8px 32px rgba(30,15,8,0.10)',
            }}>
              <img
                src="/api/news/cmqjo0gmy0030n4bamooom3hp/media"
                alt="Newly Elected COSSA-CHED Executive Council"
                loading="lazy"
                style={{ width: '100%', display: 'block', maxHeight: 460, objectFit: 'cover' }}
              />
            </div>
            {FEATURED_PARAGRAPHS.map((para, i) => (
              <p key={i} className="section-body" style={{ marginTop: i === 0 ? 0 : '1rem' }}>
                {para}
              </p>
            ))}
          </div>
        </div>
      </section>

      {/* ── CHED structure ───────────────────────────────────────────────── */}
      <section className="section" style={{ background: T.creamDeep }}>
        <div className="section-inner">
          <div style={{ textAlign: 'center', marginBottom: '3rem' }} className="reveal">
            <SectionTag label="Structure" />
            <h2
              className="section-title"
              style={{ maxWidth: 520, margin: '0 auto' }}
            >
              COSSA-CHED Covers All <em>CHED Units</em>
            </h2>
            <p
              style={{
                fontSize: 14.5,
                color: T.textMid,
                maxWidth: 500,
                margin: '0 auto',
                lineHeight: 1.7,
                fontWeight: 300,
              }}
            >
              From headquarters in Accra to district offices across the cocoa
              belt, COSSA-CHED represents every CHED senior staff member.
            </p>
          </div>

          <div
            className="reveal"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
              gap: '1.2rem',
            }}
          >
            {CHED_UNITS.map(({ icon, title, desc }) => (
              <div
                key={title}
                style={{
                  background: T.white,
                  borderRadius: 7,
                  padding: '1.5rem',
                  border: `1px solid rgba(122,58,24,0.09)`,
                  transition: 'box-shadow 0.25s',
                  cursor: 'default',
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.boxShadow = '0 8px 28px rgba(30,15,8,0.08)')
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.boxShadow = 'none')
                }
              >
                <div style={{ fontSize: '1.8rem', marginBottom: '0.7rem' }}>{icon}</div>
                <h4
                  style={{
                    fontFamily: "'Playfair Display', serif",
                    fontSize: '1rem',
                    fontWeight: 600,
                    color: T.brownDeep,
                    marginBottom: '0.3rem',
                  }}
                >
                  {title}
                </h4>
                <p style={{ fontSize: 12.5, color: T.textMid, lineHeight: 1.6 }}>
                  {desc}
                </p>
              </div>
            ))}
          </div>

          {/* ── Regional Channels ── */}
          <div className="reveal" style={{ marginTop: '3rem' }}>
            <h3 style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: '1.3rem',
              fontWeight: 600,
              color: T.brownDeep,
              textAlign: 'center',
              marginBottom: '1.5rem',
            }}>
              COSSA-CHED Regional <em>Channels</em>
            </h3>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: '0.9rem',
            }}>
              {[
                { num: 1, name: 'Eastern Region' },
                { num: 2, name: 'Ashanti' },
                { num: 3, name: 'Bono Ahafo' },
                { num: 4, name: 'Western North' },
                { num: 5, name: 'Central' },
                { num: 6, name: 'Bunsu' },
                { num: 7, name: 'Volta' },
                { num: 8, name: 'Greater Accra Head Office' },
                { num: 9, name: 'Western South' },
              ].map(({ num, name }) => (
                <div key={num} style={{
                  background: T.white,
                  borderRadius: 7,
                  padding: '1rem 1.2rem',
                  border: `1px solid rgba(122,58,24,0.09)`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.9rem',
                }}>
                  <div style={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    background: T.brownDeep,
                    color: T.gold,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: "'Playfair Display', serif",
                    fontWeight: 700,
                    fontSize: '0.95rem',
                    flexShrink: 0,
                  }}>{num}</div>
                  <div>
                    <div style={{ fontSize: 11, color: T.gold, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Channel {num}</div>
                    <div style={{ fontSize: 13.5, color: T.brownDeep, fontWeight: 500, marginTop: 2 }}>{name}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── National Leadership ──────────────────────────────────────────── */}
      <section className="section" style={{ background: T.white }}>
        <div className="section-inner">
          <div style={{ textAlign: 'center', marginBottom: '2.5rem' }} className="reveal">
            <SectionTag label="Leadership" />
            <h2 className="section-title" style={{ maxWidth: 580, margin: '0 auto' }}>
              Our National <em>Executives</em>
            </h2>
            <p style={{ fontSize: 14.5, color: T.textMid, maxWidth: 540, margin: '0 auto', lineHeight: 1.7, fontWeight: 300 }}>
              The officers leading COSSA-CHED at the national level — Chairman, Vice Chairman,
              General Secretary, Financial Secretary, and the two Trustees.
            </p>
          </div>

          {/* Chairman hero */}
          <div className="reveal" style={{
            background: `linear-gradient(135deg, #FAF5EC 0%, #F0E4CC 100%)`,
            border: `1px solid rgba(201,168,76,.4)`,
            borderRadius: 10,
            padding: '2rem',
            marginBottom: '2.5rem',
            display: 'flex',
            gap: '1.8rem',
            alignItems: 'center',
            flexWrap: 'wrap',
            justifyContent: 'center',
          }}>
            <div style={{ position: 'relative' }}>
              <div style={{
                position: 'absolute', top: -6, left: '50%', transform: 'translateX(-50%)',
                background: T.gold, color: T.brownDeep,
                fontSize: 10, fontWeight: 700, letterSpacing: '.1em',
                padding: '3px 10px', borderRadius: 12,
                zIndex: 1, whiteSpace: 'nowrap',
              }}>★ CHAIRMAN</div>
              <Avatar
                name={chairman?.name || '?'}
                avatarFilename={chairman?.avatarFilename}
                size={140}
                border={`4px solid ${T.gold}`}
              />
            </div>
            <div style={{ flex: '1 1 240px', minWidth: 240 }}>
              <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '2rem', color: T.brownDeep, fontWeight: 600, lineHeight: 1.15, marginBottom: '.4rem' }}>
                {chairman?.name || 'Position to be announced'}
              </h3>
              <div style={{ fontSize: 13, color: T.gold, letterSpacing: '.1em', textTransform: 'uppercase', fontWeight: 600, marginBottom: '.6rem' }}>
                Chairman
              </div>
              {chairman?.department && (
                <div style={{ fontSize: 13, color: T.textMid }}>{chairman.department}</div>
              )}
            </div>
          </div>

          {/* Other 5 national executives */}
          <div className="reveal">
            <ExecGrid slots={otherNational} />
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────── */}
      <section
        style={{
          background: T.brownDeep,
          padding: '60px 3rem',
          textAlign: 'center',
        }}
      >
        <h2
          className="serif"
          style={{
            fontSize: 'clamp(1.5rem, 2.8vw, 2.2rem)',
            color: '#fff',
            fontWeight: 400,
            marginBottom: '0.8rem',
          }}
        >
          Have questions about COSSA-CHED?
        </h2>
        <p
          style={{
            fontSize: 14.5,
            color: 'rgba(255,255,255,0.6)',
            marginBottom: '1.8rem',
          }}
        >
          Reach the secretariat — we're happy to assist members and CHED staff.
        </p>
        <button className="btn btn-gold" onClick={() => navigate('/contact')}>
          Get in Touch →
        </button>
      </section>
    </>
  )
}

function ExecGrid({ slots }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
      gap: '1.2rem',
    }}>
      {slots.map(({ pos, member }) => (
        <div key={pos} style={{
          background: T.white,
          borderRadius: 7,
          padding: '1.4rem 1rem',
          border: `1px solid rgba(122,58,24,0.09)`,
          textAlign: 'center',
          transition: 'box-shadow 0.25s',
          opacity: member ? 1 : 0.85,
        }}
        onMouseEnter={e => e.currentTarget.style.boxShadow = '0 8px 28px rgba(30,15,8,0.08)'}
        onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
        >
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '.9rem' }}>
            {member ? (
              <Avatar
                name={member.name}
                avatarFilename={member.avatarFilename}
                size={100}
                border={`4px solid ${T.gold}`}
              />
            ) : (
              <div style={{
                width: 100, height: 100, borderRadius: '50%',
                background: 'rgba(122,58,24,.06)',
                border: `4px dashed rgba(201,168,76,.4)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 34, color: 'rgba(122,58,24,.25)',
              }}>👤</div>
            )}
          </div>
          <h4 style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: '1rem',
            fontWeight: 600,
            color: T.brownDeep,
            marginBottom: '.25rem',
          }}>{member?.name || 'To be announced'}</h4>
          <div style={{
            fontSize: 11.5,
            color: T.gold,
            letterSpacing: '.08em',
            textTransform: 'uppercase',
            fontWeight: 600,
            marginBottom: '.25rem',
          }}>{pos}</div>
          {member?.department && (
            <div style={{ fontSize: 12, color: T.textMid }}>{member.department}</div>
          )}
        </div>
      ))}
    </div>
  )
}
