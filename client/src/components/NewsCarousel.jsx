import { useState } from 'react'
import { T } from '../styles/tokens.js'

export default function NewsCarousel({ items, style }) {
  const [idx, setIdx] = useState(0)

  if (!items || items.length === 0) return null

  const current = items[idx]
  const count   = items.length
  const prev    = () => setIdx(i => (i - 1 + count) % count)
  const next    = () => setIdx(i => (i + 1) % count)

  return (
    <div style={{ position: 'relative', overflow: 'hidden', ...style }}>
      {/* Current slide */}
      {current.type === 'video' ? (
        <video
          key={current.url}
          src={current.url}
          controls
          style={{ width: '100%', height: '100%', objectFit: 'cover', background: '#000', display: 'block' }}
        />
      ) : (
        <img
          key={current.url}
          src={current.url}
          alt={`Photo ${idx + 1} of ${count}`}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      )}

      {count > 1 && (
        <>
          {/* Prev arrow */}
          <button
            onClick={e => { e.stopPropagation(); prev() }}
            aria-label="Previous photo"
            style={{
              position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
              background: 'rgba(0,0,0,0.55)', color: '#fff', border: 'none',
              borderRadius: '50%', width: 38, height: 38, fontSize: 22, lineHeight: 1,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              zIndex: 4, transition: 'background 0.2s',
            }}
          >‹</button>

          {/* Next arrow */}
          <button
            onClick={e => { e.stopPropagation(); next() }}
            aria-label="Next photo"
            style={{
              position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
              background: 'rgba(0,0,0,0.55)', color: '#fff', border: 'none',
              borderRadius: '50%', width: 38, height: 38, fontSize: 22, lineHeight: 1,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              zIndex: 4, transition: 'background 0.2s',
            }}
          >›</button>

          {/* Counter badge */}
          <div style={{
            position: 'absolute', top: 10, right: 10,
            background: 'rgba(0,0,0,0.55)', color: '#fff',
            borderRadius: 12, padding: '3px 10px', fontSize: 12, fontWeight: 600,
            zIndex: 4, letterSpacing: '0.05em',
          }}>
            {idx + 1} / {count}
          </div>

          {/* Dot indicators */}
          <div style={{
            position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)',
            display: 'flex', gap: 6, zIndex: 4,
          }}>
            {items.map((_, i) => (
              <button
                key={i}
                onClick={e => { e.stopPropagation(); setIdx(i) }}
                aria-label={`Go to photo ${i + 1}`}
                style={{
                  width: i === idx ? 22 : 8, height: 8, borderRadius: 4,
                  background: i === idx ? T.gold : 'rgba(255,255,255,0.65)',
                  border: 'none', cursor: 'pointer', padding: 0,
                  transition: 'all 0.25s',
                }}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
