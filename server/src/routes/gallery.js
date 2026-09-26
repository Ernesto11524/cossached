import { Router } from 'express'
import { z } from 'zod'
import path from 'path'
import { prisma } from '../lib/prisma.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { requireAdmin } from '../middleware/requireAdmin.js'
import { array } from '../lib/uploads.js'
import { fileUrl, removeFile } from '../lib/storage.js'

// Files live in Vercel Blob under gallery/<key> (images + videos, 200 MB max).
const upload = { array: (field, max) => array('gallery', field, max) }

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

  res.setHeader('Cache-Control', 'private, max-age=300')
  res.redirect(302, fileUrl('gallery', item.mediaFilename))
})

// POST /api/gallery — upload one OR MANY files at once (admin).
// All uploaded files share the same title / caption / category / tags.
// If a title isn't given when uploading multiple files, each item uses its
// original filename (without extension) so they're individually findable.
router.post('/', requireAdmin, upload.array('media', 30), async (req, res) => {
  const files = req.files || []
  if (files.length === 0) return res.status(400).json({ error: 'At least one photo or video is required.' })

  const schema = z.object({
    title:    z.string().max(200).optional(),
    caption:  z.string().max(1000).optional(),
    category: z.string().max(100).optional(),
    tagIds:   z.string().optional(),
  })
  const parse = schema.safeParse(req.body)
  if (!parse.success) {
    // Tidy up any files already uploaded to storage
    await Promise.all(files.map(f => removeFile('gallery', f.filename)))
    return res.status(400).json({ error: parse.error.errors[0].message })
  }

  const tagIds = parse.data.tagIds
    ? parse.data.tagIds.split(',').map(s => s.trim()).filter(Boolean)
    : []
  const sharedTitle = parse.data.title?.trim() || null

  // Create one GalleryItem per uploaded file, all sharing the same metadata
  const created = []
  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    const fallbackTitle = path.basename(file.originalname, path.extname(file.originalname)) || `Item ${i + 1}`
    const title = sharedTitle
      ? (files.length > 1 ? `${sharedTitle} (${i + 1})` : sharedTitle)
      : fallbackTitle

    const item = await prisma.galleryItem.create({
      data: {
        title,
        caption:       parse.data.caption || null,
        category:      parse.data.category || null,
        mediaFilename: file.filename,
        mediaType:     classify(file.mimetype),
        uploadedById:  req.user.sub,
        tags: { create: tagIds.map(userId => ({ userId })) },
      },
      include: {
        uploadedBy: { select: { name: true } },
        tags: { include: { user: { select: { id: true, name: true, avatarFilename: true } } } },
      },
    })
    created.push(shape(item))
  }

  res.status(201).json({ items: created, count: created.length })
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

  await removeFile('gallery', item.mediaFilename)
  await prisma.galleryItem.delete({ where: { id: req.params.id } })
  res.json({ ok: true })
})

export default router
