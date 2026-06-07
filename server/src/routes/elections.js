import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { requireAdmin } from '../middleware/requireAdmin.js'
import { notifyAllActive } from '../lib/notifications.js'
import { GHANA_REGIONS } from '../lib/auto-groups.js'

const router = Router()
router.use(requireAuth)

// ── Helpers ──────────────────────────────────────────────────────────────

function statusOf(election, now = new Date()) {
  if (now < election.startsAt) return 'SCHEDULED'
  if (now > election.endsAt)   return 'CLOSED'
  return 'OPEN'
}

function isEligible(user, election) {
  if (election.scope === 'NATIONAL') return true
  if (election.scope === 'REGIONAL') return user.region === election.region
  return false
}

async function loadElection(id) {
  return prisma.election.findUnique({
    where:   { id },
    include: {
      positions: {
        orderBy: { order: 'asc' },
        include: { candidates: { orderBy: { order: 'asc' } } },
      },
    },
  })
}

function shape(election, viewer, hasVoted) {
  const status = statusOf(election)
  return {
    id:            election.id,
    title:         election.title,
    description:   election.description,
    scope:         election.scope,
    region:        election.region,
    startsAt:      election.startsAt,
    endsAt:        election.endsAt,
    resultsPublic: election.resultsPublic,
    status,
    positions:     election.positions,
    eligible:      isEligible(viewer, election),
    hasVoted,
  }
}

// ── LIST elections ────────────────────────────────────────────────────────
// Members see only the ones they're eligible for OR past ones with results
// public. Admins see everything.
router.get('/', async (req, res) => {
  const viewer = await prisma.user.findUnique({
    where:  { id: req.user.sub },
    select: { id: true, region: true, role: true },
  })
  const isAdmin = viewer.role === 'ADMIN'

  const elections = await prisma.election.findMany({
    orderBy: { startsAt: 'desc' },
    include: {
      positions: {
        orderBy: { order: 'asc' },
        include: { candidates: { orderBy: { order: 'asc' } } },
      },
    },
  })

  const myReceipts = await prisma.ballotReceipt.findMany({
    where:   { voterId: viewer.id },
    select:  { electionId: true },
  })
  const votedSet = new Set(myReceipts.map(r => r.electionId))

  const out = []
  for (const e of elections) {
    const shaped = shape(e, viewer, votedSet.has(e.id))
    if (isAdmin) {
      out.push(shaped)
      continue
    }
    // Non-admin filter:
    //   - eligible AND open / scheduled  → show (to vote)
    //   - eligible AND past + voted      → show (can see results if public)
    //   - past + results public          → show even if they didn't vote
    if (shaped.status === 'OPEN' && shaped.eligible)        out.push(shaped)
    else if (shaped.status === 'SCHEDULED' && shaped.eligible) out.push(shaped)
    else if (shaped.status === 'CLOSED' && (e.resultsPublic || shaped.eligible)) out.push(shaped)
  }

  res.json({ elections: out })
})

// ── DETAIL ────────────────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  const election = await loadElection(req.params.id)
  if (!election) return res.status(404).json({ error: 'Election not found.' })

  const viewer = await prisma.user.findUnique({
    where:  { id: req.user.sub },
    select: { id: true, region: true, role: true },
  })
  const receipt = await prisma.ballotReceipt.findUnique({
    where: { electionId_voterId: { electionId: election.id, voterId: viewer.id } },
  })

  res.json({ election: shape(election, viewer, !!receipt) })
})

// ── CREATE (admin) ────────────────────────────────────────────────────────
router.post('/', requireAdmin, async (req, res) => {
  const schema = z.object({
    title:       z.string().min(1).max(300),
    description: z.string().max(2000).optional(),
    scope:       z.enum(['NATIONAL', 'REGIONAL']),
    region:      z.enum(GHANA_REGIONS).optional().nullable(),
    startsAt:    z.string().datetime(),
    endsAt:      z.string().datetime(),
  })
  const parse = schema.safeParse(req.body)
  if (!parse.success) return res.status(400).json({ error: parse.error.errors[0].message })

  const data = parse.data
  if (data.scope === 'REGIONAL' && !data.region) {
    return res.status(400).json({ error: 'A regional election needs a region.' })
  }
  if (data.scope === 'NATIONAL') data.region = null
  if (new Date(data.endsAt) <= new Date(data.startsAt)) {
    return res.status(400).json({ error: 'End time must be after start time.' })
  }

  const election = await prisma.election.create({
    data: {
      title:       data.title,
      description: data.description || null,
      scope:       data.scope,
      region:      data.region,
      startsAt:    new Date(data.startsAt),
      endsAt:      new Date(data.endsAt),
      createdById: req.user.sub,
    },
    include: { positions: { include: { candidates: true } } },
  })
  res.status(201).json({ election })
})

