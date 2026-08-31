import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import SectionTag from '../components/SectionTag.jsx'
import { useReveal } from '../hooks/useReveal.js'
import { fmtDate } from '../lib/api.js'
import {
  NEWS as FALLBACK_NEWS,
  MARQUEE_ITEMS,
  HERO_STATS,
  ABOUT_PILLARS_HOME,
} from '../data/placeholder.js'
import { T } from '../styles/tokens.js'

const CATEGORY_COLORS = {
  Congress: '#C9A84C',
  Training: '#7A3A18',
  Welfare:  '#4A7C5A',
  Campaign: '#4A4C9C',
  Event:    '#4A4C9C',
  Policy:   '#7A3A18',
}
const catColor = (cat) => CATEGORY_COLORS[cat] || '#7A3A18'

export default function HomePage() {
  const navigate = useNavigate()
  const [articles, setArticles] = useState(null)
  useReveal()

  useEffect(() => {
    fetch('/api/news?limit=3')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setArticles(d?.articles?.length ? d.articles : null))
      .catch(() => setArticles(null))
  }, [])

  const newsList = articles || FALLBACK_NEWS.slice(0, 3).map((n) => ({
    ...n,
    imageUrl:    n.img,
    excerpt:     n.body,
    publishedAt: n.date,
  }))

  return (
    <>
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <div className="hero">
        <div className="hero-content slide-up">
          <div className="hero-tag">
            <span
              style={{
                width: 6, height: 6, borderRadius: '50%',
                background: T.gold, display: 'inline-block', marginRight: 4,
              }}
            />
            <span>COCOBOD Senior Staff Association · Cocoa Health and Extension Division</span>
          </div>

          <h1>
            Serving CHED,<br />
            <em>Protecting Our People</em>
          </h1>

          <p className="hero-sub">
            COSSA-CHED is the collective voice of the Cocoa Health &amp; Extension
            Division's senior staff — championing welfare, professional growth,
            and industrial harmony across Ghana's cocoa sector.
          </p>

          <div className="hero-actions">
            <button className="btn btn-gold" onClick={() => navigate('/about')}>
              Learn About COSSA-CHED
            </button>
            <button className="btn btn-outline" onClick={() => navigate('/news')}>
              Latest News
            </button>
          </div>

          <div className="hero-stats">
            {HERO_STATS.map(({ num, label }) => (
              <div key={label}>
                <div className="hero-stat-num">{num}</div>
                <div className="hero-stat-label">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Marquee ──────────────────────────────────────────────────────── */}
      <div className="marquee" aria-hidden="true">
        <div className="marquee-track">
          {MARQUEE_ITEMS.map((item, i) => (
            <div className="marquee-item" key={i}>{item}</div>
          ))}
        </div>
      </div>

      {/* ── About teaser ─────────────────────────────────────────────────── */}
      <section className="section" style={{ background: T.white }}>
        <div className="section-inner">
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '5rem',
              alignItems: 'center',
            }}
          >
            <div className="reveal">
              <SectionTag label="Who We Are" />
              <h2 className="section-title">
                The Voice of CHED's <em>Senior Staff</em>
              </h2>
              <p className="section-body">
                The CHED Senior Staff Association represents the interests of
                senior staff across the Cocoa Health &amp; Extension Division of
                COCOBOD. We work to ensure fair treatment, professional welfare,
                and strong industrial relations between our members and the Board.
              </p>
              <button
                className="btn btn-gold"
                style={{ marginTop: '2rem' }}
                onClick={() => navigate('/about')}
              >
                Read More About COSSA-CHED
              </button>
            </div>

            <div
              className="reveal"
              style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}
            >
              {ABOUT_PILLARS_HOME.map(({ icon, title, desc }) => (
                <div
                  className="pillar"
                  key={title}
                  style={{ background: T.creamLight }}
                >
                  <div style={{ fontSize: '1.5rem' }}>{icon}</div>
                  <h4>{title}</h4>
                  <p>{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── News teaser ──────────────────────────────────────────────────── */}
      <section className="section" style={{ background: T.creamDeep }}>
        <div className="section-inner">
          <div
            className="reveal"
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-end',
              marginBottom: '2.5rem',
            }}
          >
            <div>
              <SectionTag label="Latest" />
              <h2 className="section-title">
                News &amp; <em>Announcements</em>
              </h2>
            </div>
            <button
              className="btn btn-outline-dark"
              onClick={() => navigate('/news')}
            >
              View All News →
            </button>
          </div>

          <div className="news-grid reveal">
            {newsList.map((article, i) => {
              const dateStr = typeof article.publishedAt === 'string' &&
                              article.publishedAt.match(/^\d{4}-/)
                ? fmtDate(article.publishedAt)
                : article.publishedAt || article.date || ''
              return (
                <article
                  key={article.id}
                  className={`news-card ${i === 0 ? 'featured' : ''}`}
                  onClick={() => navigate('/news')}
                >
                  <div className="news-img-wrap">
                    {article.mediaType === 'video' && article.mediaUrl ? (
                      <>
                        <video
                          src={article.mediaUrl}
                          muted
                          preload="metadata"
                          style={{ width: '100%', height: '100%', objectFit: 'cover', background: '#000' }}
                        />
                        <div style={{
                          position: 'absolute', top: '50%', left: '50%',
                          transform: 'translate(-50%, -50%)',
                          zIndex: 2, fontSize: 40, color: '#fff',
                          textShadow: '0 2px 8px rgba(0,0,0,0.5)',
                          pointerEvents: 'none',
                        }}>▶</div>
                      </>
                    ) : (
                      <img src={article.mediaUrl || article.imageUrl || article.img} alt={article.title} loading="lazy" />
                    )}
                    <div
                      style={{
                        position: 'absolute', inset: 0,
                        background: 'linear-gradient(to top, rgba(30,15,8,0.5) 0%, transparent 60%)',
                      }}
                    />
                    <span
                      className="news-cat-badge"
                      style={{ background: catColor(article.category) }}
                    >
                      {article.category}
                    </span>
                  </div>
                  <div className="news-card-body">
                    <div className="news-date">{dateStr}</div>
                    <h3>{article.title}</h3>
                    <p>{(article.excerpt || article.body || '').slice(0, 130)}…</p>
                  </div>
                </article>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── CTA strip ────────────────────────────────────────────────────── */}
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
            fontSize: 'clamp(1.6rem, 3vw, 2.4rem)',
            color: '#fff',
            fontWeight: 400,
            marginBottom: '0.8rem',
          }}
        >
          Are you a CHED Senior Staff Member?
        </h2>
        <p
          style={{
            fontSize: 14.5,
            color: 'rgba(255,255,255,0.6)',
            marginBottom: '1.8rem',
          }}
        >
          Log in to the member portal to access welfare services, association
          documents, and internal resources.
        </p>
        <button className="btn btn-gold" onClick={() => navigate('/login')}>
          Access Member Portal →
        </button>
      </section>
    </>
  )
}
