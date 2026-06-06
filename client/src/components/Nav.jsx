import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

const PUBLIC_LINKS = [
  { path: '/',        label: 'Home'    },
  { path: '/about',   label: 'About'   },
  { path: '/news',    label: 'News'    },
  { path: '/contact', label: 'Contact' },
]

export default function Nav() {
  const { pathname }     = useLocation()
  const { user, logout } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)

  // Close menu when route changes
  useEffect(() => { setMobileOpen(false) }, [pathname])

  // Lock body scroll while menu is open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [mobileOpen])

  return (
    <>
      <nav className="nav">
        <Link to="/" className="nav-logo">
          <div className="nav-logo-ring">C</div>
          <div className="nav-logo-text">
            <b>COSSA-CHED</b>
            <small>CHED Senior Staff Association</small>
          </div>
        </Link>

        <ul className="nav-links">
          {PUBLIC_LINKS.map(({ path, label }) => (
            <li key={path} className="nav-hide-mobile">
              <Link to={path} className={pathname === path ? 'active' : ''}>
                {label}
              </Link>
            </li>
          ))}

          {user ? (
            <>
              <li className="nav-hide-mobile">
                <Link to="/portal" className="nav-portal-btn btn">
                  My Portal
                </Link>
              </li>
              <li className="nav-hide-mobile">
                <button
                  onClick={logout}
                  style={{
                    color: 'rgba(255,255,255,0.45)',
                    fontSize: 11,
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontFamily: "'DM Sans', sans-serif",
                    letterSpacing: '0.09em',
                    textTransform: 'uppercase',
                  }}
                >
                  Sign Out
                </button>
              </li>
            </>
          ) : (
            <li className="nav-hide-mobile">
              <Link to="/login" className="nav-portal-btn btn">
                Login
              </Link>
            </li>
          )}

          {/* Hamburger — visible only on small screens */}
          <li className="nav-hamburger-wrap">
            <button
              type="button"
              className="nav-hamburger"
              onClick={() => setMobileOpen(o => !o)}
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? '✕' : '☰'}
            </button>
          </li>
        </ul>
      </nav>

      {mobileOpen && (
        <div className="mobile-menu" onClick={() => setMobileOpen(false)}>
          <div className="mobile-menu-content" onClick={(e) => e.stopPropagation()}>
            {PUBLIC_LINKS.map(({ path, label }) => (
              <Link
                key={path}
                to={path}
                className={`mobile-menu-link ${pathname === path ? 'active' : ''}`}
              >
                {label}
              </Link>
            ))}

            <div style={{ height: '1.2rem' }} />

            {user ? (
              <>
                <Link to="/portal" className="mobile-menu-link mobile-menu-cta">
                  My Portal
                </Link>
                <button
                  type="button"
                  onClick={() => { logout(); setMobileOpen(false) }}
                  className="mobile-menu-link"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <Link to="/login" className="mobile-menu-link mobile-menu-cta">
                Member Login →
              </Link>
            )}
          </div>
        </div>
      )}
    </>
  )
}
