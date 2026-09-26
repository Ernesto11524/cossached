import { Router } from 'express'
import path from 'path'
import { fileUrl } from '../lib/storage.js'

const router = Router()

// GET /api/avatars/:filename — public. Filenames are random UUIDs from the
// profile upload route, so they're not enumerable. No auth required so <img>
// tags work without credentials. The file itself lives on Vercel Blob.
router.get('/:filename', (req, res) => {
  // path.basename guards against `..` path traversal
  const filename = path.basename(req.params.filename)
  res.setHeader('Cache-Control', 'public, max-age=86400')
  res.redirect(302, fileUrl('avatars', filename))
})

export default router
