import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { sendMail } from '../lib/mailer.js'
import { contactLimiter } from '../middleware/rateLimiter.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { requireAdmin } from '../middleware/requireAdmin.js'

const router = Router()

const contactSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName:  z.string().min(1).max(100),
  email:     z.string().email(),
  subject:   z.string().min(1).max(200),
  message:   z.string().min(10).max(5000),
})

// ── POST /api/contact — public ──────────────────────────────────────────
router.post('/', contactLimiter, async (req, res) => {
  const parse = contactSchema.safeParse(req.body)
  if (!parse.success) {
    return res.status(400).json({ error: 'Please fill in all fields correctly.' })
  }

  const { firstName, lastName, email, subject, message } = parse.data

  await prisma.contactMessage.create({
    data: { firstName, lastName, email, subject, message },
  })

  sendMail({
    to:      process.env.CONTACT_EMAIL_TO || 'cossa-ched@cocobod.gh',
    subject: `[COSSA-CHED Contact] ${subject} — from ${firstName} ${lastName}`,
    text:    `From: ${firstName} ${lastName} <${email}>\n\n${message}`,
    html:    `<p><strong>From:</strong> ${firstName} ${lastName} &lt;${email}&gt;</p>
              <p><strong>Subject:</strong> ${subject}</p>
              <hr>
              <p>${message.replace(/\n/g, '<br>')}</p>`,
  }).catch((err) => console.error('[mailer] Failed to send contact notification:', err))

  res.json({ ok: true })
})

// ── GET /api/contact/messages — admin only ──────────────────────────────
router.get('/messages', requireAuth, requireAdmin, async (req, res) => {
  const messages = await prisma.contactMessage.findMany({
    orderBy: { createdAt: 'desc' },
    take:    100,
  })
  res.json({ messages })
})

// ── DELETE /api/contact/messages/:id — admin only ───────────────────────
router.delete('/messages/:id', requireAuth, requireAdmin, async (req, res) => {
  await prisma.contactMessage.delete({ where: { id: req.params.id } })
  res.json({ ok: true })
})

export default router
