import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-grid">
          {/* Brand */}
          <div className="footer-brand">
            <Link to="/" className="nav-logo" style={{ textDecoration: 'none' }}>
              <div className="nav-logo-ring">C</div>
              <div className="nav-logo-text">
                <b style={{ color: '#fff' }}>COSSA-CHED</b>
                <small>CHED Senior Staff Association</small>
              </div>
            </Link>
            <p>
              Championing the welfare, rights and professional development of
              COCOBOD's Cocoa Health &amp; Extension Division senior staff.
            </p>
          </div>

          {/* Navigate */}
          <div className="footer-col">
            <h4>Navigate</h4>
            <ul>
              {[['/', 'Home'], ['/about', 'About Us'], ['/news', 'News & Events'], ['/contact', 'Contact']].map(
                ([path, label]) => (
                  <li key={path}>
                    <Link to={path}>{label}</Link>
                  </li>
                )
              )}
            </ul>
          </div>

          {/* Member Portal */}
          <div className="footer-col">
            <h4>Member Portal</h4>
            <ul>
              <li><Link to="/login">Login to Portal</Link></li>
              <li><Link to="/login">My Dashboard</Link></li>
              <li><Link to="/login">Documents</Link></li>
              <li><Link to="/login">Welfare Requests</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div className="footer-col">
            <h4>Contact</h4>
            <ul>
              <li><a href="https://cocobod.gh" target="_blank" rel="noreferrer">cocobod.gh</a></li>
              <li><span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>COCOBOD HQ, Accra</span></li>
              <li><a href="tel:+233302661877">+233 30 266 1877</a></li>
              <li><a href="mailto:cossa-ched@cocobod.gh">cossa-ched@cocobod.gh</a></li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <p>© 2026 CHED Senior Staff Association (COSSA-CHED). All rights reserved.</p>
          <p style={{ fontSize: 11 }}>Content is illustrative — real data will be added shortly</p>
        </div>
      </div>
    </footer>
  )
}
