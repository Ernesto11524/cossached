import { Router } from 'express'
import jwt from 'jsonwebtoken'
import { z } from 'zod'
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server'
import { prisma } from '../lib/prisma.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { loginLimiter } from '../middleware/rateLimiter.js'

const router = Router()

const RP_ID   = process.env.WEBAUTHN_RP_ID   || 'localhost'
const RP_NAME = process.env.WEBAUTHN_RP_NAME || 'COSSA-CHED'
const ORIGINS = (process.env.WEBAUTHN_ORIGIN || 'http://localhost:5173,http://localhost:5174')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean)

function cookieOpts() {
  return {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge:   7 * 24 * 60 * 60 * 1000,
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

// Strip sensitive fields before returning user
const safeSelect = {
  id: true, staffId: true, email: true, name: true, role: true,
  department: true, position: true, phone: true, active: true,
  avatarFilename: true,
}

// ── Helper: convert a base64url string ↔ Buffer ──────────────────────────
const fromB64url = (s) => Buffer.from(s, 'base64url')
const toB64url   = (b) => Buffer.from(b).toString('base64url')

// ── REGISTRATION (authenticated) ──────────────────────────────────────────

// POST /api/webauthn/register-options
router.post('/register-options', requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({
    where:  { id: req.user.sub },
    include: { authenticators: true },
  })

  const options = await generateRegistrationOptions({
    rpName:                RP_NAME,
    rpID:                  RP_ID,
    userID:                Buffer.from(user.id),
    userName:              user.email,
    userDisplayName:       user.name,
    attestationType:       'none',
    excludeCredentials:    user.authenticators.map(a => ({
      id:         a.credentialId,
      transports: a.transports?.split(',').filter(Boolean) ?? undefined,
    })),
    authenticatorSelection: {
      // Force a discoverable credential so the user doesn't need to type
      // their Staff ID at sign-in time — the browser remembers them.
      residentKey:        'required',
      userVerification:   'preferred',
    },
  })

  await prisma.user.update({
    where: { id: user.id },
    data:  { currentChallenge: options.challenge },
  })

  res.json(options)
})

// POST /api/webauthn/register-verify
router.post('/register-verify', requireAuth, async (req, res) => {
  const schema = z.object({
    response:   z.any(), // raw response from @simplewebauthn/browser
    deviceName: z.string().max(100).optional(),
  })
  const parse = schema.safeParse(req.body)
  if (!parse.success) return res.status(400).json({ error: 'Invalid registration response.' })

  const user = await prisma.user.findUnique({ where: { id: req.user.sub } })
  if (!user?.currentChallenge) {
    return res.status(400).json({ error: 'No registration in progress. Try again.' })
  }

  try {
    const verification = await verifyRegistrationResponse({
      response:           parse.data.response,
      expectedChallenge:  user.currentChallenge,
      expectedOrigin:     ORIGINS,
      expectedRPID:       RP_ID,
    })

    if (!verification.verified || !verification.registrationInfo) {
      return res.status(400).json({ error: 'Registration could not be verified.' })
    }

    const info = verification.registrationInfo
    // Defensive: handle both v10 (credentialID/credentialPublicKey at top level)
    // and v11 (credential: { id, publicKey, ... }) shapes.
    const credentialIDRaw = info.credential?.id        ?? info.credentialID
    const credentialPKRaw = info.credential?.publicKey ?? info.credentialPublicKey
    const counterRaw      = info.credential?.counter   ?? info.counter ?? 0
    const sdkTransports   = info.credential?.transports
                         ?? parse.data.response?.response?.transports
                         ?? []

    if (!credentialIDRaw || !credentialPKRaw) {
      console.error('[webauthn] Unexpected registrationInfo shape:', Object.keys(info))
      return res.status(400).json({ error: 'Could not register this device (server SDK shape mismatch).' })
    }

    // Normalise credentialID to a base64url string for storage
    const credentialID = typeof credentialIDRaw === 'string'
      ? credentialIDRaw
      : Buffer.from(credentialIDRaw).toString('base64url')

    await prisma.authenticator.create({
      data: {
        userId:       user.id,
        credentialId: credentialID,
        publicKey:    Buffer.from(credentialPKRaw),
        counter:      BigInt(counterRaw),
        transports:   sdkTransports.join(',') || null,
        deviceName:   parse.data.deviceName || guessDeviceName(req),
      },
    })

    await prisma.user.update({
      where: { id: user.id },
      data:  { currentChallenge: null },
    })

    res.json({ ok: true })
  } catch (err) {
    console.error('[webauthn] register-verify error:', err.message)
    res.status(400).json({ error: 'Could not register this device. Please try again.' })
  }
})

// ── AUTHENTICATION (login) — public ───────────────────────────────────────

// POST /api/webauthn/discoverable-login-options
// No Staff ID required — the browser uses the on-device passkey to identify
// the user. The challenge is stashed in a short-lived httpOnly cookie so the
// subsequent verify call can validate against it.
router.post('/discoverable-login-options', loginLimiter, async (req, res) => {
  const options = await generateAuthenticationOptions({
    rpID:             RP_ID,
    userVerification: 'preferred',
    // allowCredentials omitted → browser offers any passkey for this site
  })

  res.cookie('webauthn_challenge', options.challenge, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge:   5 * 60 * 1000, // 5 minutes
    path:     '/',
  })

  res.json(options)
})

