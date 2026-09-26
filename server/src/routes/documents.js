import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { requireAdmin } from '../middleware/requireAdmin.js'
import { notifyAllActive } from '../lib/notifications.js'
import { single } from '../lib/uploads.js'
import { fileUrl, downloadUrl, removeFile } from '../lib/storage.js'

// Files live in Vercel Blob under documents/<key> (see lib/storage.js for the
// allowed types and the 100 MB limit — same list as before).
const upload = { single: (field) => single('documents', field) }

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

  // Auth was checked above — hand the browser off to the file on Blob storage
  res.setHeader('Cache-Control', 'private, no-store')
  res.redirect(302, fileUrl('documents', doc.filename))
})

// GET /api/documents/:id/download — forces download
router.get('/:id/download', async (req, res) => {
  const doc = await prisma.document.findUnique({ where: { id: req.params.id } })
  if (!doc) return res.status(404).json({ error: 'Document not found.' })

  res.setHeader('Cache-Control', 'private, no-store')
  res.redirect(302, downloadUrl('documents', doc.filename))
})

// DELETE /api/documents/:id (admin)
router.delete('/:id', requireAdmin, async (req, res) => {
  const doc = await prisma.document.findUnique({ where: { id: req.params.id } })
  if (!doc) return res.status(404).json({ error: 'Document not found.' })

  await removeFile('documents', doc.filename)
  await prisma.document.delete({ where: { id: req.params.id } })
  res.json({ ok: true })
})

export default router
