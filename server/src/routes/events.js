import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { requireAdmin } from '../middleware/requireAdmin.js'
import { notifyAllActive } from '../lib/notifications.js'

const router = Router()
router.use(requireAuth)

// GET /api/events?limit=N
router.get('/', async (req, res) => {
  const limit = req.query.limit ? Number(req.query.limit) : undefined
  const events = await prisma.event.findMany({
    orderBy: { eventDate: 'asc' },
    take:    limit,
    include: { createdBy: { select: { name: true } } },
  })
  res.json({ events })
})

// POST /api/events (admin)
router.post('/', requireAdmin, async (req, res) => {
  const schema = z.object({
    title:     z.string().min(1).max(300),
    location:  z.string().min(1).max(300),
    eventDate: z.string().datetime({ message: 'Valid date-time required.' }),
    type:      z.string().min(1).max(50),
  })
  const parse = schema.safeParse(req.body)
  if (!parse.success) return res.status(400).json({ error: parse.error.errors[0].message })

  const event = await prisma.event.create({
    data:    { ...parse.data, eventDate: new Date(parse.data.eventDate), createdById: req.user.sub },
    include: { createdBy: { select: { name: true } } },
  })

  const when = new Date(event.eventDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  notifyAllActive({
    exceptUserId: req.user.sub,
    type:         'event',
    title:        `New event: ${event.title}`,
    body:         `${when} · ${event.location}`,
    link:         'events',
    email:        false,
  }).catch(() => {})

  res.status(201).json({ event })
})

// DELETE /api/events/:id (admin)
router.delete('/:id', requireAdmin, async (req, res) => {
  await prisma.event.delete({ where: { id: req.params.id } })
  res.json({ ok: true })
})

export default router
