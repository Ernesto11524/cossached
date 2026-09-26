const BASE = '/api'

async function request(path, options = {}) {
  const isFormData = options.body instanceof FormData

  let res
  try {
    res = await fetch(`${BASE}${path}`, {
      ...options,
      credentials: 'include',
      headers: {
        ...(!isFormData && options.body ? { 'Content-Type': 'application/json' } : {}),
        ...options.headers,
      },
    })
  } catch {
    throw new Error("Can't reach the server. Is the backend running on http://localhost:3001?")
  }

  const text = await res.text()
  const data = text ? safeJson(text) : null

  if (!res.ok) {
    throw new Error(data?.error || `Request failed (HTTP ${res.status}).`)
  }
  return data ?? {}
}

function safeJson(text) {
  try { return JSON.parse(text) } catch { return null }
}

// ── File uploads ────────────────────────────────────────────────────────────
// On Vercel, API requests are capped at ~4.5 MB, so files go straight from the
// browser to Vercel Blob storage and the API only receives a small reference
// to each one. The server (server/src/lib/uploads.js) turns those references
// back into normal uploaded files, so every page keeps calling api.upload()
// with a FormData exactly as before.

/** Which storage folder an API upload route writes to. */
function uploadFolder(path) {
  if (path.startsWith('/profile/avatar')) return 'avatars'
  if (path.startsWith('/gallery'))        return 'gallery'
  if (path.startsWith('/news'))           return 'news'
  if (path.startsWith('/documents'))      return 'documents'
  return null
}

function safeName(name) {
  const cleaned = String(name || 'file')
    .normalize('NFKD')
    .replace(/[\u2010-\u2015]/g, '-')
    .replace(/[^A-Za-z0-9._()\- ]+/g, '_')
    .replace(/_+/g, '_')
    .trim()
    .slice(0, 200)
  return cleaned || 'file'
}

function newPathname(folder, file) {
  const id = crypto.randomUUID()
  if (folder === 'documents') return `documents/${id}/${safeName(file.name)}`
  const m = /\.([a-z0-9]{1,10})$/i.exec(file.name || '')
  return `${folder}/${id}${m ? '.' + m[1].toLowerCase() : ''}`
}

async function sendFilesToStorage(path, form) {
  const folder = uploadFolder(path)
  if (!folder) return form

  const { upload } = await import('@vercel/blob/client')
  const out = new FormData()

  for (const [key, value] of form.entries()) {
    if (!(value instanceof File) || value.size === 0) {
      out.append(key, value)
      continue
    }
    try {
      const blob = await upload(newPathname(folder, value), value, {
        access:          'public',
        handleUploadUrl: `${BASE}/uploads`,
        contentType:     value.type || undefined,
        multipart:       value.size > 20 * 1024 * 1024,
      })
      out.append(key, JSON.stringify({ __blob: blob.pathname, name: value.name }))
    } catch (err) {
      // Wrong file type → skip it, like the server always did for rejected types
      const msg = err?.message || ''
      if (/Content type mismatch/i.test(msg)) continue
      if (/too large/i.test(msg)) throw new Error('File too large.')
      throw new Error('File upload failed. Please check your connection and try again.')
    }
  }
  return out
}

export const api = {
  get:    (path)                     => request(path),
  post:   (path, data)               => request(path, { method: 'POST',   body: JSON.stringify(data) }),
  patch:  (path, data)               => request(path, { method: 'PATCH',  body: JSON.stringify(data) }),
  delete: (path)                     => request(path, { method: 'DELETE' }),
  upload: async (path, form, method='POST') =>
    request(path, { method, body: await sendFilesToStorage(path, form) }),
}

/** Open a protected file download in the current tab. */
export const downloadFile = (documentId) => {
  window.open(`${BASE}/documents/${documentId}/download`, '_blank')
}

/** URL for inline viewing of an uploaded file (image/video thumbnail, preview). */
export const viewUrl = (documentId) => `${BASE}/documents/${documentId}/view`

/** Format a date string for display: "12 May 2026" */
export const fmtDate = (iso) =>
  new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

/**
 * Friendly date-time formatter:
 *   - same day  →  "Today, 3:42 PM"
 *   - yesterday →  "Yesterday, 3:42 PM"
 *   - else      →  "12 May 2026, 3:42 PM"
 *
 * Uses the user's local timezone for both day-bucket and time display so
 * timestamps never look "off by one day" near midnight.
 */
export const fmtDateTime = (iso) => {
  if (!iso) return ''
  const d   = new Date(iso)
  const now = new Date()
  const time = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })

  const sameDay      = d.toDateString() === now.toDateString()
  const yesterday    = new Date(now); yesterday.setDate(now.getDate() - 1)
  const wasYesterday = d.toDateString() === yesterday.toDateString()

  if (sameDay)      return `Today, ${time}`
  if (wasYesterday) return `Yesterday, ${time}`
  return `${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}, ${time}`
}

/** Format bytes to human-readable: "1.2 MB" */
export const fmtBytes = (bytes) => {
  if (bytes < 1024)        return `${bytes} B`
  if (bytes < 1024 ** 2)   return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 ** 2).toFixed(1)} MB`
}

export const STATUS_STYLE = {
  PENDING:   { bg: '#fef9c3', color: '#854d0e'  },
  APPROVED:  { bg: '#dcfce7', color: '#166534'  },
  DISBURSED: { bg: '#dbeafe', color: '#1e40af'  },
  REJECTED:  { bg: '#fee2e2', color: '#991b1b'  },
}
