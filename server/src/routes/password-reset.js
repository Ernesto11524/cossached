import { Router } from 'express'
import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { sendMail } from '../lib/mailer.js'
import { loginLimiter } from '../middleware/rateLimiter.js'

const router = Router()

const TOKEN_TTL_MIN = 30 // minutes

function hashToken(raw) {
  return crypto.createHash('sha256').update(raw).digest('hex')
}

// ── POST /api/password-reset/request ──────────────────────────────────────
// Public. Always returns 200 even if the staffId/email isn't found
// (so attackers can't enumerate accounts).
router.post('/request', loginLimiter, async (req, res) => {
  const schema = z.object({ staffIdOrEmail: z.string().min(1) })
  const parse  = schema.safeParse(req.body)
  if (!parse.success) return res.status(400).json({ error: 'Staff ID or email is required.' })

  const input = parse.data.staffIdOrEmail.trim()
  const user = await prisma.user.findFirst({
    where: { OR: [{ staffId: input }, { email: input }], active: true },
  })

  // Generic success response either way
  const okMessage = {
    ok: true,
    message: 'If an account matches that Staff ID or email, a password reset link has been sent.',
  }

  if (!user) {
    return res.json(okMessage)
  }

  // Generate a single-use token (raw token goes in the URL; only the hash is stored)
  const rawToken = crypto.randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MIN * 60 * 1000)

  await prisma.passwordResetToken.create({
    data: {
      userId:    user.id,
      tokenHash: hashToken(rawToken),
      expiresAt,
    },
  })

  // Send the email (uses the configured SMTP; logs only if SMTP is not set up)
  const origin = process.env.CLIENT_ORIGIN?.split(',')[0]?.trim() || 'http://localhost:5173'
  const resetUrl = `${origin}/reset-password?token=${rawToken}`

  sendMail({
    to:      user.email,
    subject: '[COSSA-CHED] Reset your password',
    text:    `Hello ${user.name},\n\nA password reset was requested for your COSSA-CHED account.\n\nClick the link below to set a new password. The link is valid for ${TOKEN_TTL_MIN} minutes.\n\n${resetUrl}\n\nIf you didn't request this, you can safely ignore this email.\n\n— COSSA-CHED Secretariat`,
    html:    `<p>Hello ${user.name},</p>
              <p>A password reset was requested for your COSSA-CHED account.</p>
              <p><a href="${resetUrl}" style="display:inline-block;background:#C9A84C;color:#1E0F08;padding:10px 20px;text-decoration:none;border-radius:4px;font-weight:600">Reset password</a></p>
              <p style="color:#666;font-size:13px">Or paste this link into your browser:<br><span style="font-family:monospace">${resetUrl}</span></p>
              <p style="color:#888;font-size:12px">The link is valid for ${TOKEN_TTL_MIN} minutes.</p>
              <p style="color:#888;font-size:12px">If you didn't request this, you can safely ignore this email.</p>
              <hr>
              <p style="color:#888;font-size:11px">— COSSA-CHED Secretariat</p>`,
  }).catch(err => console.error('[password-reset] mail failed:', err.message))

  // In development with no SMTP, surface the link in the server log
  if (!process.env.SMTP_HOST) {
    console.log(`\n[password-reset] Token for ${user.email} (${user.staffId}):\n${resetUrl}\n`)
  }

  res.json(okMessage)
})

// ── POST /api/password-reset/confirm ──────────────────────────────────────
router.post('/confirm', loginLimiter, async (req, res) => {
  const schema = z.object({
    token:       z.string().min(20),
    newPassword: z.string().min(8, 'Password must be at least 8 characters.'),
  })
  const parse = schema.safeParse(req.body)
  if (!parse.success) return res.status(400).json({ error: parse.error.errors[0].message })

  const tokenHash = hashToken(parse.data.token)
  const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash } })

  if (!record || record.used || record.expiresAt < new Date()) {
    return res.status(400).json({ error: 'This reset link is invalid or has expired. Request a new one.' })
  }

  const passwordHash = await bcrypt.hash(parse.data.newPassword, 12)

  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
    prisma.passwordResetToken.update({ where: { id: record.id }, data: { used: true } }),
    // Invalidate any other outstanding tokens for this user
    prisma.passwordResetToken.updateMany({
      where: { userId: record.userId, used: false, id: { not: record.id } },
      data:  { used: true },
    }),
  ])

  res.json({ ok: true })
})

export default router
