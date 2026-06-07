import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { api } from '../lib/api.js'
import { T } from '../styles/tokens.js'
import Avatar from '../components/Avatar.jsx'
import NotificationBell from '../components/NotificationBell.jsx'

const MAIN_ITEMS = [
  { id: 'dash',       icon: '📊', label: 'Dashboard'        },
  { id: 'announce',   icon: '📣', label: 'Announcements'    },
  { id: 'messages',   icon: '💬', label: 'Messages'         },
  { id: 'executives', icon: '🏛️', label: 'Executives'       },
  { id: 'directory',  icon: '👥', label: 'Member Directory' },
  { id: 'resources',  icon: '📁', label: 'Resources'        },
  { id: 'gallery',    icon: '📸', label: 'Gallery'          },
  { id: 'welfare',    icon: '🤲', label: 'Welfare Requests' },
]

const PERSONAL_ITEMS = [
  { id: 'events',  icon: '📅', label: 'Events & Meetings' },
  { id: 'profile', icon: '🤵', label: 'My Profile'        },
]

const ADMIN_ITEMS = [
  { id: 'adminNews',     icon: '📰', label: 'Manage News'     },
  { id: 'adminMembers',  icon: '🛡️', label: 'Manage Members'  },
  { id: 'adminMessages', icon: '📨', label: 'Contact Messages' },
]

export default function PortalLayout({ title, activeTab, setTab, children }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [unreadMsg, setUnreadMsg] = useState(0)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  useEffect(() => {
    let alive = true
    const fetchUnread = () =>
      api.get('/messaging/unread-count')
         .then(d => { if (alive) setUnreadMsg(d.unreadCount) })
         .catch(() => {})
    fetchUnread()
    const id = setInterval(fetchUnread, 10000)
    return () => { alive = false; clearInterval(id) }
  }, [activeTab])

  // Close the mobile drawer whenever the active tab changes
  useEffect(() => { setMobileNavOpen(false) }, [activeTab])

  // Lock body scroll while drawer is open on mobile
  useEffect(() => {
    document.body.style.overflow = mobileNavOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [mobileNavOpen])

  // Wrap tab setter so links in the mobile drawer close it on click
  const handleTab = (id) => { setTab(id); setMobileNavOpen(false) }

  return (
    <div className="portal-layout">
      {mobileNavOpen && (
        <div className="sidebar-backdrop" onClick={() => setMobileNavOpen(false)} />
      )}

      <aside className={`sidebar ${mobileNavOpen ? 'open' : ''}`}>
        <div className="sidebar-user">
          <Avatar
            name={user?.name}
            avatarFilename={user?.avatarFilename}
            size={46}
            style={{ marginBottom: '.7rem' }}
          />
          <div className="sidebar-name">{user?.name}</div>
          <div className="sidebar-role">{user?.role}</div>
        </div>

        <nav className="sidebar-nav">
          <div className="sidebar-section">Main Menu</div>
          {MAIN_ITEMS.map(item => (
            <div
              key={item.id}
              className={`sidebar-item ${activeTab === item.id ? 'active' : ''}`}
              onClick={() => handleTab(item.id)}
            >
              <span className="si-icon">{item.icon}</span>
              <span style={{ flex: 1 }}>{item.label}</span>
              {item.id === 'messages' && unreadMsg > 0 && (
                <span className="msg-unread-badge" style={{ marginRight: 4 }}>{unreadMsg}</span>
              )}
            </div>
          ))}

          <div className="sidebar-section" style={{ marginTop: '.5rem' }}>Personal</div>
          {PERSONAL_ITEMS.map(item => (
            <div
              key={item.id}
              className={`sidebar-item ${activeTab === item.id ? 'active' : ''}`}
              onClick={() => handleTab(item.id)}
            >
              <span className="si-icon">{item.icon}</span>
              {item.label}
            </div>
          ))}

          {user?.role === 'ADMIN' && (
            <>
              <div className="sidebar-section" style={{ marginTop: '.5rem' }}>Administration</div>
              {ADMIN_ITEMS.map(item => (
                <div
                  key={item.id}
                  className={`sidebar-item ${activeTab === item.id ? 'active' : ''}`}
                  onClick={() => handleTab(item.id)}
                >
                  <span className="si-icon">{item.icon}</span>
                  {item.label}
                </div>
              ))}
            </>
          )}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-item" onClick={() => navigate('/')} style={{ paddingLeft: 0 }}>
            <span className="si-icon">🏠</span>Public Site
          </div>
          <div
            className="sidebar-item"
            onClick={logout}
            style={{ paddingLeft: 0, color: 'rgba(255,100,80,.75)' }}
          >
            <span className="si-icon">🚪</span>Sign Out
          </div>
        </div>
      </aside>

      <div className="portal-main">
        <div className="portal-header">
          <button
            type="button"
            className="portal-hamburger"
            onClick={() => setMobileNavOpen(true)}
            aria-label="Open menu"
          >
            ☰
          </button>
          <h1>{title}</h1>
          <div className="portal-header-right">
            <NotificationBell onNavigate={handleTab} />
            <div
              className="portal-header-user"
              style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}
              onClick={() => handleTab('profile')}
            >
              <Avatar name={user?.name} avatarFilename={user?.avatarFilename} size={34} />
              <span className="portal-header-username" style={{ fontSize: 13, fontWeight: 500, color: T.textDark }}>
                {user?.name}
              </span>
            </div>
          </div>
        </div>

        <div className="portal-body">
          {children}
        </div>
      </div>
    </div>
  )
}
