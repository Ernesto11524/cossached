import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { requireAdmin } from '../middleware/requireAdmin.js'
import { notifyAllActive } from '../lib/notifications.js'

const router = Router()
router.use(requireAuth)

const schema = z.object({
  title:    z.string().min(1).max(300),
  body:     z.string().min(1).max(5000),
  category: z.string().min(1).max(50),
})

// GET /api/announcements?limit=N
router.get('/', async (req, res) => {
  const limit = req.query.limit ? Number(req.query.limit) : undefined
  const announcements = await prisma.announcement.findMany({
    orderBy: { createdAt: 'desc' },
    take:    limit,
    include: { author: { select: { name: true } } },
  })
  res.json({ announcements })
})

// POST /api/announcements (admin)
router.post('/', requireAdmin, async (req, res) => {
  const parse = schema.safeParse(req.body)
  if (!parse.success) return res.status(400).json({ error: 'Invalid announcement data.' })

  const ann = await prisma.announcement.create({
    data:    { ...parse.data, authorId: req.user.sub },
    include: { author: { select: { name: true } } },
  })

  // Notify every active member (admin who posted is excluded)
  notifyAllActive({
    exceptUserId: req.user.sub,
    type:         'announcement',
    title:        ann.title,
    body:         ann.body.length > 200 ? ann.body.slice(0, 200) + '…' : ann.body,
    link:         'announce',
    email:        ann.category === 'Urgent', // email-blast only on Urgent
  }).catch(() => {})

  res.status(201).json({ announcement: ann })
})

// DELETE /api/announcements/:id (admin)
router.delete('/:id', requireAdmin, async (req, res) => {
  await prisma.announcement.delete({ where: { id: req.params.id } })
  res.json({ ok: true })
})

export default router
