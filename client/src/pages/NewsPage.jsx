import { useEffect, useState } from 'react'
import SectionTag from '../components/SectionTag.jsx'
import { useReveal } from '../hooks/useReveal.js'
import { NEWS as FALLBACK_NEWS, ANNOUNCEMENTS } from '../data/placeholder.js'
import { fmtDate } from '../lib/api.js'
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

function ArticleModal({ article, onClose }) {
  // Lock body scroll while modal is open
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  // Close on Escape
  useEffect(() => {
    const handler = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const paragraphs = (article.body || '').split(/\n+/).filter(Boolean)

  return (
    <div className="article-modal-overlay" onClick={onClose}>
      <article className="article-modal" onClick={(e) => e.stopPropagation()}>
        <button className="article-modal-close" onClick={onClose} aria-label="Close article">
          ✕
        </button>

        {article.mediaType === 'video' ? (
          <video
            className="article-modal-image"
            src={article.mediaUrl || article.imageUrl}
            controls
            style={{ background: '#000' }}
          />
        ) : (article.mediaUrl || article.imageUrl) ? (
          <img
            className="article-modal-image"
            src={article.mediaUrl || article.imageUrl}
            alt={article.title}
          />
        ) : null}

        <div className="article-modal-body">
          <div className="article-modal-meta">
            <span
              className="tag-pill"
              style={{ background: catColor(article.category), color: '#fff' }}
            >
              {article.category}
            </span>
            <span style={{ fontSize: 12, color: T.brownPale, letterSpacing: '.06em' }}>
              {fmtDate(article.publishedAt || article.createdAt)}
            </span>
            {article.author?.name && (
              <span style={{ fontSize: 12, color: T.brownPale }}>
                · By {article.author.name}
              </span>
            )}
          </div>

          <h1>{article.title}</h1>

          <div className="article-modal-content">
            {paragraphs.length > 0
              ? paragraphs.map((p, i) => <p key={i}>{p}</p>)
              : <p>{article.excerpt}</p>}
          </div>
        </div>
      </article>
    </div>
  )
}

export default function NewsPage() {
  const [articles, setArticles] = useState(null)
  const [selected, setSelected] = useState(null)
  useReveal()

  useEffect(() => {
    fetch('/api/news')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setArticles(d?.articles?.length ? d.articles : null))
      .catch(() => setArticles(null))
  }, [])

  // Use API articles if loaded, otherwise fall back to seeded placeholder
  const list = articles || FALLBACK_NEWS.map((n) => ({
    ...n,
    imageUrl:    n.img,
    excerpt:     n.body,
    body:        n.body,
    publishedAt: n.date,
  }))

  return (
    <>
      {/* ── Banner ───────────────────────────────────────────────────────── */}
      <div className="page-banner">
        <div className="page-banner-inner">
          <SectionTag label="Latest" />
          <h1>
            News &amp; <em>Announcements</em>
          </h1>
          <p>
            Stay informed with the latest updates from COSSA-CHED and the Cocoa
            Health &amp; Extension Division.
          </p>
        </div>
      </div>

      {/* ── News grid ────────────────────────────────────────────────────── */}
      <section className="section">
        <div className="section-inner">
          <div className="news-grid reveal">
            {list.map((article, i) => {
              const color = catColor(article.category)
              const dateStr = typeof article.publishedAt === 'string' &&
                              article.publishedAt.match(/^\d{4}-/)
                ? fmtDate(article.publishedAt)
                : article.publishedAt || article.date || ''

              return (
                <article
                  key={article.id}
                  className="news-card"
                  onClick={() => setSelected(article)}
                >
                  <div
                    className="news-img-wrap"
                    style={{ height: 220 }}
                  >
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
                          zIndex: 2, fontSize: 44, color: '#fff',
                          textShadow: '0 2px 8px rgba(0,0,0,0.5)',
                          pointerEvents: 'none',
                        }}>▶</div>
                      </>
                    ) : (
                      <img
                        src={article.mediaUrl || article.imageUrl || article.img}
                        alt={article.title}
                        loading="lazy"
                      />
                    )}
                    <div
                      style={{
                        position: 'absolute', inset: 0,
                        background:
                          'linear-gradient(to top, rgba(30,15,8,0.5) 0%, transparent 55%)',
                      }}
                    />
                    <span className="news-cat-badge" style={{ background: color }}>
                      {article.category}
                    </span>
                  </div>

                  <div className="news-card-body">
                    <div className="news-date">{dateStr}</div>
                    <h3>{article.title}</h3>
                    <p>{article.excerpt || article.body?.slice(0, 160)}</p>
                    <button
                      className="btn btn-outline-dark btn-sm"
                      style={{ marginTop: '1rem' }}
                      onClick={(e) => { e.stopPropagation(); setSelected(article) }}
                    >
                      Read Full Story →
                    </button>
                  </div>
                </article>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── Announcements strip ──────────────────────────────────────────── */}
      <section className="section" style={{ background: T.creamDeep }}>
        <div className="section-inner reveal">
          <div style={{ marginBottom: '2rem' }}>
            <SectionTag label="Notices" />
            <h2 className="section-title">
              Association <em>Notices</em>
            </h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', maxWidth: 720 }}>
            {ANNOUNCEMENTS.map((ann, i) => (
              <div
                key={i}
                style={{
                  padding: '1.2rem 1.4rem',
                  background: ann.bg,
                  borderRadius: 6,
                  border: `1px solid ${ann.catColor}22`,
                  transition: 'transform 0.2s',
                }}
              >
                <span
                  className="tag-pill"
                  style={{
                    background: '#fff',
                    color: ann.catColor,
                    border: `1px solid ${ann.catColor}55`,
                    marginBottom: '0.5rem',
                    display: 'inline-block',
                  }}
                >
                  {ann.cat}
                </span>
                <div style={{ fontSize: 14, fontWeight: 500, color: T.brownDeep, marginBottom: '0.3rem', lineHeight: 1.4 }}>
                  {ann.title}
                </div>
                <div style={{ fontSize: 11, color: T.brownPale }}>{ann.date}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Article detail modal ─────────────────────────────────────────── */}
      {selected && <ArticleModal article={selected} onClose={() => setSelected(null)} />}
    </>
  )
}