// POST /api/webauthn/login-options
router.post('/login-options', loginLimiter, async (req, res) => {
  const schema = z.object({ staffId: z.string().min(1) })
  const parse  = schema.safeParse(req.body)
  if (!parse.success) return res.status(400).json({ error: 'Staff ID required.' })

  const user = await prisma.user.findFirst({
    where: {
      OR:    [{ staffId: parse.data.staffId }, { email: parse.data.staffId }],
      active: true,
    },
    include: { authenticators: true },
  })

  if (!user || user.authenticators.length === 0) {
    return res.status(404).json({ error: 'No biometric login is set up for this account.' })
  }

  const options = await generateAuthenticationOptions({
    rpID:               RP_ID,
    userVerification:   'preferred',
    allowCredentials:   user.authenticators.map(a => ({
      id:         a.credentialId,
      transports: a.transports?.split(',').filter(Boolean) ?? undefined,
    })),
  })

  await prisma.user.update({
    where: { id: user.id },
    data:  { currentChallenge: options.challenge },
  })

  // Echo back a session hint so the verify call knows which user
  res.json({ options, userId: user.id })
})

// POST /api/webauthn/login-verify
//   - Staff-ID-first flow:  body = { userId, response }  → challenge from user.currentChallenge
//   - Discoverable flow:    body = { response }          → challenge from cookie, user from credential
router.post('/login-verify', loginLimiter, async (req, res) => {
  const schema = z.object({
    userId:   z.string().min(1).optional(),
    response: z.any(),
  })
  const parse = schema.safeParse(req.body)
  if (!parse.success) return res.status(400).json({ error: 'Invalid authentication response.' })

  let user
  let expectedChallenge

  if (parse.data.userId) {
    // Staff-ID-first flow (existing)
    user = await prisma.user.findUnique({
      where:   { id: parse.data.userId },
      include: { authenticators: true },
    })
    expectedChallenge = user?.currentChallenge
  } else {
    // Discoverable flow — identify the user from the userHandle in the response
    const userHandle = parse.data.response?.response?.userHandle
    if (!userHandle) {
      return res.status(400).json({ error: 'Authentication response is missing user information.' })
    }
    let userId
    try {
      userId = Buffer.from(userHandle, 'base64url').toString('utf8')
    } catch {
      return res.status(400).json({ error: 'Could not decode user information from the authenticator.' })
    }
    user = await prisma.user.findUnique({
      where:   { id: userId },
      include: { authenticators: true },
    })
    expectedChallenge = req.cookies?.webauthn_challenge
  }

  if (!user || !user.active) {
    return res.status(400).json({ error: 'Account not found or deactivated.' })
  }
  if (!expectedChallenge) {
    return res.status(400).json({ error: 'No active sign-in in progress. Please try again.' })
  }

  // Find the authenticator the browser used
  const credentialId = parse.data.response?.id
  const authenticator = user.authenticators.find(a => a.credentialId === credentialId)
  if (!authenticator) {
    return res.status(400).json({ error: 'Unknown authenticator.' })
  }

  try {
    const transports = authenticator.transports?.split(',').filter(Boolean) ?? undefined
    const credentialIDBuf = Buffer.from(authenticator.credentialId, 'base64url')

    const verification = await verifyAuthenticationResponse({
      response:          parse.data.response,
      expectedChallenge,
      expectedOrigin:    ORIGINS,
      expectedRPID:      RP_ID,
      // v10 SDK shape — pass via `authenticator`
      authenticator: {
        credentialID:        credentialIDBuf,
        credentialPublicKey: authenticator.publicKey,
        counter:             Number(authenticator.counter),
        transports,
      },
      // v11 SDK shape — also include `credential` so either version works
      credential: {
        id:         authenticator.credentialId,
        publicKey:  authenticator.publicKey,
        counter:    Number(authenticator.counter),
        transports,
      },
    })

    if (!verification.verified) {
      return res.status(401).json({ error: 'Biometric sign-in failed.' })
    }

    // Update counter to prevent replay attacks
    await prisma.authenticator.update({
      where: { id: authenticator.id },
      data:  { counter: BigInt(verification.authenticationInfo.newCounter) },
    })
    await prisma.user.update({
      where: { id: user.id },
      data:  { currentChallenge: null },
    })
    // Clear the transient discoverable challenge cookie if it was used
    res.clearCookie('webauthn_challenge', { path: '/' })

    // Issue JWT cookie
    const token = signToken(user)
    res.cookie('token', token, cookieOpts())

    // Return safe user
    const safeUser = await prisma.user.findUnique({
      where:  { id: user.id },
      select: safeSelect,
    })
    res.json({ user: safeUser })
  } catch (err) {
    console.error('[webauthn] login-verify error:', err.message)
    res.status(400).json({ error: 'Biometric sign-in could not be verified.' })
  }
})

