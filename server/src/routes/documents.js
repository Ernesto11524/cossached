import { Router } from 'express'
import multer from 'multer'
import { randomUUID } from 'crypto'
import path from 'path'
import { fileURLToPath } from 'url'
import { createReadStream, existsSync, mkdirSync } from 'fs'
import { unlink } from 'fs/promises'
import { prisma } from '../lib/prisma.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { requireAdmin } from '../middleware/requireAdmin.js'
import { notifyAllActive } from '../lib/notifications.js'

const __dirname  = path.dirname(fileURLToPath(import.meta.url))
const UPLOADS_DIR = path.join(__dirname, '../../uploads')
mkdirSync(UPLOADS_DIR, { recursive: true })

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename:    (_req, file, cb)  => cb(null, `${randomUUID()}${path.extname(file.originalname)}`),
})

// Expanded: documents + images + videos + audio + zip
const ALLOWED_TYPES = new Set([
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
])

const upload = multer({
  storage,
  limits:     { fileSize: 100 * 1024 * 1024 }, // 100 MB — videos can be larger
  fileFilter: (_req, file, cb) => cb(null, ALLOWED_TYPES.has(file.mimetype)),
})

function classify(mimeType) {
  if (mimeType?.startsWith('image/')) return 'image'
  if (mimeType?.startsWith('video/')) return 'video'
  if (mimeType?.startsWith('audio/')) return 'audio'
  if (mimeType === 'application/pdf' ||
      mimeType?.includes('word')      ||
      mimeType?.includes('excel')     ||
      mimeType?.includes('powerpoint')||
      mimeType?.includes('officedocument') ||
      mimeType === 'text/plain'       ||
      mimeType === 'text/csv') return 'document'
  return 'other'
}

const router = Router()
router.use(requireAuth)

// GET /api/documents?mediaType=image|video|audio|document|other
router.get('/', async (req, res) => {
  const mediaType = ['image', 'video', 'audio', 'document', 'other'].includes(req.query.mediaType)
    ? req.query.mediaType
    : undefined

  const documents = await prisma.document.findMany({
    where:   mediaType ? { mediaType } : {},
    orderBy: { uploadedAt: 'desc' },
    include: { uploadedBy: { select: { name: true } } },
  })
  res.json({ documents })
})

// POST /api/documents (admin, multipart/form-data)
router.post('/', requireAdmin, upload.single('file'), async (req, res) => {
  if (!req.file)                  return res.status(400).json({ error: 'A file is required.' })
  if (!req.body.name?.trim())     return res.status(400).json({ error: 'Display name is required.' })
  if (!req.body.category?.trim()) return res.status(400).json({ error: 'Category is required.' })

  const mediaType = classify(req.file.mimetype)

  const doc = await prisma.document.create({
    data: {
      name:         req.body.name.trim(),
      filename:     req.file.filename,
      originalName: req.file.originalname,
      mimeType:     req.file.mimetype,
      mediaType,
      sizeBytes:    req.file.size,
      category:     req.body.category.trim(),
      uploadedById: req.user.sub,
    },
  })

  // Notify all active members
  notifyAllActive({
    exceptUserId: req.user.sub,
    type:         'resource',
    title:        `New ${mediaType} uploaded: ${doc.name}`,
    body:         `Category: ${doc.category}`,
    link:         'resources',
    email:        false,
  }).catch(() => {})

  res.status(201).json({ document: doc })
})

// GET /api/documents/:id/view — inline (for images/videos in browser)
router.get('/:id/view', async (req, res) => {
  const doc = await prisma.document.findUnique({ where: { id: req.params.id } })
  if (!doc) return res.status(404).json({ error: 'Document not found.' })

  const filePath = path.join(UPLOADS_DIR, doc.filename)
  if (!existsSync(filePath)) return res.status(404).json({ error: 'File missing from server.' })

  res.setHeader('Content-Type', doc.mimeType)
  res.setHeader('Content-Disposition', `inline; filename="${doc.originalName}"`)
  createReadStream(filePath).pipe(res)
})

// GET /api/documents/:id/download — forces download
router.get('/:id/download', async (req, res) => {
  const doc = await prisma.document.findUnique({ where: { id: req.params.id } })
  if (!doc) return res.status(404).json({ error: 'Document not found.' })

  const filePath = path.join(UPLOADS_DIR, doc.filename)
  if (!existsSync(filePath)) return res.status(404).json({ error: 'File missing from server.' })

  res.setHeader('Content-Disposition', `attachment; filename="${doc.originalName}"`)
  res.setHeader('Content-Type', doc.mimeType)
  createReadStream(filePath).pipe(res)
})

// DELETE /api/documents/:id (admin)
router.delete('/:id', requireAdmin, async (req, res) => {
  const doc = await prisma.document.findUnique({ where: { id: req.params.id } })
  if (!doc) return res.status(404).json({ error: 'Document not found.' })

  await unlink(path.join(UPLOADS_DIR, doc.filename)).catch(() => {})
  await prisma.document.delete({ where: { id: req.params.id } })
  res.json({ ok: true })
})

export default router
