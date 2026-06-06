import { T } from '../styles/tokens.js'

function initialsOf(name = '') {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

/**
 * Avatar — shows the user's photo if `avatarFilename` is set, otherwise
 * renders a gradient circle with their initials.
 *
 * Props:
 *   - name              (string) used for initials + alt text
 *   - avatarFilename    (string | null) filename returned by the API
 *   - size              (number) px diameter (default 40)
 *   - border            (string) optional CSS border (e.g. "3px solid rgba(...)")
 */
export default function Avatar({ name = '', avatarFilename, size = 40, border, style = {} }) {
  const dim = `${size}px`
  const baseStyle = {
    width: dim,
    height: dim,
    borderRadius: '50%',
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    background: `linear-gradient(135deg, ${T.brownWarm}, ${T.gold})`,
    color: '#fff',
    fontFamily: "'Playfair Display', serif",
    fontWeight: 700,
    fontSize: `${size * 0.4}px`,
    ...(border ? { border } : {}),
    ...style,
  }

  if (avatarFilename) {
    return (
      <div style={baseStyle}>
        <img
          src={`/api/avatars/${avatarFilename}`}
          alt={name}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          loading="lazy"
        />
      </div>
    )
  }

  return <div style={baseStyle}>{initialsOf(name) || '?'}</div>
}
