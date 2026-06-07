import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { api } from '../lib/api.js'
import Avatar from '../components/Avatar.jsx'
import { T } from '../styles/tokens.js'

const CONV_POLL_MS = 8000   // refresh conversation list every 8s
const MSG_POLL_MS  = 3000   // refresh open thread every 3s

function fmtTime(iso) {
  if (!iso) return ''
  const d   = new Date(iso)
  const now = new Date()
  const sameDay = d.toDateString() === now.toDateString()
  return sameDay
    ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

export default function MessagesTab() {
  const { user } = useAuth()
  const [conversations, setConversations] = useState([])
  const [activeId,      setActiveId]      = useState(null)
  const [filter,        setFilter]        = useState('direct')   // 'direct' | 'groups'
  const [messages,      setMessages]      = useState([])
  const [draft,         setDraft]         = useState('')
  const [sending,       setSending]       = useState(false)
  const [loading,       setLoading]       = useState(true)
  const [showNew,       setShowNew]       = useState(false)

  const bodyRef = useRef(null)
  const lastMessageIdRef = useRef(null)

  const active = conversations.find(c => c.id === activeId) ?? null

  // ── Conversation list polling ───────────────────────────────────────────
  const loadConversations = useCallback(async () => {
    try {
      const { conversations } = await api.get('/messaging/conversations')
      setConversations(conversations)
    } catch {}
  }, [])

  useEffect(() => {
    loadConversations().finally(() => setLoading(false))
    const id = setInterval(loadConversations, CONV_POLL_MS)
    return () => clearInterval(id)
  }, [loadConversations])

  // ── Active thread polling + read receipt ────────────────────────────────
  const loadMessages = useCallback(async (convId) => {
    try {
      const { messages } = await api.get(`/messaging/conversations/${convId}/messages`)
      setMessages(messages)
      lastMessageIdRef.current = messages[messages.length - 1]?.id ?? null
    } catch {}
  }, [])

  useEffect(() => {
    if (!activeId) { setMessages([]); return }
    setMessages([])
    loadMessages(activeId)
    api.post(`/messaging/conversations/${activeId}/read`, {}).catch(() => {})

    const id = setInterval(async () => {
      try {
        const { messages: fresh } = await api.get(`/messaging/conversations/${activeId}/messages`)
        setMessages(prev => {
          // Only update if there's a new message — avoids re-render churn
          const newest = fresh[fresh.length - 1]?.id
          if (newest && newest !== lastMessageIdRef.current) {
            lastMessageIdRef.current = newest
            api.post(`/messaging/conversations/${activeId}/read`, {}).catch(() => {})
            return fresh
          }
          return prev
        })
      } catch {}
    }, MSG_POLL_MS)
    return () => clearInterval(id)
  }, [activeId, loadMessages])

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight
  }, [messages])

  // ── Send ────────────────────────────────────────────────────────────────
  const send = async (e) => {
    e?.preventDefault()
    const body = draft.trim()
    if (!body || !activeId || sending) return
    setSending(true)
    try {
      const { message } = await api.post(`/messaging/conversations/${activeId}/messages`, { body })
      setMessages(prev => [...prev, message])
      setDraft('')
      // Refresh conversation list so the new message bumps to top
      loadConversations()
    } catch (err) {
      alert(err.message)
    } finally {
      setSending(false)
    }
  }

  if (loading) return <p style={{ color: T.brownPale, padding: '2rem 0' }}>Loading messages…</p>

  // ── Filter conversations into two streams ──────────────────────────────
  const direct = conversations.filter(c => !c.isGroup)
  const groups = conversations.filter(c =>  c.isGroup)
  const visibleList = filter === 'direct' ? direct : groups
  const directUnread = direct.reduce((n, c) => n + (c.unreadCount || 0), 0)
  const groupsUnread = groups.reduce((n, c) => n + (c.unreadCount || 0), 0)

  const openConversation = (id) => setActiveId(id)
  const backToList       = () => setActiveId(null)

  return (
    <div className="fade-in">
      <div className={`msg-layout ${active ? 'has-active' : ''}`}>
        {/* ── Conversation list ───────────────────────────────────────────── */}
        <div className="msg-list">
          <div className="msg-list-header">
            <h3>Messages</h3>
            <button className="btn btn-gold btn-sm" onClick={() => setShowNew(true)}>
              + New
            </button>
          </div>

          {/* Direct / Groups tabs */}
          <div className="msg-filter-tabs">
            <button
              type="button"
              className={`msg-filter-tab ${filter === 'direct' ? 'active' : ''}`}
              onClick={() => setFilter('direct')}
            >
              💬 Direct
              {directUnread > 0 && <span className="msg-unread-badge" style={{ marginLeft: 6 }}>{directUnread}</span>}
            </button>
            <button
              type="button"
              className={`msg-filter-tab ${filter === 'groups' ? 'active' : ''}`}
              onClick={() => setFilter('groups')}
            >
              👥 Groups
              {groupsUnread > 0 && <span className="msg-unread-badge" style={{ marginLeft: 6 }}>{groupsUnread}</span>}
            </button>
          </div>

          <div className="msg-conversations">
            {visibleList.length === 0 ? (
              <div style={{ padding: '1.5rem 1.2rem', textAlign: 'center', color: T.brownPale, fontSize: 13 }}>
                {filter === 'direct'
                  ? 'No direct messages yet. Tap "+ New" to message a colleague.'
                  : "You're not in any groups yet."}
              </div>
            ) : visibleList.map(c => (
              <div
                key={c.id}
                className={`msg-conv-item ${c.id === activeId ? 'active' : ''}`}
                onClick={() => openConversation(c.id)}
              >
                <Avatar
                  name={c.displayName}
                  avatarFilename={c.avatarFilename}
                  size={42}
                />
                <div className="msg-conv-info">
                  <div className="msg-conv-name">{c.displayName}</div>
                  <div className="msg-conv-last">
                    {c.lastMessage
                      ? `${c.lastMessage.senderId === user.id ? 'You: ' : ''}${c.lastMessage.body.slice(0, 50)}`
                      : 'No messages yet'}
                  </div>
                </div>
                <div className="msg-conv-meta">
                  <span className="msg-conv-time">
                    {c.lastMessage ? fmtTime(c.lastMessage.createdAt) : ''}
                  </span>
                  {c.unreadCount > 0 && c.id !== activeId && (
                    <span className="msg-unread-badge">{c.unreadCount}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Thread pane ────────────────────────────────────────────────── */}
        <div className="msg-thread">
          {!active ? (
            <div className="msg-empty">
              <div style={{ fontSize: '3rem', marginBottom: '.6rem' }}>💬</div>
              <h3 className="serif" style={{ color: T.brownDeep, marginBottom: '.4rem' }}>
                Select a conversation
              </h3>
              <p style={{ fontSize: 13, color: T.brownPale, maxWidth: 280 }}>
                Pick an existing conversation or click "+ New" to message a colleague or start a group.
              </p>
            </div>
          ) : (
            <>
              <div className="msg-thread-header">
                <button
                  type="button"
                  className="msg-back-btn"
                  onClick={backToList}
                  aria-label="Back to conversations"
                >
                  ←
                </button>
                <Avatar
                  name={active.displayName}
                  avatarFilename={active.avatarFilename}
                  size={40}
                />
                <div className="msg-thread-header-info">
                  <div className="msg-thread-header-name">
                    {active.isGroup ? '👥 ' : ''}{active.displayName}
                  </div>
                  <div className="msg-thread-header-sub">
                    {active.isGroup
                      ? `${active.participants.length} members`
                      : 'Direct message'}
                  </div>
                </div>
              </div>

              <div className="msg-thread-body" ref={bodyRef}>
                {messages.length === 0 ? (
                  <div style={{ textAlign: 'center', color: T.brownPale, fontSize: 12.5, margin: 'auto' }}>
                    No messages yet — say hello!
                  </div>
                ) : messages.map((m) => {
                  const mine = m.sender.id === user.id
                  return (
                    <div key={m.id} className={`msg-bubble ${mine ? 'mine' : 'theirs'}`}>
                      {!mine && active.isGroup && (
                        <div className="msg-bubble-sender">{m.sender.name}</div>
                      )}
                      <div>{m.body}</div>
                      <div className="msg-bubble-time">{fmtTime(m.createdAt)}</div>
                    </div>
                  )
                })}
              </div>

              <form className="msg-compose" onSubmit={send}>
                <input
                  className="msg-compose-input"
                  placeholder="Type a message…"
                  value={draft}
                  onChange={e => setDraft(e.target.value)}
                  maxLength={4000}
                />
                <button
                  type="submit"
                  className="msg-compose-send"
                  disabled={sending || !draft.trim()}
                >
                  {sending ? '…' : 'Send'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>

      {showNew && (
        <NewConversationModal
          onClose={() => setShowNew(false)}
          onCreated={(conv) => {
            setShowNew(false)
            loadConversations()
            setActiveId(conv.id)
          }}
        />
      )}
    </div>
  )
}

// ── New conversation modal ─────────────────────────────────────────────────
function NewConversationModal({ onClose, onCreated }) {
  const [isGroup, setIsGroup] = useState(false)
  const [name,    setName]    = useState('')
  const [members, setMembers] = useState([])
  const [picked,  setPicked]  = useState(new Set())
  const [search,  setSearch]  = useState('')
  const [error,   setError]   = useState('')
  const [busy,    setBusy]    = useState(false)

  useEffect(() => {
    api.get('/members').then(d => setMembers(d.members)).catch(() => {})
  }, [])

  const toggle = (id) => setPicked(prev => {
    if (isGroup) {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    }
    return new Set([id])
  })

  const submit = async () => {
    if (picked.size === 0) { setError('Pick at least one member.'); return }
    if (isGroup && !name.trim()) { setError('Group needs a name.'); return }
    if (isGroup && picked.size < 2) { setError('Groups need at least 2 other members.'); return }
    setError('')
    setBusy(true)
    try {
      const { conversation } = await api.post('/messaging/conversations', {
        isGroup,
        name:    isGroup ? name.trim() : undefined,
        userIds: [...picked],
      })
      onCreated(conversation)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const filtered = members.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.staffId?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="msg-new-modal-overlay" onClick={onClose}>
      <div className="msg-new-modal" onClick={e => e.stopPropagation()}>
        <h3 className="serif" style={{ fontSize: '1.3rem', color: T.brownDeep, marginBottom: '1rem' }}>
          New Conversation
        </h3>

        {/* Toggle */}
        <div style={{ display: 'flex', gap: '.5rem', marginBottom: '1rem' }}>
          <button
            type="button"
            className={`btn btn-sm ${!isGroup ? 'btn-gold' : 'btn-outline-dark'}`}
            onClick={() => { setIsGroup(false); setPicked(new Set()) }}
          >
            Direct Message
          </button>
          <button
            type="button"
            className={`btn btn-sm ${isGroup ? 'btn-gold' : 'btn-outline-dark'}`}
            onClick={() => { setIsGroup(true); setPicked(new Set()) }}
          >
            Group Chat
          </button>
        </div>

        {isGroup && (
          <div className="form-group">
            <label className="form-label">Group Name</label>
            <input
              className="form-input"
              placeholder="e.g. Welfare Committee"
              value={name}
              onChange={e => setName(e.target.value)}
              maxLength={100}
            />
          </div>
        )}

        <div className="form-group">
          <label className="form-label">
            {isGroup ? `Add Members (${picked.size} selected)` : 'Choose a Member'}
          </label>
          <input
            className="form-input"
            placeholder="Search by name or staff ID…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div style={{ maxHeight: 280, overflowY: 'auto', marginBottom: '1rem', border: '1px solid rgba(122,58,24,.08)', borderRadius: 5 }}>
          {filtered.length === 0 ? (
            <div style={{ padding: '1rem', textAlign: 'center', color: T.brownPale, fontSize: 13 }}>
              No matching members.
            </div>
          ) : filtered.map(m => (
            <div
              key={m.id}
              className={`msg-member-row ${picked.has(m.id) ? 'picked' : ''}`}
              onClick={() => toggle(m.id)}
            >
              <Avatar name={m.name} avatarFilename={m.avatarFilename} size={36} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: T.brownDeep }}>{m.name}</div>
                <div style={{ fontSize: 11, color: T.brownPale }}>
                  {m.position || m.role} {m.department && `· ${m.department}`}
                </div>
              </div>
              {picked.has(m.id) && <span style={{ color: T.gold, fontSize: 18, fontWeight: 700 }}>✓</span>}
            </div>
          ))}
        </div>

        {error && <div className="auth-error">{error}</div>}

        <div style={{ display: 'flex', gap: '.5rem', justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-outline-dark" onClick={onClose}>Cancel</button>
          <button type="button" className="btn btn-gold" onClick={submit} disabled={busy}>
            {busy ? 'Starting…' : 'Start Conversation'}
          </button>
        </div>
      </div>
    </div>
  )
}
