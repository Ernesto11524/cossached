import { Router } from 'express'
import path from 'path'
import { fileURLToPath } from 'url'
import { existsSync, createReadStream } from 'fs'

const __dirname    = path.dirname(fileURLToPath(import.meta.url))
const AVATARS_DIR  = path.join(__dirname, '../../uploads/avatars')

const router = Router()

const MIME = {
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png':  'image/png',
  '.webp': 'image/webp',
}

// GET /api/avatars/:filename — public. Filenames are random UUIDs from the
// profile upload route, so they're not enumerable. No auth required so <img>
// tags work without credentials.
router.get('/:filename', (req, res) => {
  // path.basename guards against `..` path traversal
  const filename = path.basename(req.params.filename)
  const filePath = path.join(AVATARS_DIR, filename)
  if (!existsSync(filePath)) return res.status(404).send('Not found')

  const ext = path.extname(filename).toLowerCase()
  res.setHeader('Content-Type', MIME[ext] || 'application/octet-stream')
  res.setHeader('Cache-Control', 'public, max-age=86400')
  createReadStream(filePath).pipe(res)
})

export default router
