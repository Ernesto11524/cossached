import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { loginLimiter } from '../middleware/rateLimiter.js'

const router = Router()

const loginSchema = z.object({
  staffId:  z.string().min(1, 'Staff ID is required'),
  password: z.string().min(1, 'Password is required'),
})

function cookieOpts() {
  return {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge:   7 * 24 * 60 * 60 * 1000, // 7 days
    path:     '/',
  }
}

function signToken(user) {
  return jwt.sign(
    { sub: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  )
}

// Strip passwordHash before sending user data to the client
function safeUser(user) {
  const { passwordHash, ...rest } = user
  return rest
}

// ── POST /api/auth/login ────────────────────────────────────────────────────
router.post('/login', loginLimiter, async (req, res) => {
  const parse = loginSchema.safeParse(req.body)
  if (!parse.success) {
    return res.status(400).json({ error: 'Staff ID and password are required.' })
  }

  const { staffId, password } = parse.data

  // Accept login by staffId OR email
  const user = await prisma.user.findFirst({
    where: {
      OR: [{ staffId }, { email: staffId }],
      active: true,
    },
  })

  // Use a constant-time comparison even on "not found" to prevent timing attacks
  const dummyHash = '$2b$12$invalidhashfortimingnormalization00000000000000000000'
  const passwordToCheck = user?.passwordHash ?? dummyHash
  const valid = await bcrypt.compare(password, passwordToCheck)

  if (!user || !valid) {
    return res.status(401).json({ error: 'Invalid Staff ID or password.' })
  }

  const token = signToken(user)
  res.cookie('token', token, cookieOpts())
  res.json({ user: safeUser(user) })
})

// ── POST /api/auth/logout ───────────────────────────────────────────────────
router.post('/logout', (_req, res) => {
  res.clearCookie('token', { path: '/' })
  res.json({ ok: true })
})

// ── GET /api/auth/me ────────────────────────────────────────────────────────
// Called on page load to rehydrate auth state from the httpOnly cookie
router.get('/me', requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.sub },
    select: {
      id: true, staffId: true, email: true, name: true,
      role: true, department: true, position: true,
      phone: true, active: true, avatarFilename: true,
    },
  })

  if (!user || !user.active) {
    res.clearCookie('token', { path: '/' })
    return res.status(401).json({ error: 'User not found or deactivated.' })
  }

  res.json({ user })
})

export default router
