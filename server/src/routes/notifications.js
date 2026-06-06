import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { requireAuth } from '../middleware/requireAuth.js'

const router = Router()
router.use(requireAuth)

// GET /api/notifications?limit=20
router.get('/', async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 20, 100)
  const notifications = await prisma.notification.findMany({
    where:   { userId: req.user.sub },
    orderBy: { createdAt: 'desc' },
    take:    limit,
  })
  const unreadCount = await prisma.notification.count({
    where: { userId: req.user.sub, read: false },
  })
  res.json({ notifications, unreadCount })
})

// GET /api/notifications/unread-count
router.get('/unread-count', async (req, res) => {
  const unreadCount = await prisma.notification.count({
    where: { userId: req.user.sub, read: false },
  })
  res.json({ unreadCount })
})

// POST /api/notifications/:id/read
router.post('/:id/read', async (req, res) => {
  const n = await prisma.notification.findUnique({ where: { id: req.params.id } })
  if (!n || n.userId !== req.user.sub) return res.status(404).json({ error: 'Notification not found.' })
  await prisma.notification.update({ where: { id: req.params.id }, data: { read: true } })
  res.json({ ok: true })
})

// POST /api/notifications/read-all
router.post('/read-all', async (req, res) => {
  await prisma.notification.updateMany({
    where: { userId: req.user.sub, read: false },
    data:  { read: true },
  })
  res.json({ ok: true })
})

// DELETE /api/notifications/:id
router.delete('/:id', async (req, res) => {
  const n = await prisma.notification.findUnique({ where: { id: req.params.id } })
  if (!n || n.userId !== req.user.sub) return res.status(404).json({ error: 'Notification not found.' })
  await prisma.notification.delete({ where: { id: req.params.id } })
  res.json({ ok: true })
})

export default router
