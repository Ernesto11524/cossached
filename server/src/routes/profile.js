import { Router } from 'express'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import multer from 'multer'
import path from 'path'
import { fileURLToPath } from 'url'
import { mkdirSync } from 'fs'
import { unlink } from 'fs/promises'
import { randomUUID } from 'crypto'
import { prisma } from '../lib/prisma.js'
import { requireAuth } from '../middleware/requireAuth.js'

const __dirname   = path.dirname(fileURLToPath(import.meta.url))
const AVATARS_DIR = path.join(__dirname, '../../uploads/avatars')
mkdirSync(AVATARS_DIR, { recursive: true })

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
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

const avatarStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, AVATARS_DIR),
  filename:    (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase()
    cb(null, `${randomUUID()}${ext || '.jpg'}`)
  },
})

const avatarUpload = multer({
  storage:    avatarStorage,
  limits:     { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (_req, file, cb) => cb(null, ALLOWED_IMAGE_TYPES.has(file.mimetype)),
})

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
    await unlink(path.join(AVATARS_DIR, current.avatarFilename)).catch(() => {})
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
    await unlink(path.join(AVATARS_DIR, current.avatarFilename)).catch(() => {})
  }

  res.json({ user })
})

export default router
