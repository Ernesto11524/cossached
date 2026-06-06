import { useState, useEffect, useRef } from 'react'

const GREETING = {
  role: 'bot',
  text: "Hello! I'm the COSSA-CHED Assistant. Ask me anything about the association, CHED, welfare benefits, or HR matters.",
}

const CHIPS = [
  'What is COSSA-CHED?',
  'Welfare benefits',
  'Annual Congress',
  'Contact secretariat',
]

/**
 * Calls the backend /api/chat endpoint (wired up in Phase 4).
 * Returns a reply string; throws on network or server error.
 */
async function fetchReply(messages) {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages }),
  })
  if (!res.ok) throw new Error('Server error')
  const data = await res.json()
  return data.reply
}

export default function Chatbot() {
  const [open, setOpen]       = useState(false)
  const [messages, setMessages] = useState([GREETING])
  const [input, setInput]     = useState('')
  const [loading, setLoading] = useState(false)
  const endRef = useRef(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = async (text) => {
    const msg = (text ?? input).trim()
    if (!msg || loading) return
    setInput('')

    const userMsg = { role: 'user', text: msg }
    setMessages((prev) => [...prev, userMsg])
    setLoading(true)

    // Build conversation history in the format the backend expects
    const history = [...messages, userMsg]
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m) => ({ role: m.role === 'bot' ? 'assistant' : 'user', content: m.text }))

    try {
      const reply = await fetchReply(history.length ? history : [{ role: 'user', content: msg }])
      setMessages((prev) => [...prev, { role: 'bot', text: reply }])
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: 'bot',
          text: 'Our AI assistant is currently unavailable. Please contact the secretariat directly at cossa-ched@cocobod.gh or call +233 30 266 1877.',
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  return (
    <>
      <button
        className="chatbot-fab"
        onClick={() => setOpen((o) => !o)}
        aria-label="Open COSSA-CHED chat assistant"
      >
        {open ? '✕' : '💬'}
      </button>

      {open && (
        <div className="chatbot-window" role="dialog" aria-label="COSSA-CHED Chat Assistant">
          {/* Header */}
          <div className="chat-header">
            <div className="chat-header-ava">🤖</div>
            <div className="chat-header-info">
              <b>COSSA-CHED Assistant</b>
              <small>AI-powered help</small>
            </div>
            <div className="chat-status" aria-hidden="true" />
            <button className="chat-close" onClick={() => setOpen(false)} aria-label="Close chat">
              ✕
            </button>
          </div>

          {/* Messages */}
          <div className="chat-messages" aria-live="polite">
            {messages.map((m, i) => (
              <div key={i} className={`chat-msg ${m.role}`}>
                {m.text}
              </div>
            ))}
            {loading && (
              <div className="chat-msg bot thinking">Thinking…</div>
            )}
            <div ref={endRef} />
          </div>

          {/* Quick-reply chips */}
          <div className="chat-chips">
            {CHIPS.map((chip) => (
              <button key={chip} className="chat-chip" onClick={() => send(chip)}>
                {chip}
              </button>
            ))}
          </div>

          {/* Input row */}
          <div className="chat-input-row">
            <input
              className="chat-input"
              placeholder="Ask anything…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              aria-label="Chat message"
            />
            <button className="chat-send" onClick={() => send()} aria-label="Send message">
              ➤
            </button>
          </div>
        </div>
      )}
    </>
  )
}
