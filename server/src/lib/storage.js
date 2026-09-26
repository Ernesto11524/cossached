/**
 * File storage on Vercel Blob.
 *
 * Vercel functions have no persistent disk, so every uploaded file (avatars,
 * gallery media, news media, documents) lives in a Vercel Blob store instead of
 * server/uploads/. The database keeps storing the same short keys it always
 * did (e.g. "3f2c…e1.jpg"); a key maps to the blob pathname "<folder>/<key>".
 *
 * Requires BLOB_READ_WRITE_TOKEN (added automatically when you connect a Blob
 * store to the Vercel project; copy it into server/.env for local dev).
 */
import { put, del, head, BlobNotFoundError } from '@vercel/blob'
import { randomUUID } from 'crypto'
import path from 'path'

// ── Per-folder rules (the same limits/types multer enforced before) ─────────
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime']
const MB = 1024 * 1024

export const FOLDERS = {
  avatars: {
    adminOnly: false,
    maxBytes:  5 * MB,
    types:     ['image/jpeg', 'image/png', 'image/webp'],
  },
  gallery: {
    adminOnly: true,
    maxBytes:  200 * MB,
    types:     [...IMAGE_TYPES, ...VIDEO_TYPES],
  },
  news: {
    adminOnly: true,
    maxBytes:  100 * MB,
    types:     [...IMAGE_TYPES, ...VIDEO_TYPES],
  },
  documents: {
    adminOnly: true,
    maxBytes:  100 * MB,
    types: [
      // Documents
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain',
      'text/csv',
      // Images
      'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml',
      // Video
      'video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo',
      // Audio
      'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/x-m4a',
      // Archive
      'application/zip', 'application/x-zip-compressed',
    ],
  },
}

// Keys the client is allowed to request an upload token for:
//   avatars/<uuid>.<ext>   gallery/<uuid>.<ext>   news/<uuid>.<ext>
//   documents/<uuid>/<safe original name>   (so downloads keep the real filename)
const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
const SIMPLE_KEY   = new RegExp(`^${UUID}(\\.[a-z0-9]{1,10})?$`)
const DOCUMENT_KEY = new RegExp(`^${UUID}/[A-Za-z0-9._()\\- ]{1,200}$`)

export function isValidKey(folder, key) {
  if (!FOLDERS[folder] || typeof key !== 'string') return false
  return folder === 'documents' ? DOCUMENT_KEY.test(key) : SIMPLE_KEY.test(key.toLowerCase())
}

/** Split "gallery/abc.jpg" → { folder: 'gallery', key: 'abc.jpg' } */
export function splitPathname(pathname) {
  const i = pathname.indexOf('/')
  if (i < 0) return { folder: null, key: null }
  return { folder: pathname.slice(0, i), key: pathname.slice(i + 1) }
}

/** Filesystem/URL-safe version of a user-supplied filename. */
export function safeName(name) {
  const cleaned = String(name || 'file')
    .normalize('NFKD')
    .replace(/[\u2010-\u2015]/g, '-')
    .replace(/[^A-Za-z0-9._()\- ]+/g, '_')
    .replace(/_+/g, '_')
    .trim()
    .slice(0, 200)
  return cleaned || 'file'
}

/** A brand-new key for a file, in the same shape the old disk storage used. */
export function newKey(folder, originalName) {
  if (folder === 'documents') return `${randomUUID()}/${safeName(originalName)}`
  const ext = path.extname(originalName || '').toLowerCase()
  return `${randomUUID()}${/^\.[a-z0-9]{1,10}$/.test(ext) ? ext : ''}`
}

// ── URLs ────────────────────────────────────────────────────────────────────
function token() {
  const t = process.env.BLOB_READ_WRITE_TOKEN
  if (!t) throw new Error('BLOB_READ_WRITE_TOKEN is not set — connect a Vercel Blob store to the project.')
  return t
}

function baseUrl() {
  if (process.env.BLOB_BASE_URL) return process.env.BLOB_BASE_URL.replace(/\/+$/, '')
  // Token format: vercel_blob_rw_<storeId>_<secret>  (same parsing the SDK uses)
  const storeId = token().split('_')[3]
  return `https://${storeId}.public.blob.vercel-storage.com`
}

/** Public URL for a stored file. Each path segment is URL-encoded. */
export function fileUrl(folder, key) {
  const encoded = `${folder}/${key}`.split('/').map(encodeURIComponent).join('/')
  return `${baseUrl()}/${encoded}`
}

/** Same, but tells the browser to download instead of display. */
export function downloadUrl(folder, key) {
  return `${fileUrl(folder, key)}?download=1`
}

// ── Operations ──────────────────────────────────────────────────────────────
/** Upload a buffer (server-side path; used for small files and migrations). */
export async function saveBuffer(folder, key, buffer, contentType) {
  await put(`${folder}/${key}`, buffer, {
    access:          'public',
    contentType,
    addRandomSuffix: false,
    allowOverwrite:  true,
    token:           token(),
  })
}

/** Metadata for a stored file, or null if it doesn't exist. */
export async function statFile(folder, key) {
  try {
    return await head(fileUrl(folder, key), { token: token() })
  } catch (err) {
    if (err instanceof BlobNotFoundError || /does not exist/i.test(err?.message || '')) return null
    throw err
  }
}

/** Delete a stored file. Never throws — a missing file is not an error. */
export async function removeFile(folder, key) {
  if (!key) return
  try {
    await del(fileUrl(folder, key), { token: token() })
  } catch (err) {
    console.error(`[storage] delete ${folder}/${key} failed:`, err.message)
  }
}
