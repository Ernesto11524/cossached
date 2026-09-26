import { Router } from 'express'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { prisma } from '../lib/prisma.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { single } from '../lib/uploads.js'
import { removeFile } from '../lib/storage.js'

const router = Router()
router.use(requireAuth)

const SAFE_SELECT = {
  id: true, staffId: true, email: true, name: true,
  role: true, department: true, position: true, phone: true,
  active: true, avatarFilename: true,
}

// ── Profile edit ─────────────────────────────────────────────────────────
// Members can no longer self-edit name/dept/position/phone — only admins
// can change those (via /api/members/:id). Members only edit their avatar
// and password. This endpoint kept for compatibility but rejects member
// changes to administrative fields.
router.patch('/', async (req, res) => {
  // No fields are currently member-editable here. Future-proofed for
  // additions (e.g. notification preferences) by leaving the route in place.
  res.status(403).json({
    error: 'Profile details are managed by the administrator. To update your name, department, position, or phone number, contact the secretariat.',
  })
})

// ── Password change ──────────────────────────────────────────────────────
router.post('/change-password', async (req, res) => {
  const schema = z.object({
    currentPassword: z.string().min(1),
    newPassword:     z.string().min(8, 'New password must be at least 8 characters.'),
  })
  const parse = schema.safeParse(req.body)
  if (!parse.success) return res.status(400).json({ error: parse.error.errors[0].message })

  const user = await prisma.user.findUnique({ where: { id: req.user.sub } })
  const valid = await bcrypt.compare(parse.data.currentPassword, user.passwordHash)
  if (!valid) return res.status(401).json({ error: 'Current password is incorrect.' })

  await prisma.user.update({
    where: { id: req.user.sub },
    data:  { passwordHash: await bcrypt.hash(parse.data.newPassword, 12) },
  })
  res.json({ ok: true })
})

// ── Avatar upload ────────────────────────────────────────────────────────
// Stored in Vercel Blob under avatars/<key> — JPEG/PNG/WebP, 5 MB max
const avatarUpload = { single: (field) => single('avatars', field) }

router.post('/avatar', avatarUpload.single('avatar'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'A valid image file (JPEG/PNG/WebP) is required.' })

  const current = await prisma.user.findUnique({
    where:  { id: req.user.sub },
    select: { avatarFilename: true },
  })

  const user = await prisma.user.update({
    where:  { id: req.user.sub },
    data:   { avatarFilename: req.file.filename },
    select: SAFE_SELECT,
  })

  if (current?.avatarFilename) {
    await removeFile('avatars', current.avatarFilename)
  }

  res.json({ user })
})

router.delete('/avatar', async (req, res) => {
  const current = await prisma.user.findUnique({
    where:  { id: req.user.sub },
    select: { avatarFilename: true },
  })

  const user = await prisma.user.update({
    where:  { id: req.user.sub },
    data:   { avatarFilename: null },
    select: SAFE_SELECT,
  })

  if (current?.avatarFilename) {
    await removeFile('avatars', current.avatarFilename)
  }

  res.json({ user })
})

export default router
