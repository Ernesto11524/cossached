import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { requireAdmin } from '../middleware/requireAdmin.js'
import { notify, notifyAllActive } from '../lib/notifications.js'

const router = Router()
router.use(requireAuth)

// POST /api/welfare — member submits a request
router.post('/', async (req, res) => {
  const schema = z.object({
    type:        z.string().min(1).max(100),
    description: z.string().min(10, 'Please provide more detail.').max(2000),
    amountGhs:   z.number().positive().optional(),
  })
  const parse = schema.safeParse(req.body)
  if (!parse.success) return res.status(400).json({ error: parse.error.errors[0].message })

  const request = await prisma.welfareRequest.create({
    data: { ...parse.data, memberId: req.user.sub },
    include: { member: { select: { name: true } } },
  })

  // Notify admins (only admins + the requester ever see welfare requests)
  const admins = await prisma.user.findMany({ where: { role: 'ADMIN', active: true }, select: { id: true } })
  await Promise.all(admins.map(a => notify({
    userId: a.id,
    type:   'welfare',
    title:  'New welfare request',
    body:   `${request.member.name} submitted a ${request.type} request.`,
    link:   'welfare',
    email:  true,
  })))

  res.status(201).json({ request })
})

// GET /api/welfare/mine — member views their own requests
router.get('/mine', async (req, res) => {
  const requests = await prisma.welfareRequest.findMany({
    where:   { memberId: req.user.sub },
    orderBy: { createdAt: 'desc' },
  })
  res.json({ requests })
})

// GET /api/welfare — admin only
router.get('/', requireAdmin, async (req, res) => {
  const requests = await prisma.welfareRequest.findMany({
    orderBy: { createdAt: 'desc' },
    include: { member: { select: { name: true, staffId: true, department: true } } },
  })
  res.json({ requests })
})

// PATCH /api/welfare/:id — admin reviews
router.patch('/:id', requireAdmin, async (req, res) => {
  const schema = z.object({
    status:     z.enum(['PENDING', 'APPROVED', 'DISBURSED', 'REJECTED']),
    reviewNote: z.string().max(500).optional(),
  })
  const parse = schema.safeParse(req.body)
  if (!parse.success) return res.status(400).json({ error: 'Invalid status.' })

  const updated = await prisma.welfareRequest.update({
    where: { id: req.params.id },
    data:  parse.data,
    include: { member: { select: { id: true } } },
  })

  // Notify the requester
  await notify({
    userId: updated.member.id,
    type:   'welfare',
    title:  `Your welfare request was ${parse.data.status.toLowerCase()}`,
    body:   `${updated.type} request — status updated to ${parse.data.status}.`,
    link:   'welfare',
    email:  true,
  })

  res.json({ request: updated })
})

export default router
