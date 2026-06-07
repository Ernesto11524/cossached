import { Router } from 'express'
import { z } from 'zod'
import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import { prisma } from '../lib/prisma.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { requireAdmin } from '../middleware/requireAdmin.js'
import { notify } from '../lib/notifications.js'
import { sendMail } from '../lib/mailer.js'
import { sendSms }  from '../lib/sms.js'
import { syncMemberGroups } from '../lib/auto-groups.js'

// Generate a memorable but secure temp password: 5 chars · dash · 5 chars.
// Skips ambiguous characters (0/O, 1/I/l) so members can read it from email
// or SMS without confusion.
const PW_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
function generateTempPassword(length = 10) {
  let raw = ''
  for (let i = 0; i < length; i++) {
    raw += PW_CHARS[crypto.randomInt(0, PW_CHARS.length)]
  }
  const mid = Math.floor(length / 2)
  return raw.slice(0, mid) + '-' + raw.slice(mid)
}

function welcomeEmail(name, staffId, password, origin) {
  return {
    subject: '[COSSA-CHED] Your member account is ready',
    text: `Hello ${name},

Welcome to COSSA-CHED — the COSSA-CHED Senior Staff Association portal.

Your account has been created by the administrator. Here are your sign-in details:

  Staff ID:           ${staffId}
  Temporary Password: ${password}

Please log in at ${origin}/login and change your password immediately.

If you have any questions, contact the secretariat at cossa-ched@cocobod.gh or +233 30 266 1877.

— COSSA-CHED Secretariat`,
    html: `<p>Hello ${name},</p>
<p>Welcome to <strong>COSSA-CHED</strong> — the CHED Senior Staff Association portal.</p>
<p>Your account has been created by the administrator. Here are your sign-in details:</p>
<table style="border-collapse:collapse;margin:1rem 0;font-family:'Courier New',monospace;font-size:14px">
  <tr><td style="padding:6px 12px;background:#FAF5EC;border:1px solid #ddd"><strong>Staff ID</strong></td><td style="padding:6px 12px;background:#fff;border:1px solid #ddd">${staffId}</td></tr>
  <tr><td style="padding:6px 12px;background:#FAF5EC;border:1px solid #ddd"><strong>Temp Password</strong></td><td style="padding:6px 12px;background:#fff;border:1px solid #ddd"><strong style="color:#7A3A18">${password}</strong></td></tr>
</table>
<p><a href="${origin}/login" style="display:inline-block;background:#C9A84C;color:#1E0F08;padding:10px 22px;text-decoration:none;border-radius:4px;font-weight:600">Log in to the portal</a></p>
<p style="color:#666;font-size:13px">Please change your password immediately after first login.</p>
<hr>
<p style="color:#888;font-size:12px">Questions? Email <a href="mailto:cossa-ched@cocobod.gh">cossa-ched@cocobod.gh</a> or call +233 30 266 1877.</p>`,
  }
}

function welcomeSms(firstName, staffId, password, origin) {
  return `COSSA-CHED: Welcome ${firstName}. Login at ${origin}/login with Staff ID ${staffId} and temp password ${password}. Please change it on first login.`
}

const router = Router()
router.use(requireAuth)

// Keep in sync with client/src/data/regions.js
const GHANA_REGIONS = [
  'Greater Accra', 'Ashanti', 'Western', 'Western North', 'Central',
  'Eastern', 'Volta', 'Oti', 'Northern', 'Savannah',
  'North East', 'Upper East', 'Upper West', 'Bono', 'Bono East', 'Ahafo',
]

const POSITION_RANK = [
  'president',
  'vice',
  'secretary',
  'treasurer',
  'pro',
  'welfare',
  'organising secretary',
  'organizing secretary',
  'organiser',
  'organizer',
  'financial secretary',
  'assistant',
  'committee',
]

function positionRank(position) {
  const p = (position || '').toLowerCase()
  if (!p) return 999
  const ix = POSITION_RANK.findIndex(k => p.includes(k))
  return ix === -1 ? 999 : ix
}

const isPresident = (m) => {
  const p = (m.position || '').toLowerCase()
  return p.includes('president') && !p.includes('vice')
}

// Composite sort score so the directory feels right out of the box:
// National Execs (President first, then by rank) → Regional Execs (by region,
// then by rank within region) → everyone else alphabetically.
function memberSort(a, b) {
  const aNat = a.positionScope === 'NATIONAL'
  const bNat = b.positionScope === 'NATIONAL'
  const aReg = a.positionScope === 'REGIONAL'
  const bReg = b.positionScope === 'REGIONAL'

  // National block first
  if (aNat && !bNat) return -1
  if (bNat && !aNat) return  1

  if (aNat && bNat) {
    // President first
    if (isPresident(a) && !isPresident(b)) return -1
    if (isPresident(b) && !isPresident(a)) return  1
    return positionRank(a.position) - positionRank(b.position) || a.name.localeCompare(b.name)
  }

  // Regional block (after National)
  if (aReg && !bReg) return -1
  if (bReg && !aReg) return  1
  if (aReg && bReg) {
    const r = (a.region || '').localeCompare(b.region || '')
    if (r !== 0) return r
    return positionRank(a.position) - positionRank(b.position) || a.name.localeCompare(b.name)
  }

  // Everyone else
  return a.name.localeCompare(b.name)
}