// ── UPDATE election metadata (admin) ──────────────────────────────────────
router.patch('/:id', requireAdmin, async (req, res) => {
  const schema = z.object({
    title:       z.string().min(1).max(300).optional(),
    description: z.string().max(2000).nullable().optional(),
    startsAt:    z.string().datetime().optional(),
    endsAt:      z.string().datetime().optional(),
  })
  const parse = schema.safeParse(req.body)
  if (!parse.success) return res.status(400).json({ error: parse.error.errors[0].message })

  const existing = await prisma.election.findUnique({ where: { id: req.params.id } })
  if (!existing) return res.status(404).json({ error: 'Election not found.' })

  const startsAt = parse.data.startsAt ? new Date(parse.data.startsAt) : existing.startsAt
  const endsAt   = parse.data.endsAt   ? new Date(parse.data.endsAt)   : existing.endsAt
  if (endsAt <= startsAt) {
    return res.status(400).json({ error: 'End time must be after start time.' })
  }

  // Lock scope and positions once voting has started
  const hasVotes = await prisma.ballotReceipt.count({ where: { electionId: existing.id } })
  if (hasVotes > 0 && parse.data.startsAt) {
    return res.status(400).json({ error: "Voting has started — you can't change the start time, only the end time." })
  }

  const election = await prisma.election.update({
    where: { id: existing.id },
    data: {
      ...(parse.data.title       !== undefined && { title:       parse.data.title }),
      ...(parse.data.description !== undefined && { description: parse.data.description }),
      ...(parse.data.startsAt    && { startsAt }),
      ...(parse.data.endsAt      && { endsAt }),
    },
  })
  res.json({ election })
})

// ── EXTEND end time only (admin) ──────────────────────────────────────────
router.post('/:id/extend', requireAdmin, async (req, res) => {
  const schema = z.object({ endsAt: z.string().datetime() })
  const parse  = schema.safeParse(req.body)
  if (!parse.success) return res.status(400).json({ error: 'A new end time is required.' })

  const existing = await prisma.election.findUnique({ where: { id: req.params.id } })
  if (!existing) return res.status(404).json({ error: 'Election not found.' })

  const newEnd = new Date(parse.data.endsAt)
  if (newEnd <= existing.startsAt) {
    return res.status(400).json({ error: 'End time must be after start time.' })
  }

  const election = await prisma.election.update({
    where: { id: req.params.id },
    data:  { endsAt: newEnd },
  })
  res.json({ election })
})

// ── DELETE (admin, only if no votes cast) ─────────────────────────────────
router.delete('/:id', requireAdmin, async (req, res) => {
  const hasVotes = await prisma.ballotReceipt.count({ where: { electionId: req.params.id } })
  if (hasVotes > 0) {
    return res.status(400).json({ error: "Can't delete an election that has votes. Close it instead." })
  }
  await prisma.election.delete({ where: { id: req.params.id } })
  res.json({ ok: true })
})

// ── TOGGLE results publicity (admin) ──────────────────────────────────────
router.post('/:id/publish-results', requireAdmin, async (req, res) => {
  const schema = z.object({ resultsPublic: z.boolean() })
  const parse  = schema.safeParse(req.body)
  if (!parse.success) return res.status(400).json({ error: 'resultsPublic must be true or false.' })

  const election = await prisma.election.update({
    where: { id: req.params.id },
    data:  { resultsPublic: parse.data.resultsPublic },
  })
  res.json({ election })
})

// ── POSITIONS (admin) ─────────────────────────────────────────────────────
router.post('/:id/positions', requireAdmin, async (req, res) => {
  const schema = z.object({ title: z.string().min(1).max(200) })
  const parse  = schema.safeParse(req.body)
  if (!parse.success) return res.status(400).json({ error: 'Position title is required.' })

  const election = await prisma.election.findUnique({
    where:   { id: req.params.id },
    include: { positions: true },
  })
  if (!election) return res.status(404).json({ error: 'Election not found.' })

  // Block editing positions once voting has started
  const hasVotes = await prisma.ballotReceipt.count({ where: { electionId: election.id } })
  if (hasVotes > 0) {
    return res.status(400).json({ error: "Voting has started — positions are now locked." })
  }

  const order = election.positions.length
  const pos = await prisma.electionPosition.create({
    data: { electionId: election.id, title: parse.data.title.trim(), order },
    include: { candidates: true },
  })
  res.status(201).json({ position: pos })
})

router.delete('/positions/:id', requireAdmin, async (req, res) => {
  const position = await prisma.electionPosition.findUnique({ where: { id: req.params.id } })
  if (!position) return res.status(404).json({ error: 'Position not found.' })

  const hasVotes = await prisma.ballotReceipt.count({ where: { electionId: position.electionId } })
  if (hasVotes > 0) {
    return res.status(400).json({ error: "Voting has started — positions are now locked." })
  }

  await prisma.electionPosition.delete({ where: { id: req.params.id } })
  res.json({ ok: true })
})

