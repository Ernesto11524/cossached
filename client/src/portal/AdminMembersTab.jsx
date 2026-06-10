import { useEffect, useState } from 'react'
import { api } from '../lib/api.js'
import { T } from '../styles/tokens.js'
import { GHANA_REGIONS } from '../data/regions.js'
import { DEPARTMENTS } from '../data/departments.js'
import { NATIONAL_POSITIONS, REGIONAL_POSITIONS, scopeOfPosition } from '../data/positions.js'

const EMPTY_FORM = {
  staffId:       '',
  email:         '',
  name:          '',
  department:    '',     // either a preset value OR free text (when "Other" picked)
  position:      '',
  positionScope: '',     // '' | 'NATIONAL' | 'REGIONAL'
  region:        '',
  phone:         '',
  role:          'MEMBER',
}

export default function AdminMembersTab() {
  const [members,  setMembers]  = useState([])
  const [loading,  setLoading]  = useState(true)
  const [search,   setSearch]   = useState('')

  const [showForm,    setShowForm]    = useState(false)
  const [form,        setForm]        = useState(EMPTY_FORM)
  const [deptOther,   setDeptOther]   = useState(false) // true when "Other" picked
  const [posting,     setPosting]     = useState(false)
  const [formErr,     setFormErr]     = useState('')
  const [successInfo, setSuccessInfo] = useState(null)  // { name, staffId, tempPassword, email, phone }

  const load = (q = '') => {
    setLoading(true)
    const params = new URLSearchParams({ includeInactive: 'true' })
    if (q) params.set('search', q)
    api.get(`/members?${params.toString()}`)
       .then(d => setMembers(d.members))
       .catch(() => {})
       .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleSearch = (e) => {
    const q = e.target.value
    setSearch(q)
    clearTimeout(window._adminMembersTimer)
    window._adminMembersTimer = setTimeout(() => load(q), 300)
  }

  const handleChange = (field) => (e) =>
    setForm(prev => ({ ...prev, [field]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    setFormErr('')
    setSuccessInfo(null)

    // Client-side consistency check — scope is now derived from the position
    // dropdown, but regional execs still need an explicit region.
    if (form.positionScope === 'REGIONAL' && !form.region) {
      setFormErr('Please pick a region for this regional position.')
      return
    }

    setPosting(true)
    try {
      const payload = { ...form }
      Object.keys(payload).forEach(k => { if (payload[k] === '') delete payload[k] })
      const { user, tempPassword } = await api.post('/members', payload)
      setSuccessInfo({
        name:         user.name,
        staffId:      user.staffId,
        email:        user.email,
        phone:        user.phone,
        tempPassword,
      })
      setForm(EMPTY_FORM)
      setDeptOther(false)
      setShowForm(false)
      load(search)
    } catch (err) {
      setFormErr(err.message)
    } finally {
      setPosting(false)
    }
  }

  const copyTemp = () => {
    if (successInfo?.tempPassword) {
      navigator.clipboard?.writeText(successInfo.tempPassword).catch(() => {})
    }
  }

  const toggleActive = async (member) => {
    const action = member.active ? 'deactivate' : 'activate'
    const verb   = member.active ? 'Deactivate' : 'Reactivate'
    if (!confirm(`${verb} ${member.name}?`)) return
    try {
      await api.patch(`/members/${member.id}/${action}`, {})
      load(search)
    } catch (err) {
      alert(err.message)
    }
  }

  const deleteMember = async (member) => {
    const phrase = `delete ${member.staffId}`
    const typed = prompt(
      `⚠️  DELETE ${member.name} (${member.staffId})\n\n` +
      `This permanently removes the account and cannot be undone.\n` +
      `If the member has any content (messages, announcements, welfare requests, etc.) the system will refuse — use Deactivate instead.\n\n` +
      `To confirm, type:  ${phrase}`
    )
    if (typed === null) return
    if (typed.trim().toLowerCase() !== phrase.toLowerCase()) {
      alert('Confirmation phrase did not match — delete cancelled.')
      return
    }
    try {
      await api.delete(`/members/${member.id}`)
      alert(`${member.name} has been permanently deleted.`)
      load(search)
    } catch (err) {
      alert(err.message)
    }
  }

  const resetPassword = async (member) => {
    const newPassword = prompt(
      `Reset password for ${member.name}\n\nEnter the new temporary password (min 8 characters).\nThe member will be notified by email.`
    )
    if (newPassword === null) return
    if (newPassword.length < 8) {
      alert('Password must be at least 8 characters.')
      return
    }
    try {
      await api.post(`/members/${member.id}/reset-password`, { newPassword })
      alert(`Password reset successfully for ${member.name}.`)
    } catch (err) {
      alert(err.message)
    }
  }

  const active   = members.filter(m => m.active)
  const inactive = members.filter(m => !m.active)

  if (loading) return <p style={{ color: T.brownPale, padding: '2rem 0' }}>Loading…</p>

  return (
    <div className="fade-in">
      {/* ── Header / actions ───────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', gap: '1rem', flexWrap: 'wrap' }}>
        <input
          className="form-input"
          style={{ maxWidth: 340 }}
          placeholder="Search by name, staff ID, role…"
          value={search}
          onChange={handleSearch}
        />
        <button className="btn btn-gold" onClick={() => { setShowForm(s => !s); setOkMsg('') }}>
          {showForm ? 'Cancel' : '+ Provision New Member'}
        </button>
      </div>

      {successInfo && (
        <div style={{
          background: '#fdf6ee',
          border: `2px solid ${T.gold}`,
          borderRadius: 8,
          padding: '1.2rem 1.4rem',
          marginBottom: '1.2rem',
          maxWidth: 720,
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
            <div>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.05rem', color: T.brownDeep, fontWeight: 600 }}>
                ✅ {successInfo.name} provisioned
              </div>
              <div style={{ fontSize: 12, color: T.brownPale, marginTop: 4 }}>
                Staff ID <strong style={{ color: T.brownWarm, fontFamily: 'monospace' }}>{successInfo.staffId}</strong>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSuccessInfo(null)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.brownPale, fontSize: 18, padding: 0 }}
              aria-label="Dismiss"
            >
              ×
            </button>
          </div>

          <div style={{
            background: '#fff',
            borderRadius: 5,
            padding: '.8rem 1rem',
            marginTop: '.9rem',
            display: 'flex', alignItems: 'center', gap: '.8rem', flexWrap: 'wrap',
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: T.brownPale }}>
              Temp password
            </div>
            <code style={{ fontSize: 16, fontWeight: 700, color: T.brownDeep, letterSpacing: '.05em' }}>
              {successInfo.tempPassword}
            </code>
            <button
              type="button"
              className="btn btn-outline-dark btn-sm"
              onClick={copyTemp}
            >
              📋 Copy
            </button>
          </div>

          <div style={{ fontSize: 12, color: T.textMid, marginTop: '.8rem', lineHeight: 1.55 }}>
            Sent to <strong>{successInfo.email}</strong>
            {successInfo.phone && <> and <strong>{successInfo.phone}</strong> (SMS)</>}.
            The member should sign in and change this password immediately.
            <br />
            <em style={{ color: T.brownPale, fontSize: 11 }}>
              If email/SMS aren't configured yet, share this password with the member directly — it won't be shown again.
            </em>
          </div>
        </div>
      )}

      {/* ── Provisioning form ──────────────────────────────────────────── */}
      {showForm && (
        <form
          onSubmit={submit}
          style={{
            marginBottom: '2rem',
            background: T.white,
            borderRadius: 8,
            padding: '1.8rem',
            border: `1px solid rgba(122,58,24,.1)`,
            maxWidth: 720,
          }}
        >
          <h3 className="serif" style={{ fontSize: '1.1rem', color: T.brownDeep, marginBottom: '1rem' }}>
            Provision a New Member Account
          </h3>

          {formErr && <div className="auth-error">{formErr}</div>}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Staff ID *</label>
              <input className="form-input" placeholder="e.g. 1234567" value={form.staffId} onChange={handleChange('staffId')} required />
            </div>
            <div className="form-group">
              <label className="form-label">Email *</label>
              <input type="email" className="form-input" placeholder="kwame.asante@cocobod.gh" value={form.email} onChange={handleChange('email')} required />
            </div>
            <div className="form-group" style={{ gridColumn: '1/-1' }}>
              <label className="form-label">Full Name *</label>
              <input className="form-input" placeholder="Kwame Asante" value={form.name} onChange={handleChange('name')} required />
            </div>
            <div className="form-group">
              <label className="form-label">Department</label>
              <select
                className="form-select"
                value={deptOther ? '__OTHER__' : (DEPARTMENTS.includes(form.department) ? form.department : (form.department ? '__OTHER__' : ''))}
                onChange={(e) => {
                  const v = e.target.value
                  if (v === '__OTHER__') {
                    setDeptOther(true)
                    setForm(prev => ({ ...prev, department: '' }))
                  } else {
                    setDeptOther(false)
                    setForm(prev => ({ ...prev, department: v }))
                  }
                }}
              >
                <option value="">— Select a department —</option>
                {DEPARTMENTS.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
                <option value="__OTHER__">Other (specify)…</option>
              </select>
              {deptOther && (
                <input
                  className="form-input"
                  style={{ marginTop: 8 }}
                  placeholder="Type the department name"
                  value={form.department}
                  onChange={handleChange('department')}
                  autoFocus
                />
              )}
            </div>
            <div className="form-group">
              <label className="form-label">Region (optional)</label>
              <select className="form-select" value={form.region} onChange={handleChange('region')}>
                <option value="">— No region —</option>
                {GHANA_REGIONS.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
              <small style={{ display: 'block', marginTop: 4, fontSize: 11, color: T.brownPale }}>
                Where this member works. Used to group the directory by region.
                For regional executives this also indicates the region they hold office in.
              </small>
            </div>
            <div className="form-group">
              <label className="form-label">Executive Position (optional)</label>
              <select
                className="form-select"
                value={form.position}
                onChange={(e) => {
                  const pos   = e.target.value
                  const scope = scopeOfPosition(pos) || ''
                  setForm(prev => ({ ...prev, position: pos, positionScope: scope }))
                }}
              >
                <option value="">— Regular member (no executive role) —</option>
                <optgroup label="🇬🇭  National Executive">
                  {NATIONAL_POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
                </optgroup>
                <optgroup label="📍  Regional Executive">
                  {REGIONAL_POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
                </optgroup>
              </select>
              <small style={{ display: 'block', marginTop: 4, fontSize: 11, color: T.brownPale }}>
                Pick the position this member holds. Leave blank for ordinary members. Regional positions require the region to be set above.
              </small>
            </div>

            {/* Regional execs require a region — surface the reminder if missing */}
            {form.positionScope === 'REGIONAL' && !form.region && (
              <div
                style={{
                  gridColumn: '1/-1',
                  padding: '.7rem .9rem',
                  background: '#fef3c7',
                  border: '1px solid #fcd34d',
                  borderRadius: 5,
                  fontSize: 12,
                  color: '#92400e',
                }}
              >
                This regional position needs a region — please pick one in the <strong>Region</strong> field above.
              </div>
            )}
            <div className="form-group">
              <label className="form-label">Phone</label>
              <input type="tel" className="form-input" placeholder="+233 24 000 0000" value={form.phone} onChange={handleChange('phone')} />
            </div>
            <div className="form-group">
              <label className="form-label">Role *</label>
              <select className="form-select" value={form.role} onChange={handleChange('role')}>
                <option value="MEMBER">Member</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
            <div style={{
              gridColumn: '1/-1',
              padding: '.8rem 1rem',
              background: T.creamLight,
              borderRadius: 5,
              border: `1px solid rgba(122,58,24,.1)`,
              fontSize: 12,
              color: T.brownWarm,
              lineHeight: 1.55,
            }}>
              🔑 <strong>A secure temporary password will be generated automatically</strong> and sent to the member's email{' '}
              {form.phone && <> and phone (SMS)</>}.
              You will also see it on the next screen so you can share it manually if needed.
            </div>
          </div>

          <button type="submit" className="btn btn-gold" disabled={posting}>
            {posting ? 'Creating…' : 'Create Member Account'}
          </button>
        </form>
      )}

      {/* ── Active members ─────────────────────────────────────────────── */}
      <div className="widget">
        <div className="widget-header">
          <h3>Active Members ({active.length})</h3>
        </div>
        <div className="widget-body" style={{ padding: 0 }}>
          {active.length === 0 ? (
            <p style={{ padding: '1.2rem 1.4rem', fontSize: 13, color: T.brownPale }}>No active members found.</p>
          ) : (
            <table className="doc-table">
              <thead>
                <tr><th>Name</th><th>Staff ID</th><th>Role</th><th>Department</th><th>Action</th></tr>
              </thead>
              <tbody>
                {active.map(m => (
                  <tr key={m.id}>
                    <td>
                      <div style={{ fontWeight: 500, color: T.brownDeep, fontSize: 13.5 }}>{m.name}</div>
                      <div style={{ fontSize: 11, color: T.brownPale }}>{m.email}</div>
                    </td>
                    <td style={{ fontSize: 13, fontFamily: 'monospace' }}>{m.staffId}</td>
                    <td>
                      <span className="doc-badge" style={{
                        background: m.role === 'ADMIN' ? '#fdf6ee' : T.creamDeep,
                        color: m.role === 'ADMIN' ? T.brownWarm : T.brownMid,
                      }}>
                        {m.role}
                      </span>
                    </td>
                    <td style={{ fontSize: 13, color: T.textMid }}>
                      {m.position && (
                        <div>
                          {m.position}
                          {m.positionScope === 'NATIONAL' && (
                            <span style={{ marginLeft: 6, fontSize: 9, fontWeight: 700, color: T.gold, letterSpacing: '.06em' }}>· NATIONAL</span>
                          )}
                          {m.positionScope === 'REGIONAL' && m.region && (
                            <span style={{ marginLeft: 6, fontSize: 9, fontWeight: 700, color: T.brownWarm, letterSpacing: '.06em' }}>· {m.region.toUpperCase()}</span>
                          )}
                        </div>
                      )}
                      <div style={{ fontSize: 11, color: T.brownPale }}>{m.department || '—'}</div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '.4rem', flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          className="btn btn-outline-dark btn-sm"
                          onClick={() => resetPassword(m)}
                        >
                          Reset Password
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm"
                          style={{ border: '1.5px solid #fca5a5', color: '#b91c1c', background: 'none', borderRadius: 3, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif", fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', fontSize: 11 }}
                          onClick={() => toggleActive(m)}
                        >
                          Deactivate
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm"
                          style={{ background: '#b91c1c', color: '#fff', border: 'none', borderRadius: 3, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif", fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', fontSize: 11, padding: '6px 10px' }}
                          onClick={() => deleteMember(m)}
                          title="Permanently delete this account"
                        >
                          🗑 Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── Inactive members ───────────────────────────────────────────── */}
      {inactive.length > 0 && (
        <div className="widget" style={{ marginTop: '1.4rem' }}>
          <div className="widget-header">
            <h3>Deactivated Members ({inactive.length})</h3>
          </div>
          <div className="widget-body" style={{ padding: 0 }}>
            <table className="doc-table">
              <thead>
                <tr><th>Name</th><th>Staff ID</th><th>Role</th><th>Department</th><th>Action</th></tr>
              </thead>
              <tbody>
                {inactive.map(m => (
                  <tr key={m.id} style={{ opacity: 0.6 }}>
                    <td>
                      <div style={{ fontWeight: 500, color: T.brownDeep, fontSize: 13.5 }}>{m.name}</div>
                      <div style={{ fontSize: 11, color: T.brownPale }}>{m.email}</div>
                    </td>
                    <td style={{ fontSize: 13, fontFamily: 'monospace' }}>{m.staffId}</td>
                    <td>
                      <span className="doc-badge" style={{ background: T.creamDeep, color: T.brownMid }}>{m.role}</span>
                    </td>
                    <td style={{ fontSize: 13, color: T.textMid }}>{m.department || '—'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '.4rem', flexWrap: 'wrap' }}>
                        <button className="btn btn-outline-dark btn-sm" onClick={() => toggleActive(m)}>
                          Reactivate
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm"
                          style={{ background: '#b91c1c', color: '#fff', border: 'none', borderRadius: 3, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif", fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', fontSize: 11, padding: '6px 10px' }}
                          onClick={() => deleteMember(m)}
                        >
                          🗑 Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
