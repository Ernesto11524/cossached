import { Router } from 'express'
import { z } from 'zod'
import multer from 'multer'
import path from 'path'
import { fileURLToPath } from 'url'
import { randomUUID } from 'crypto'
import { createReadStream, existsSync, mkdirSync } from 'fs'
import { unlink } from 'fs/promises'
import { prisma } from '../lib/prisma.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { requireAdmin } from '../middleware/requireAdmin.js'

const __dirname    = path.dirname(fileURLToPath(import.meta.url))
const GALLERY_DIR  = path.join(__dirname, '../../uploads/gallery')
mkdirSync(GALLERY_DIR, { recursive: true })

const ALLOWED = new Set([
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  'video/mp4', 'video/webm', 'video/quicktime',
])

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, GALLERY_DIR),
  filename:    (_req, file, cb)  => cb(null, `${randomUUID()}${path.extname(file.originalname)}`),
})
const upload = multer({
  storage,
  limits:     { fileSize: 200 * 1024 * 1024 }, // 200 MB videos OK
  fileFilter: (_req, file, cb) => cb(null, ALLOWED.has(file.mimetype)),
})

function classify(mimeType) {
  if (mimeType?.startsWith('image/')) return 'image'
  if (mimeType?.startsWith('video/')) return 'video'
  return 'image'
}

function shape(item) {
  return {
    ...item,
    mediaUrl: `/api/gallery/${item.id}/media`,
    tags: (item.tags || []).map(t => ({
      id:             t.user.id,
      name:           t.user.name,
      avatarFilename: t.user.avatarFilename,
    })),
  }
}

const router = Router()
router.use(requireAuth)

// GET /api/gallery?category=... — list (all auth users)
router.get('/', async (req, res) => {
  const category = req.query.category?.toString().trim() || undefined
  const items = await prisma.galleryItem.findMany({
    where:   category ? { category } : {},
    orderBy: { createdAt: 'desc' },
    include: {
      uploadedBy: { select: { name: true } },
      tags: { include: { user: { select: { id: true, name: true, avatarFilename: true } } } },
    },
  })
  res.json({ items: items.map(shape) })
})

// GET /api/gallery/:id — single
router.get('/:id', async (req, res) => {
  const item = await prisma.galleryItem.findUnique({
    where: { id: req.params.id },
    include: {
      uploadedBy: { select: { name: true } },
      tags: { include: { user: { select: { id: true, name: true, avatarFilename: true } } } },
    },
  })
  if (!item) return res.status(404).json({ error: 'Item not found.' })
  res.json({ item: shape(item) })
})

// GET /api/gallery/:id/media — serve the file inline
router.get('/:id/media', async (req, res) => {
  const item = await prisma.galleryItem.findUnique({
    where:  { id: req.params.id },
    select: { mediaFilename: true, mediaType: true },
  })
  if (!item) return res.status(404).end()

  const filePath = path.join(GALLERY_DIR, item.mediaFilename)
  if (!existsSync(filePath)) return res.status(404).end()

  const ext = path.extname(item.mediaFilename).toLowerCase()
  const mimeByExt = {
    '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
    '.webp': 'image/webp', '.gif': 'image/gif',
    '.mp4': 'video/mp4', '.webm': 'video/webm', '.mov': 'video/quicktime',
  }
  res.setHeader('Content-Type', mimeByExt[ext] || 'application/octet-stream')
  res.setHeader('Content-Disposition', 'inline')
  createReadStream(filePath).pipe(res)
})

// POST /api/gallery — upload + create (admin)
router.post('/', requireAdmin, upload.single('media'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'A photo or video is required.' })

  const schema = z.object({
    title:    z.string().min(1).max(200),
    caption:  z.string().max(1000).optional(),
    category: z.string().max(100).optional(),
    tagIds:   z.string().optional(), // comma-separated user ids
  })
  const parse = schema.safeParse(req.body)
  if (!parse.success) {
    await unlink(path.join(GALLERY_DIR, req.file.filename)).catch(() => {})
    return res.status(400).json({ error: parse.error.errors[0].message })
  }

  const tagIds = parse.data.tagIds
    ? parse.data.tagIds.split(',').map(s => s.trim()).filter(Boolean)
    : []

  const item = await prisma.galleryItem.create({
    data: {
      title:         parse.data.title,
      caption:       parse.data.caption || null,
      category:      parse.data.category || null,
      mediaFilename: req.file.filename,
      mediaType:     classify(req.file.mimetype),
      uploadedById:  req.user.sub,
      tags: {
        create: tagIds.map(userId => ({ userId })),
      },
    },
    include: {
      uploadedBy: { select: { name: true } },
      tags: { include: { user: { select: { id: true, name: true, avatarFilename: true } } } },
    },
  })

  res.status(201).json({ item: shape(item) })
})

// PATCH /api/gallery/:id — update title/caption/category/tags (admin)
router.patch('/:id', requireAdmin, async (req, res) => {
  const schema = z.object({
    title:    z.string().min(1).max(200).optional(),
    caption:  z.string().max(1000).nullable().optional(),
    category: z.string().max(100).nullable().optional(),
    tagIds:   z.array(z.string()).optional(),
  })
  const parse = schema.safeParse(req.body)
  if (!parse.success) return res.status(400).json({ error: parse.error.errors[0].message })

  const { tagIds, ...rest } = parse.data

  if (tagIds) {
    await prisma.galleryTag.deleteMany({ where: { galleryItemId: req.params.id } })
    await prisma.galleryTag.createMany({
      data: tagIds.map(userId => ({ galleryItemId: req.params.id, userId })),
      skipDuplicates: true,
    })
  }

  const item = await prisma.galleryItem.update({
    where: { id: req.params.id },
    data:  rest,
    include: {
      uploadedBy: { select: { name: true } },
      tags: { include: { user: { select: { id: true, name: true, avatarFilename: true } } } },
    },
  })

  res.json({ item: shape(item) })
})

// DELETE /api/gallery/:id (admin)
router.delete('/:id', requireAdmin, async (req, res) => {
  const item = await prisma.galleryItem.findUnique({ where: { id: req.params.id } })
  if (!item) return res.status(404).json({ error: 'Item not found.' })

  await unlink(path.join(GALLERY_DIR, item.mediaFilename)).catch(() => {})
  await prisma.galleryItem.delete({ where: { id: req.params.id } })
  res.json({ ok: true })
})

export default router
