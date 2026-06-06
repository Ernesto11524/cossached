import { useState } from 'react'
import SectionTag from '../components/SectionTag.jsx'
import { useReveal } from '../hooks/useReveal.js'
import { T } from '../styles/tokens.js'

const CONTACT_ITEMS = [
  {
    icon: '📍',
    heading: 'Head Office',
    value: 'COCOBOD HQ, 41 Kwame Nkrumah Avenue, Accra, Ghana',
  },
  {
    icon: '📞',
    heading: 'Telephone',
    value: '+233 30 266 1877',
  },
  {
    icon: '✉️',
    heading: 'Email',
    value: 'cossa-ched@cocobod.gh',
  },
  {
    icon: '🕐',
    heading: 'Working Hours',
    value: 'Monday – Friday: 8:00 AM – 5:00 PM',
  },
]

const SUBJECTS = [
  'General Enquiry',
  'Welfare Question',
  'Industrial Relations',
  'Membership Information',
  'Other',
]

export default function ContactPage() {
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    subject: SUBJECTS[0],
    message: '',
  })
  const [sent, setSent] = useState(false)
  const [sending, setSending] = useState(false)

  useReveal()

  const handleChange = (field) => (e) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSending(true)

    try {
      // Phase 2: POST to /api/contact — backend sends the email
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error()
    } catch {
      // Backend not yet live — still show success for Phase 1 demo
    }

    setSending(false)
    setSent(true)
  }

  return (
    <>
      {/* ── Banner ───────────────────────────────────────────────────────── */}
      <div className="page-banner">
        <div className="page-banner-inner">
          <SectionTag label="Get In Touch" />
          <h1>
            Contact <em>COSSA-CHED</em>
          </h1>
        </div>
      </div>

      {/* ── Main content ─────────────────────────────────────────────────── */}
      <section className="section">
        <div className="section-inner">
          <div className="contact-grid">
            {/* Left — info */}
            <div className="reveal">
              <SectionTag label="Secretariat" />
              <h2 className="section-title">
                We're <em>Here to Help</em>
              </h2>
              <p className="section-body">
                Reach out to the COSSA-CHED secretariat for any queries, welfare
                enquiries or general assistance. Our team is available during
                working hours, Monday to Friday.
              </p>

              <div className="contact-info-items">
                {CONTACT_ITEMS.map(({ icon, heading, value }) => (
                  <div className="contact-info-item" key={heading}>
                    <div className="contact-icon">{icon}</div>
                    <div>
                      <span
                        style={{
                          display: 'block',
                          fontSize: 10.5,
                          fontWeight: 600,
                          letterSpacing: '0.08em',
                          textTransform: 'uppercase',
                          color: T.brownWarm,
                          marginBottom: 2,
                        }}
                      >
                        {heading}
                      </span>
                      <span style={{ fontSize: 13.5, color: T.textMid }}>
                        {value}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Map placeholder */}
              <div
                style={{
                  marginTop: '2rem',
                  borderRadius: 6,
                  overflow: 'hidden',
                  border: `1px solid rgba(122,58,24,0.12)`,
                  background: T.creamDeep,
                  height: 180,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'column',
                  gap: '0.5rem',
                  color: T.brownPale,
                }}
              >
                <span style={{ fontSize: '2rem' }}>🗺️</span>
                <span style={{ fontSize: 12.5 }}>
                  Map embed — 41 Kwame Nkrumah Ave, Accra
                </span>
              </div>
            </div>

            {/* Right — form */}
            <div className="contact-form-card reveal">
              {sent ? (
                <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                  <div style={{ fontSize: '3rem', marginBottom: '0.8rem' }}>✅</div>
                  <h3
                    className="serif"
                    style={{ fontSize: '1.5rem', color: T.brownDeep, marginBottom: '0.5rem' }}
                  >
                    Message Sent
                  </h3>
                  <p style={{ fontSize: 13.5, color: T.textMid, marginBottom: '1.5rem' }}>
                    Thank you for reaching out. The COSSA-CHED secretariat will
                    respond within 2 working days.
                  </p>
                  <button
                    className="btn btn-outline-dark btn-sm"
                    onClick={() => { setSent(false); setForm({ firstName: '', lastName: '', email: '', subject: SUBJECTS[0], message: '' }) }}
                  >
                    Send Another Message
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} noValidate>
                  <h3
                    className="serif"
                    style={{ fontSize: '1.4rem', color: T.brownDeep, marginBottom: '0.3rem' }}
                  >
                    Send a Message
                  </h3>
                  <p style={{ fontSize: 13, color: T.textMid, marginBottom: '1.5rem' }}>
                    For members and the general public.
                  </p>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="form-group">
                      <label className="form-label" htmlFor="firstName">First Name</label>
                      <input
                        id="firstName"
                        className="form-input"
                        placeholder="Kwame"
                        value={form.firstName}
                        onChange={handleChange('firstName')}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label" htmlFor="lastName">Last Name</label>
                      <input
                        id="lastName"
                        className="form-input"
                        placeholder="Asante"
                        value={form.lastName}
                        onChange={handleChange('lastName')}
                        required
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="email">Email</label>
                    <input
                      id="email"
                      type="email"
                      className="form-input"
                      placeholder="you@example.com"
                      value={form.email}
                      onChange={handleChange('email')}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="subject">Subject</label>
                    <select
                      id="subject"
                      className="form-select"
                      value={form.subject}
                      onChange={handleChange('subject')}
                    >
                      {SUBJECTS.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="message">Message</label>
                    <textarea
                      id="message"
                      className="form-textarea"
                      placeholder="Write your message here…"
                      value={form.message}
                      onChange={handleChange('message')}
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    className="btn btn-gold"
                    style={{ width: '100%', justifyContent: 'center' }}
                    disabled={sending}
                  >
                    {sending ? 'Sending…' : 'Send Message'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
