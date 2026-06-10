import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import SectionTag from '../components/SectionTag.jsx'
import Avatar from '../components/Avatar.jsx'
import { useReveal } from '../hooks/useReveal.js'
import { ABOUT_PILLARS_FULL, CHED_UNITS } from '../data/placeholder.js'
import { GHANA_REGIONS, isPresident } from '../data/regions.js'
import { api } from '../lib/api.js'
import { T } from '../styles/tokens.js'

export default function AboutPage() {
  const navigate = useNavigate()
  useReveal()

  const [execs, setExecs] = useState([])
  useEffect(() => {
    api.get('/members/public-executives')
       .then(d => setExecs(d.executives || []))
       .catch(() => setExecs([]))
  }, [])

  const president     = execs.find(isPresident) || null
  const otherNational = execs.filter(m => m.positionScope === 'NATIONAL' && !isPresident(m))
  const regional      = execs.filter(m => m.positionScope === 'REGIONAL')
  const byRegion = GHANA_REGIONS.map(region => ({
    region,
    members: regional.filter(m => m.region === region),
  })).filter(g => g.members.length > 0)

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
        </div>
      </section>

      {/* ── Leadership ───────────────────────────────────────────────────── */}
      {(president || otherNational.length > 0 || byRegion.length > 0) && (
        <section className="section" style={{ background: T.white }}>
          <div className="section-inner">
            <div style={{ textAlign: 'center', marginBottom: '2.5rem' }} className="reveal">
              <SectionTag label="Leadership" />
              <h2 className="section-title" style={{ maxWidth: 580, margin: '0 auto' }}>
                Our <em>Executives</em>
              </h2>
              <p style={{ fontSize: 14.5, color: T.textMid, maxWidth: 540, margin: '0 auto', lineHeight: 1.7, fontWeight: 300 }}>
                The officers leading COSSA-CHED at the national level and across our regional chapters.
              </p>
            </div>

            {/* President */}
            {president && (
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
                textAlign: 'center',
              }}>
                <div style={{ position: 'relative' }}>
                  <div style={{
                    position: 'absolute', top: -6, left: '50%', transform: 'translateX(-50%)',
                    background: T.gold, color: T.brownDeep,
                    fontSize: 10, fontWeight: 700, letterSpacing: '.1em',
                    padding: '3px 10px', borderRadius: 12,
                    zIndex: 1, whiteSpace: 'nowrap',
                  }}>★ PRESIDENT</div>
                  <Avatar
                    name={president.name}
                    avatarFilename={president.avatarFilename}
                    size={140}
                    border={`4px solid ${T.gold}`}
                  />
                </div>
                <div style={{ flex: '1 1 240px', minWidth: 240, textAlign: 'left' }}>
                  <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '2rem', color: T.brownDeep, fontWeight: 600, lineHeight: 1.15, marginBottom: '.4rem' }}>
                    {president.name}
                  </h3>
                  <div style={{ fontSize: 13, color: T.gold, letterSpacing: '.1em', textTransform: 'uppercase', fontWeight: 600, marginBottom: '.6rem' }}>
                    {president.position}
                  </div>
                  {president.department && (
                    <div style={{ fontSize: 13, color: T.textMid }}>{president.department}</div>
                  )}
                </div>
              </div>
            )}

            {/* National Executives */}
            {otherNational.length > 0 && (
              <div className="reveal" style={{ marginBottom: '3rem' }}>
                <ExecBlockHeader title="National Executives" subtitle="Head-office officers serving the entire association" />
                <ExecGrid members={otherNational} />
              </div>
            )}

            {/* Regional Executives */}
            {byRegion.length > 0 && (
              <div className="reveal">
                <ExecBlockHeader title="Regional Executives" subtitle="Officers leading COSSA-CHED chapters in each region" />
                {byRegion.map(({ region, members }) => (
                  <div key={region} style={{ marginBottom: '2rem' }}>
                    <h4 style={{
                      fontFamily: "'Playfair Display', serif",
                      fontSize: '1.05rem',
                      color: T.brownWarm,
                      marginBottom: '.9rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '.5rem',
                    }}>
                      📍 {region} Region
                      <span style={{ fontSize: 11.5, color: T.brownPale, fontWeight: 400, fontFamily: "'DM Sans', sans-serif" }}>
                        ({members.length})
                      </span>
                    </h4>
                    <ExecGrid members={members} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

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

function ExecBlockHeader({ title, subtitle }) {
  return (
    <div style={{ marginBottom: '1.3rem', borderBottom: `1px solid rgba(122,58,24,.1)`, paddingBottom: '.7rem' }}>
      <h3 style={{
        fontFamily: "'Playfair Display', serif",
        fontSize: '1.3rem',
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

function ExecGrid({ members }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
      gap: '1.2rem',
    }}>
      {members.map(m => (
        <div key={m.id} style={{
          background: T.white,
          borderRadius: 7,
          padding: '1.4rem 1rem',
          border: `1px solid rgba(122,58,24,0.09)`,
          textAlign: 'center',
          transition: 'box-shadow 0.25s',
        }}
        onMouseEnter={e => e.currentTarget.style.boxShadow = '0 8px 28px rgba(30,15,8,0.08)'}
        onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
        >
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '.9rem' }}>
            <Avatar
              name={m.name}
              avatarFilename={m.avatarFilename}
              size={100}
              border={`4px solid ${T.gold}`}
            />
          </div>
          <h4 style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: '1rem',
            fontWeight: 600,
            color: T.brownDeep,
            marginBottom: '.25rem',
          }}>{m.name}</h4>
          <div style={{
            fontSize: 11.5,
            color: T.gold,
            letterSpacing: '.08em',
            textTransform: 'uppercase',
            fontWeight: 600,
            marginBottom: '.25rem',
          }}>{m.position}</div>
          {m.department && (
            <div style={{ fontSize: 12, color: T.textMid }}>{m.department}</div>
          )}
        </div>
      ))}
    </div>
  )
}