// ── GET /api/members?search=...&scope=NATIONAL|REGIONAL&region=...&includeInactive=true
router.get('/', async (req, res) => {
  const search          = req.query.search?.toString().trim() ?? ''
  const includeInactive = req.query.includeInactive === 'true' && req.user.role === 'ADMIN'
  const scope           = ['NATIONAL', 'REGIONAL'].includes(req.query.scope) ? req.query.scope : null
  const region          = req.query.region?.toString().trim() || null

  const members = await prisma.user.findMany({
    where: {
      ...(includeInactive ? {} : { active: true }),
      ...(scope  ? { positionScope: scope } : {}),
      ...(region ? { region }              : {}),
      ...(search && {
        OR: [
          { name:       { contains: search, mode: 'insensitive' } },
          { department: { contains: search, mode: 'insensitive' } },
          { position:   { contains: search, mode: 'insensitive' } },
          { staffId:    { contains: search, mode: 'insensitive' } },
        ],
      }),
    },
    select: {
      id: true, staffId: true, email: true, name: true, role: true,
      department: true, position: true, positionScope: true, region: true,
      active: true, avatarFilename: true,
    },
  })

  res.json({ members: [...members].sort(memberSort) })
})

// ── POST /api/members — provision (admin) ──────────────────────────────────
// The admin no longer types a password. The server generates a secure temp
// password, emails + SMSes it to the new member, and also returns it in the
// response so the admin has it as a backup if email/SMS aren't delivered.
router.post('/', requireAdmin, async (req, res) => {
  const schema = z.object({
    staffId:       z.string().min(1).max(50),
    email:         z.string().email(),
    name:          z.string().min(1).max(200),
    department:    z.string().max(200).optional(),
    position:      z.string().max(200).optional(),
    positionScope: z.enum(['NATIONAL', 'REGIONAL']).optional().nullable(),
    region:        z.enum(GHANA_REGIONS).optional().nullable(),
    phone:         z.string().max(30).optional(),
    role:          z.enum(['MEMBER', 'ADMIN']).default('MEMBER'),
  })

  const parse = schema.safeParse(req.body)
  if (!parse.success) return res.status(400).json({ error: parse.error.errors[0].message })

  const data = { ...parse.data }
  if (!data.position) data.positionScope = null
  if (data.positionScope === 'REGIONAL' && !data.region) {
    return res.status(400).json({ error: 'A regional executive needs a region — please pick one.' })
  }

  // ── Generate temp password ──────────────────────────────────────────────
  const tempPassword = generateTempPassword()
  const passwordHash = await bcrypt.hash(tempPassword, 12)

  let user
  try {
    user = await prisma.user.create({
      data: { ...data, passwordHash },
      select: {
        id: true, staffId: true, email: true, name: true, role: true,
        department: true, position: true, positionScope: true, region: true,
        phone: true,
      },
    })
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(400).json({ error: 'A member with that Staff ID or email already exists.' })
    }
    throw err
  }

  // Auto-add to national + regional group chats (best effort)
  syncMemberGroups(user.id).catch(err => console.error('[members] auto-groups failed:', err.message))

  // ── Send welcome email + SMS (best effort — never blocks the response) ──
  const origin = process.env.CLIENT_ORIGIN?.split(',')[0]?.trim() || 'http://localhost:5173'
  const firstName = user.name.split(' ')[0]

  const { subject, text, html } = welcomeEmail(user.name, user.staffId, tempPassword, origin)
  sendMail({ to: user.email, subject, text, html })
    .catch(err => console.error('[members] welcome email failed:', err.message))

  if (user.phone) {
    sendSms({ to: user.phone, message: welcomeSms(firstName, user.staffId, tempPassword, origin) })
      .catch(err => console.error('[members] welcome SMS failed:', err.message))
  }

  // Surface the temp password to the admin so they can share it manually if
  // delivery fails. (The hash is what's stored — the cleartext is not persisted.)
  res.status(201).json({ user, tempPassword })
})