// ── CANDIDATES (admin) ────────────────────────────────────────────────────
router.post('/positions/:id/candidates', requireAdmin, async (req, res) => {
  const schema = z.object({
    name:   z.string().min(1).max(200),
    bio:    z.string().max(1000).optional().nullable(),
    userId: z.string().optional().nullable(),
  })
  const parse = schema.safeParse(req.body)
  if (!parse.success) return res.status(400).json({ error: parse.error.errors[0].message })

  const position = await prisma.electionPosition.findUnique({
    where:   { id: req.params.id },
    include: { candidates: true },
  })
  if (!position) return res.status(404).json({ error: 'Position not found.' })

  const hasVotes = await prisma.ballotReceipt.count({ where: { electionId: position.electionId } })
  if (hasVotes > 0) {
    return res.status(400).json({ error: "Voting has started — candidates are now locked." })
  }

  const order = position.candidates.length
  const candidate = await prisma.candidate.create({
    data: {
      positionId: position.id,
      name:       parse.data.name.trim(),
      bio:        parse.data.bio || null,
      userId:     parse.data.userId || null,
      order,
    },
  })
  res.status(201).json({ candidate })
})

router.delete('/candidates/:id', requireAdmin, async (req, res) => {
  const candidate = await prisma.candidate.findUnique({
    where: { id: req.params.id },
    include: { position: true },
  })
  if (!candidate) return res.status(404).json({ error: 'Candidate not found.' })

  const hasVotes = await prisma.ballotReceipt.count({
    where: { electionId: candidate.position.electionId },
  })
  if (hasVotes > 0) {
    return res.status(400).json({ error: "Voting has started — candidates are now locked." })
  }

  await prisma.candidate.delete({ where: { id: req.params.id } })
  res.json({ ok: true })
})

// ── CAST BALLOT (member) ──────────────────────────────────────────────────
// Body: { votes: [{ positionId, candidateId | null }] }
router.post('/:id/vote', async (req, res) => {
  const schema = z.object({
    votes: z.array(z.object({
      positionId:  z.string(),
      candidateId: z.string().nullable(),
    })),
  })
  const parse = schema.safeParse(req.body)
  if (!parse.success) return res.status(400).json({ error: 'Invalid ballot.' })

  const election = await loadElection(req.params.id)
  if (!election) return res.status(404).json({ error: 'Election not found.' })

  const viewer = await prisma.user.findUnique({
    where:  { id: req.user.sub },
    select: { id: true, region: true, role: true },
  })

  // Election must be open
  if (statusOf(election) !== 'OPEN') {
    return res.status(400).json({ error: 'This election is not currently open for voting.' })
  }

  // Voter must be eligible
  if (!isEligible(viewer, election)) {
    return res.status(403).json({ error: 'You are not eligible to vote in this election.' })
  }

  // Validate each vote against the election's positions
  const positionMap = new Map(election.positions.map(p => [p.id, p]))
  for (const v of parse.data.votes) {
    const pos = positionMap.get(v.positionId)
    if (!pos) return res.status(400).json({ error: 'Ballot includes an unknown position.' })
    if (v.candidateId !== null && !pos.candidates.find(c => c.id === v.candidateId)) {
      return res.status(400).json({ error: `Invalid candidate for "${pos.title}".` })
    }
  }

  // Idempotent: the unique constraint on BallotReceipt(electionId, voterId)
  // makes a second attempt fail at the DB layer.
  try {
    await prisma.$transaction(async (tx) => {
      await tx.ballotReceipt.create({
        data: { electionId: election.id, voterId: viewer.id },
      })

      const voteRows = parse.data.votes
        .filter(v => v.candidateId !== null)
        .map(v => ({
          electionId:  election.id,
          candidateId: v.candidateId,
        }))
      if (voteRows.length > 0) {
        await tx.vote.createMany({ data: voteRows })
      }
    })
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(400).json({ error: 'You have already voted in this election.' })
    }
    throw err
  }

  res.json({ ok: true })
})

// ── RESULTS — tallies per candidate ───────────────────────────────────────
router.get('/:id/results', async (req, res) => {
  const election = await loadElection(req.params.id)
  if (!election) return res.status(404).json({ error: 'Election not found.' })

  const viewer = await prisma.user.findUnique({
    where:  { id: req.user.sub },
    select: { role: true },
  })
  const isAdmin = viewer.role === 'ADMIN'

  // Members can only see results if the admin published them AND the election
  // has actually closed.
  if (!isAdmin) {
    if (!election.resultsPublic || statusOf(election) !== 'CLOSED') {
      return res.status(403).json({ error: 'Results are not available yet.' })
    }
  }

  const tallies = await prisma.vote.groupBy({
    by: ['candidateId'],
    where: { electionId: election.id },
    _count: { candidateId: true },
  })
  const countByCandidate = new Map(tallies.map(t => [t.candidateId, t._count.candidateId]))

  const totalBallots = await prisma.ballotReceipt.count({
    where: { electionId: election.id },
  })

  const out = election.positions.map(p => ({
    id:    p.id,
    title: p.title,
    candidates: p.candidates.map(c => ({
      id:    c.id,
      name:  c.name,
      bio:   c.bio,
      votes: countByCandidate.get(c.id) || 0,
    })),
  }))

  res.json({
    results: out,
    totalBallots,
    election: shape(election, { region: null, role: viewer.role }, false),
  })
})

export default router
