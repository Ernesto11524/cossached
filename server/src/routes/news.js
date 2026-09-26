import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { requireAdmin } from '../middleware/requireAdmin.js'
import { single, array } from '../lib/uploads.js'
import { fileUrl, removeFile } from '../lib/storage.js'

// Files live in Vercel Blob under news/<key> (images + videos, 100 MB max).
const upload = {
  single: (field)      => single('news', field),
  array:  (field, max) => array('news', field, max),
}
const unlinkNews = (filename) => removeFile('news', filename)

function classifyMedia(mimeType) {
  if (mimeType?.startsWith('image/')) return 'image'
  if (mimeType?.startsWith('video/')) return 'video'
  return null
}

function shape(article) {
  const extras = (article.mediaItems || [])
    .sort((a, b) => a.order - b.order)
    .map(m => ({ id: m.id, url: `/api/news/${article.id}/media/${m.id}`, type: m.mediaType }))

  const primary = article.mediaFilename
    ? [{ id: 'primary', url: `/api/news/${article.id}/media`, type: article.mediaType }]
    : []

  return {
    ...article,
    mediaUrl:   article.mediaFilename ? `/api/news/${article.id}/media` : article.imageUrl || null,
    mediaItems: [...primary, ...extras],
  }
}

const router = Router()

const fieldsSchema = z.object({
  title:      z.string().min(1).max(300),
  excerpt:    z.string().min(1).max(500),
  body:       z.string().min(1).max(20000),
  category:   z.string().min(1).max(50),
  department: z.string().max(200).optional().or(z.literal('')),
  imageUrl:   z.string().url().optional().or(z.literal('')),
})

// ── GET /api/news ── public ──────────────────────────────────────────────────
router.get('/', async (req, res) => {
  const limit = req.query.limit ? Number(req.query.limit) : undefined
  const articles = await prisma.newsArticle.findMany({
    orderBy: { publishedAt: 'desc' },
    take:    limit,
    include: { author: { select: { name: true } }, mediaItems: true },
  })
  res.json({ articles: articles.map(shape) })
})

// ── GET /api/news/:id ── public ──────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  const article = await prisma.newsArticle.findUnique({
    where:   { id: req.params.id },
    include: { author: { select: { name: true } }, mediaItems: true },
  })
  if (!article) return res.status(404).json({ error: 'Article not found.' })
  res.json({ article: shape(article) })
})

// ── GET /api/news/:id/media ── public (primary image) ───────────────────────
router.get('/:id/media', async (req, res) => {
  const article = await prisma.newsArticle.findUnique({
    where: { id: req.params.id },
    select: { mediaFilename: true },
  })
  if (!article?.mediaFilename) return res.status(404).json({ error: 'Media not found.' })
  serveFile(res, article.mediaFilename)
})

// ── GET /api/news/:id/media/:mediaId ── public (extra images) ───────────────
router.get('/:id/media/:mediaId', async (req, res) => {
  const item = await prisma.newsMedia.findFirst({
    where: { id: req.params.mediaId, articleId: req.params.id },
  })
  if (!item) return res.status(404).json({ error: 'Media not found.' })
  serveFile(res, item.filename)
})

// ── POST /api/news ── admin ──────────────────────────────────────────────────
router.post('/', requireAuth, requireAdmin, upload.single('media'), async (req, res) => {
  const parse = fieldsSchema.safeParse(req.body)
  if (!parse.success) return res.status(400).json({ error: parse.error.errors[0].message })

  const article = await prisma.newsArticle.create({
    data: {
      ...parse.data,
      imageUrl:      parse.data.imageUrl || null,
      mediaFilename: req.file?.filename || null,
      mediaType:     req.file ? classifyMedia(req.file.mimetype) : null,
      authorId:      req.user.sub,
    },
    include: { author: { select: { name: true } }, mediaItems: true },
  })
  res.status(201).json({ article: shape(article) })
})

// ── POST /api/news/:id/media ── admin (add extra images to an article) ───────
router.post('/:id/media', requireAuth, requireAdmin, upload.array('media', 20), async (req, res) => {
  const article = await prisma.newsArticle.findUnique({ where: { id: req.params.id } })
  if (!article) return res.status(404).json({ error: 'Article not found.' })
  if (!req.files?.length) return res.status(400).json({ error: 'No files uploaded.' })

  const existing = await prisma.newsMedia.count({ where: { articleId: req.params.id } })
  const items = await Promise.all(
    req.files.map((file, i) =>
      prisma.newsMedia.create({
        data: {
          articleId: req.params.id,
          filename:  file.filename,
          mediaType: classifyMedia(file.mimetype),
          order:     existing + i,
        },
      })
    )
  )
  res.status(201).json({ items })
})

// ── DELETE /api/news/:id/media/:mediaId ── admin ─────────────────────────────
router.delete('/:id/media/:mediaId', requireAuth, requireAdmin, async (req, res) => {
  const item = await prisma.newsMedia.findFirst({
    where: { id: req.params.mediaId, articleId: req.params.id },
  })
  if (!item) return res.status(404).json({ error: 'Media item not found.' })
  await unlinkNews(item.filename)
  await prisma.newsMedia.delete({ where: { id: req.params.mediaId } })
  res.json({ ok: true })
})

// ── PATCH /api/news/:id ── admin ─────────────────────────────────────────────
router.patch('/:id', requireAuth, requireAdmin, upload.single('media'), async (req, res) => {
  const parse = fieldsSchema.partial().safeParse(req.body)
  if (!parse.success) return res.status(400).json({ error: parse.error.errors[0].message })

  const existing = await prisma.newsArticle.findUnique({ where: { id: req.params.id } })
  if (!existing) return res.status(404).json({ error: 'Article not found.' })

  const data = { ...parse.data }
  if (data.imageUrl === '') data.imageUrl = null

  if (req.file) {
    data.mediaFilename = req.file.filename
    data.mediaType     = classifyMedia(req.file.mimetype)
    if (existing.mediaFilename) {
      await unlinkNews(existing.mediaFilename)
    }
  }

  if (req.body.removeMedia === 'true' && existing.mediaFilename) {
    await unlinkNews(existing.mediaFilename)
    data.mediaFilename = null
    data.mediaType     = null
  }

  const article = await prisma.newsArticle.update({
    where: { id: req.params.id },
    data,
    include: { author: { select: { name: true } }, mediaItems: true },
  })
  res.json({ article: shape(article) })
})

// ── DELETE /api/news/:id ── admin ────────────────────────────────────────────
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  const existing = await prisma.newsArticle.findUnique({
    where: { id: req.params.id },
    include: { mediaItems: true },
  })
  if (existing?.mediaFilename) {
    await unlinkNews(existing.mediaFilename)
  }
  for (const m of existing?.mediaItems || []) {
    await unlinkNews(m.filename)
  }
  await prisma.newsArticle.delete({ where: { id: req.params.id } })
  res.json({ ok: true })
})

// ── helper ───────────────────────────────────────────────────────────────────
function serveFile(res, filename) {
  // Public news media — redirect to the file on Blob storage (served from CDN)
  res.setHeader('Cache-Control', 'public, max-age=3600')
  res.redirect(302, fileUrl('news', filename))
}

export default router
