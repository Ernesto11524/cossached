/**
 * Drop-in replacement for the old `multer.diskStorage` upload handlers.
 *
 * Why: Vercel functions cap request bodies at ~4.5 MB and have no persistent
 * disk, so the browser now uploads each file straight to Vercel Blob first
 * (see client/src/lib/api.js → api.upload) and sends the API a small reference
 * instead of the file bytes:  {"__blob":"gallery/<uuid>.jpg","name":"photo.jpg"}
 *
 * These middlewares turn those references back into the exact `req.file` /
 * `req.files` objects the routes already used (`filename`, `originalname`,
 * `mimetype`, `size`), so the route code stays the same. Real file parts are
 * still accepted too (small files only) and are pushed to Blob server-side.
 *
 * Mirrors multer's behaviour: files of a disallowed type are silently
 * skipped, oversize files fail with code LIMIT_FILE_SIZE.
 */
import multer from 'multer'
import { FOLDERS, isValidKey, newKey, saveBuffer, splitPathname, statFile, removeFile } from './storage.js'

// Parses multipart text fields + any small real files into memory.
const parseMultipart = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 4.5 * 1024 * 1024 },
}).any()

function tooLarge() {
  const err = new Error('File too large.')
  err.code = 'LIMIT_FILE_SIZE'
  return err
}

function parseRef(value) {
  if (typeof value !== 'string' || !value.startsWith('{"__blob"')) return null
  try {
    const ref = JSON.parse(value)
    return typeof ref.__blob === 'string' ? ref : null
  } catch {
    return null
  }
}

async function resolveRef(ref, folder, rules, fieldname) {
  const { folder: refFolder, key } = splitPathname(ref.__blob)
  if (refFolder !== folder || !isValidKey(folder, key)) return null

  const meta = await statFile(folder, key)
  if (!meta) return null

  const mimetype = (meta.contentType || '').split(';')[0].trim()
  if (!rules.types.includes(mimetype)) {
    await removeFile(folder, key)
    return null
  }
  if (meta.size > rules.maxBytes) {
    await removeFile(folder, key)
    throw tooLarge()
  }
  return {
    fieldname,
    originalname: String(ref.name || key).slice(0, 255),
    mimetype,
    size:         meta.size,
    filename:     key,
  }
}

async function storeRealFile(file, folder, rules) {
  if (!rules.types.includes(file.mimetype)) return null
  if (file.size > rules.maxBytes) throw tooLarge()
  const key = newKey(folder, file.originalname)
  await saveBuffer(folder, key, file.buffer, file.mimetype)
  return {
    fieldname:    file.fieldname,
    originalname: file.originalname,
    mimetype:     file.mimetype,
    size:         file.size,
    filename:     key,
  }
}

function collect(folder, field, maxCount) {
  const rules = FOLDERS[folder]
  if (!rules) throw new Error(`Unknown upload folder "${folder}"`)

  return async (req, _res, next) => {
    try {
      const results = []

      // 1. References to files the browser already put in Blob
      const raw   = req.body?.[field]
      const refs  = (Array.isArray(raw) ? raw : raw != null ? [raw] : []).map(parseRef).filter(Boolean)
      if (req.body && field in req.body) delete req.body[field]

      // 2. Real file parts (small files / non-browser clients)
      const real = (req.files || []).filter(f => f.fieldname === field)

      if (refs.length + real.length > maxCount) {
        const err = new Error('Too many files.')
        err.status = 400
        throw err
      }

      for (const ref of refs) {
        const f = await resolveRef(ref, folder, rules, field)
        if (f) results.push(f)
      }
      for (const file of real) {
        const f = await storeRealFile(file, folder, rules)
        if (f) results.push(f)
      }

      req.uploaded = results
      next()
    } catch (err) {
      next(err)
    }
  }
}

/** Equivalent of multer(...).single(field) — sets req.file */
export function single(folder, field) {
  const run = collect(folder, field, 1)
  return [
    parseMultipart,
    run,
    (req, _res, next) => {
      req.file  = req.uploaded[0]
      req.files = undefined
      next()
    },
  ]
}

/** Equivalent of multer(...).array(field, maxCount) — sets req.files */
export function array(folder, field, maxCount) {
  const run = collect(folder, field, maxCount)
  return [
    parseMultipart,
    run,
    (req, _res, next) => {
      req.files = req.uploaded
      next()
    },
  ]
}