// ── PATCH /api/members/:id — admin edits a member
router.patch('/:id', requireAdmin, async (req, res) => {
  const schema = z.object({
    name:          z.string().min(1).max(200).optional(),
    email:         z.string().email().optional(),
    department:    z.string().max(200).optional().nullable(),
    position:      z.string().max(200).optional().nullable(),
    positionScope: z.enum(['NATIONAL', 'REGIONAL']).optional().nullable(),
    region:        z.enum(GHANA_REGIONS).optional().nullable(),
    phone:         z.string().max(30).optional().nullable(),
    role:          z.enum(['MEMBER', 'ADMIN']).optional(),
  })
  const parse = schema.safeParse(req.body)
  if (!parse.success) return res.status(400).json({ error: 'Invalid update.' })

  const data = { ...parse.data }
  // Clearing the position also clears the executive scope (but NOT the region —
  // region is now everyone's home/work region, independent of any office held).
  if (data.position === '' || data.position === null) {
    data.positionScope = null
  }

  const user = await prisma.user.update({
    where:  { id: req.params.id },
    data,
    select: {
      id: true, staffId: true, email: true, name: true, role: true,
      department: true, position: true, positionScope: true, region: true, active: true,
    },
  })

  // Re-sync group memberships in case role or region changed
  syncMemberGroups(user.id).catch(err => console.error('[members] auto-groups failed:', err.message))

  res.json({ user })
})

// ── POST /api/members/:id/reset-password — admin
router.post('/:id/reset-password', requireAdmin, async (req, res) => {
  const schema = z.object({
    newPassword: z.string().min(8, 'Password must be at least 8 characters.'),
  })
  const parse = schema.safeParse(req.body)
  if (!parse.success) return res.status(400).json({ error: parse.error.errors[0].message })

  const target = await prisma.user.findUnique({ where: { id: req.params.id } })
  if (!target) return res.status(404).json({ error: 'Member not found.' })

  await prisma.user.update({
    where: { id: req.params.id },
    data:  { passwordHash: await bcrypt.hash(parse.data.newPassword, 12) },
  })

  await notify({
    userId: target.id,
    type:   'system',
    title:  'Your password was reset by an administrator',
    body:   'If you did not expect this, please contact the secretariat immediately.',
    email:  true,
  })

  res.json({ ok: true })
})

// ── DELETE /api/members/:id — admin, HARD delete ─────────────────────────
// Refuses to delete a member who has authored content (announcements, news,
// events, documents, welfare requests, sent messages). In that case the admin
// should deactivate instead, which preserves audit history.
router.delete('/:id', requireAdmin, async (req, res) => {
  if (req.params.id === req.user.sub) {
    return res.status(400).json({ error: "You can't delete your own account." })
  }

  const target = await prisma.user.findUnique({ where: { id: req.params.id } })
  if (!target) return res.status(404).json({ error: 'Member not found.' })

  // Count anything that would be silently lost or block the delete
  const [announcements, news, events, documents, welfare, messages] = await Promise.all([
    prisma.announcement.count({   where: { authorId:    req.params.id } }),
    prisma.newsArticle.count({    where: { authorId:    req.params.id } }),
    prisma.event.count({          where: { createdById: req.params.id } }),
    prisma.document.count({       where: { uploadedById: req.params.id } }),
    prisma.welfareRequest.count({ where: { memberId:   req.params.id } }),
    prisma.message.count({        where: { senderId:   req.params.id } }),
  ])

  const blockers = []
  if (announcements) blockers.push(`${announcements} announcement${announcements === 1 ? '' : 's'}`)
  if (news)          blockers.push(`${news} news article${news === 1 ? '' : 's'}`)
  if (events)        blockers.push(`${events} event${events === 1 ? '' : 's'}`)
  if (documents)     blockers.push(`${documents} document${documents === 1 ? '' : 's'}`)
  if (welfare)       blockers.push(`${welfare} welfare request${welfare === 1 ? '' : 's'}`)
  if (messages)      blockers.push(`${messages} sent message${messages === 1 ? '' : 's'}`)

  if (blockers.length > 0) {
    return res.status(400).json({
      error: `${target.name} can't be deleted — they have ${blockers.join(', ')}. Use Deactivate instead to preserve this history.`,
    })
  }

  // Safe to delete. Notifications, ConversationParticipants, Authenticators,
  // and PasswordResetTokens cascade automatically via the schema.
  await prisma.user.delete({ where: { id: req.params.id } })
  res.json({ ok: true })
})

// ── PATCH /api/members/:id/deactivate
router.patch('/:id/deactivate', requireAdmin, async (req, res) => {
  await prisma.user.update({ where: { id: req.params.id }, data: { active: false } })
  res.json({ ok: true })
})

// ── PATCH /api/members/:id/activate
router.patch('/:id/activate', requireAdmin, async (req, res) => {
  await prisma.user.update({ where: { id: req.params.id }, data: { active: true } })
  res.json({ ok: true })
})

export default router