// ── AUTHENTICATOR MANAGEMENT (authenticated) ──────────────────────────────

// GET /api/webauthn/authenticators
router.get('/authenticators', requireAuth, async (req, res) => {
  const list = await prisma.authenticator.findMany({
    where:   { userId: req.user.sub },
    select:  { id: true, deviceName: true, createdAt: true, transports: true },
    orderBy: { createdAt: 'desc' },
  })
  res.json({ authenticators: list })
})

// DELETE /api/webauthn/authenticators/:id
router.delete('/authenticators/:id', requireAuth, async (req, res) => {
  const auth = await prisma.authenticator.findUnique({ where: { id: req.params.id } })
  if (!auth || auth.userId !== req.user.sub) {
    return res.status(404).json({ error: 'Authenticator not found.' })
  }
  await prisma.authenticator.delete({ where: { id: req.params.id } })
  res.json({ ok: true })
})

// Best-effort device name from User-Agent
function guessDeviceName(req) {
  const ua = req.headers['user-agent'] || ''
  if (/Windows/i.test(ua))  return 'Windows device'
  if (/Mac OS|Macintosh/i.test(ua)) return 'Mac'
  if (/iPhone/i.test(ua))   return 'iPhone'
  if (/iPad/i.test(ua))     return 'iPad'
  if (/Android/i.test(ua))  return 'Android device'
  return 'Unknown device'
}

export default router
