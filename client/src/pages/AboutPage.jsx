import { useNavigate } from 'react-router-dom'
import SectionTag from '../components/SectionTag.jsx'
import { useReveal } from '../hooks/useReveal.js'
import { ABOUT_PILLARS_FULL, CHED_UNITS } from '../data/placeholder.js'
import { T } from '../styles/tokens.js'

export default function AboutPage() {
  const navigate = useNavigate()
  useReveal()

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
                src="https://images.unsplash.com/photo-1574482620881-6f2a6c9a98a2?w=800&q=80"
                alt="CHED senior staff in the field"
                loading="lazy"
              />
              <div className="about-img-overlay" />
              <div className="about-img-caption">
                "Supporting the people who protect Ghana's cocoa"
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
              gridTemplateColumns: 'repeat(3, 1fr)',
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
