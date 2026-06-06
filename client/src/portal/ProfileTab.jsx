import { useState, useRef } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { api } from '../lib/api.js'
import { T } from '../styles/tokens.js'
import Avatar from '../components/Avatar.jsx'
import BiometricSection from './BiometricSection.jsx'

export default function ProfileTab() {
  const { user, login } = useAuth()

  const [pwForm,   setPwForm]   = useState({ currentPassword: '', newPassword: '', confirm: '' })
  const [savingPw, setSavingPw] = useState(false)
  const [pwMsg,    setPwMsg]    = useState('')
  const [pwErr,    setPwErr]    = useState('')

  const [avatarUploading, setAvatarUploading] = useState(false)
  const [avatarErr,       setAvatarErr]       = useState('')
  const fileInputRef = useRef(null)

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarErr('')
    setAvatarUploading(true)
    try {
      const fd = new FormData()
      fd.append('avatar', file)
      const { user: updated } = await api.upload('/profile/avatar', fd)
      login(updated)
    } catch (err) {
      setAvatarErr(err.message)
    } finally {
      setAvatarUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleAvatarRemove = async () => {
    if (!confirm('Remove your profile picture?')) return
    setAvatarErr('')
    try {
      const { user: updated } = await api.delete('/profile/avatar')
      login(updated)
    } catch (err) {
      setAvatarErr(err.message)
    }
  }

  const handlePasswordChange = async (e) => {
    e.preventDefault()
    setPwErr('')
    setPwMsg('')
    if (pwForm.newPassword !== pwForm.confirm) {
      setPwErr('New passwords do not match.')
      return
    }
    setSavingPw(true)
    try {
      await api.post('/profile/change-password', {
        currentPassword: pwForm.currentPassword,
        newPassword:     pwForm.newPassword,
      })
      setPwMsg('Password changed successfully.')
      setPwForm({ currentPassword: '', newPassword: '', confirm: '' })
    } catch (err) {
      setPwErr(err.message)
    } finally {
      setSavingPw(false)
    }
  }

  // Helper for a single read-only field row
  const ReadOnly = ({ label, value }) => (
    <div>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: T.brownPale, marginBottom: 3 }}>
        {label}
      </div>
      <div style={{ fontSize: 13.5, color: T.textMid }}>{value || '—'}</div>
    </div>
  )

  return (
    <div className="fade-in" style={{ maxWidth: 680 }}>
      {/* ── Identity card ────────────────────────────────────────────── */}
      <div style={{ background: T.white, borderRadius: 8, padding: '2rem', border: `1px solid rgba(122,58,24,.09)`, marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1.2rem', marginBottom: '1.5rem', paddingBottom: '1.5rem', borderBottom: `1px solid rgba(122,58,24,.08)` }}>
          <Avatar name={user?.name} avatarFilename={user?.avatarFilename} size={80} />
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.3rem', color: T.brownDeep, fontWeight: 600 }}>
              {user?.name}
            </div>
            <div style={{ fontSize: 11, color: T.gold, letterSpacing: '.09em', textTransform: 'uppercase', marginTop: 3 }}>
              {user?.role} · {user?.staffId}
            </div>

            {/* Avatar controls — members CAN change their picture */}
            <div style={{ marginTop: '.8rem', display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                style={{ display: 'none' }}
                onChange={handleAvatarUpload}
              />
              <button
                type="button"
                className="btn btn-outline-dark btn-sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={avatarUploading}
              >
                {avatarUploading ? 'Uploading…' : (user?.avatarFilename ? 'Change Photo' : 'Upload Photo')}
              </button>
              {user?.avatarFilename && (
                <button
                  type="button"
                  className="btn btn-sm"
                  style={{ border: '1.5px solid #fca5a5', color: '#b91c1c', background: 'none', borderRadius: 3, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif", fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', fontSize: 11 }}
                  onClick={handleAvatarRemove}
                >
                  Remove
                </button>
              )}
            </div>
            {avatarErr && <div style={{ fontSize: 12, color: '#b91c1c', marginTop: '.5rem' }}>{avatarErr}</div>}
            <div style={{ fontSize: 11, color: T.brownPale, marginTop: '.4rem' }}>
              JPEG, PNG, or WebP. Max 5 MB.
            </div>
          </div>
        </div>

        {/* All other fields are read-only — managed by the admin */}
        <div style={{ background: T.creamLight, borderRadius: 6, padding: '.9rem 1rem', marginBottom: '1.2rem', fontSize: 12, color: T.brownWarm, lineHeight: 1.55 }}>
          <strong>Note:</strong> Your name, department, position, and contact details are
          managed by the administrator. To request a correction, contact the secretariat.
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem 1.4rem' }}>
          <ReadOnly label="Full Name"   value={user?.name} />
          <ReadOnly label="Staff ID"    value={user?.staffId} />
          <ReadOnly label="Email"       value={user?.email} />
          <ReadOnly label="Phone"       value={user?.phone} />
          <ReadOnly label="Department"  value={user?.department} />
          <ReadOnly label="Position"    value={user?.position} />
        </div>
      </div>

      {/* ── Password change (member-controlled) ─────────────────────── */}
      <div style={{ background: T.white, borderRadius: 8, padding: '2rem', border: `1px solid rgba(122,58,24,.09)` }}>
        <h3 className="serif" style={{ fontSize: '1.1rem', color: T.brownDeep, marginBottom: '1rem' }}>
          Change Password
        </h3>

        {pwMsg && <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 4, padding: '9px 12px', fontSize: 13, color: '#166534', marginBottom: '1rem' }}>{pwMsg}</div>}
        {pwErr && <div className="auth-error">{pwErr}</div>}

        <form onSubmit={handlePasswordChange}>
          {[['Current Password', 'currentPassword'], ['New Password', 'newPassword'], ['Confirm New Password', 'confirm']].map(([label, field]) => (
            <div className="form-group" key={field}>
              <label className="form-label">{label}</label>
              <input
                type="password"
                className="form-input"
                placeholder="••••••••"
                value={pwForm[field]}
                onChange={e => setPwForm(f => ({ ...f, [field]: e.target.value }))}
                required
              />
            </div>
          ))}
          <button type="submit" className="btn btn-outline-dark" disabled={savingPw}>
            {savingPw ? 'Updating…' : 'Update Password'}
          </button>
        </form>
      </div>

      <BiometricSection />
    </div>
  )
}
