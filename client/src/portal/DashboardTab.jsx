import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { api, fmtDate } from '../lib/api.js'
import { T } from '../styles/tokens.js'

export default function DashboardTab({ setTab }) {
  const { user } = useAuth()
  const [announcements, setAnnouncements] = useState([])
  const [events,        setEvents]        = useState([])

  useEffect(() => {
    api.get('/announcements?limit=4').then(d => setAnnouncements(d.announcements)).catch(() => {})
    api.get('/events?limit=4').then(d => setEvents(d.events)).catch(() => {})
  }, [])

  const CARDS = [
    { icon: '📣', bg: '#fdf6ee', label: 'Announcements', count: announcements.length, sub: 'Latest notices',  tab: 'announce'  },
    { icon: '📁', bg: '#f0f0ff', label: 'Documents',     count: '→',                 sub: 'Available files', tab: 'docs'      },
    { icon: '🤲', bg: '#f0fdf4', label: 'Welfare',       count: '→',                 sub: 'My requests',     tab: 'welfare'   },
    { icon: '📅', bg: '#fef9ee', label: 'Events',        count: events.length,       sub: 'Upcoming',        tab: 'events'    },
  ]

  return (
    <div className="fade-in">
      <p style={{ fontSize: 14, color: T.textMid, marginBottom: '1.5rem' }}>
        Good day, <strong>{user?.name?.split(' ')[0]}</strong>. Here's your overview.
      </p>

      {/* Stat cards */}
      <div className="dash-grid">
        {CARDS.map(c => (
          <div className="dash-card" key={c.label} onClick={() => setTab(c.tab)}>
            <div className="dash-card-icon" style={{ background: c.bg }}>{c.icon}</div>
            <h4>{c.label}</h4>
            <div className="dash-num">{c.count}</div>
            <div className="dash-sub">{c.sub}</div>
          </div>
        ))}
      </div>

      <div className="dash-two-col">
        {/* Announcements widget */}
        <div className="widget">
          <div className="widget-header">
            <h3>Latest Announcements</h3>
            <button className="btn btn-outline-dark btn-sm" onClick={() => setTab('announce')}>
              View All
            </button>
          </div>
          <div className="widget-body">
            {announcements.length === 0 ? (
              <p style={{ fontSize: 13, color: T.brownPale }}>No announcements yet.</p>
            ) : announcements.map(a => (
              <div className="announce-item" key={a.id}>
                <span
                  className="tag-pill"
                  style={{ background: T.creamDeep, color: T.brownWarm, marginBottom: '.35rem', display: 'inline-block' }}
                >
                  {a.category}
                </span>
                <div className="announce-title">{a.title}</div>
                <div className="announce-date">{fmtDate(a.createdAt)}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick access widget */}
        <div className="widget">
          <div className="widget-header"><h3>Quick Access</h3></div>
          <div className="widget-body">
            <div className="quick-links">
              {[['📁','docs','Documents'],['🤲','welfare','Welfare'],['👥','directory','Directory'],['📅','events','Events'],['📣','announce','Notices'],['🤵','profile','Profile']].map(([ico, id, label]) => (
                <div className="quick-link" key={id} onClick={() => setTab(id)}>
                  <div className="quick-link-icon">{ico}</div>
                  <span>{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
