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

export const api = {
  get:    (path)                     => request(path),
  post:   (path, data)               => request(path, { method: 'POST',   body: JSON.stringify(data) }),
  patch:  (path, data)               => request(path, { method: 'PATCH',  body: JSON.stringify(data) }),
  delete: (path)                     => request(path, { method: 'DELETE' }),
  upload: (path, form, method='POST')=> request(path, { method,           body: form }),
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
