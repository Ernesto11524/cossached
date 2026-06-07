import { prisma } from './prisma.js'

export const GHANA_REGIONS = [
  'Greater Accra', 'Ashanti', 'Western', 'Western North', 'Central',
  'Eastern', 'Volta', 'Oti', 'Northern', 'Savannah',
  'North East', 'Upper East', 'Upper West', 'Bono', 'Bono East', 'Ahafo',
]

// ── Group ensure helpers (idempotent — find or create) ───────────────────

export async function ensureNationalGroup() {
  let conv = await prisma.conversation.findFirst({ where: { kind: 'NATIONAL' } })
  if (!conv) {
    conv = await prisma.conversation.create({
      data: { kind: 'NATIONAL', isGroup: true, name: 'COSSA-CHED National' },
    })
  }
  return conv
}

export async function ensureRegionalGroup(region) {
  if (!GHANA_REGIONS.includes(region)) throw new Error(`Unknown region: ${region}`)
  let conv = await prisma.conversation.findFirst({
    where: { kind: 'REGIONAL', region },
  })
  if (!conv) {
    conv = await prisma.conversation.create({
      data: { kind: 'REGIONAL', region, isGroup: true, name: `${region} Region` },
    })
  }
  return conv
}

export async function ensureAllExecutivesGroup() {
  let conv = await prisma.conversation.findFirst({ where: { kind: 'ALL_EXECUTIVES' } })
  if (!conv) {
    conv = await prisma.conversation.create({
      data: { kind: 'ALL_EXECUTIVES', isGroup: true, name: 'COSSA-CHED Executives (All)' },
    })
  }
  return conv
}

export async function ensureNationalExecutivesGroup() {
  let conv = await prisma.conversation.findFirst({ where: { kind: 'NATIONAL_EXECUTIVES' } })
  if (!conv) {
    conv = await prisma.conversation.create({
      data: { kind: 'NATIONAL_EXECUTIVES', isGroup: true, name: 'National Executives' },
    })
  }
  return conv
}

export async function ensureRegionalExecutivesGroup(region) {
  if (!GHANA_REGIONS.includes(region)) throw new Error(`Unknown region: ${region}`)
  let conv = await prisma.conversation.findFirst({
    where: { kind: 'REGIONAL_EXECUTIVES', region },
  })
  if (!conv) {
    conv = await prisma.conversation.create({
      data: {
        kind:    'REGIONAL_EXECUTIVES',
        region,
        isGroup: true,
        name:    `${region} Executives`,
      },
    })
  }
  return conv
}

// ── Participation helpers ───────────────────────────────────────────────

export async function addToConversation(userId, conversationId) {
  await prisma.conversationParticipant.upsert({
    where:  { conversationId_userId: { conversationId, userId } },
    update: {},
    create: { conversationId, userId },
  })
}

export async function removeFromConversation(userId, conversationId) {
  await prisma.conversationParticipant.deleteMany({
    where: { conversationId, userId },
  })
}

// Drop the user from every membership of a given conversation kind that isn't
// in `keep` (a Set of conversation ids the user IS allowed to remain in).
async function pruneFromKind(userId, kind, keep) {
  const memberships = await prisma.conversationParticipant.findMany({
    where:   { userId, conversation: { kind } },
    select:  { conversationId: true },
  })
  for (const m of memberships) {
    if (!keep.has(m.conversationId)) {
      await removeFromConversation(userId, m.conversationId)
    }
  }
}

// ── Main sync — recalculates the user's group memberships ────────────────

/**
 * Apply auto-group membership for one user according to role + position + region.
 *
 *   Everyone joins:        the National group
 *   Members join:          their own region's regional group
 *   Admins join:           every regional group AND every executive group
 *   National executives:   All Executives + National Executives
 *   Regional executives:   All Executives + their region's Regional Executives
 *
 * Idempotent. Also tidies up stale memberships if role / region / position
 * changed (e.g. an exec is demoted, or a member moves regions).
 */
export async function syncMemberGroups(userId) {
  const user = await prisma.user.findUnique({
    where:  { id: userId },
    select: { id: true, role: true, region: true, positionScope: true, active: true },
  })
  if (!user || !user.active) return

  const isAdmin     = user.role === 'ADMIN'
  const isNatExec   = user.positionScope === 'NATIONAL'
  const isRegExec   = user.positionScope === 'REGIONAL' &&
                      user.region && GHANA_REGIONS.includes(user.region)
  const isAnyExec   = isNatExec || isRegExec
  const myRegion    = user.region && GHANA_REGIONS.includes(user.region) ? user.region : null

  // ── 1. National (everyone) ──────────────────────────────────────────────
  const national = await ensureNationalGroup()
  await addToConversation(user.id, national.id)

  // ── 2. Regional group(s) ───────────────────────────────────────────────
  const keepRegional = new Set()
  if (isAdmin) {
    // Admin → every regional group
    for (const region of GHANA_REGIONS) {
      const conv = await ensureRegionalGroup(region)
      await addToConversation(user.id, conv.id)
      keepRegional.add(conv.id)
    }
  } else if (myRegion) {
    const conv = await ensureRegionalGroup(myRegion)
    await addToConversation(user.id, conv.id)
    keepRegional.add(conv.id)
  }
  await pruneFromKind(user.id, 'REGIONAL', keepRegional)

  // ── 3. Executive groups ────────────────────────────────────────────────
  const allExecs = await ensureAllExecutivesGroup()
  const natExecs = await ensureNationalExecutivesGroup()

  if (isAdmin || isAnyExec) {
    // All Executives — everyone who is or oversees an executive
    await addToConversation(user.id, allExecs.id)
  } else {
    await removeFromConversation(user.id, allExecs.id)
  }

  if (isAdmin || isNatExec) {
    await addToConversation(user.id, natExecs.id)
  } else {
    await removeFromConversation(user.id, natExecs.id)
  }

  // Regional Executives — one group per region
  const keepRegExec = new Set()
  if (isAdmin) {
    // Admin → every regional executives group
    for (const region of GHANA_REGIONS) {
      const conv = await ensureRegionalExecutivesGroup(region)
      await addToConversation(user.id, conv.id)
      keepRegExec.add(conv.id)
    }
  } else if (isRegExec) {
    const conv = await ensureRegionalExecutivesGroup(myRegion)
    await addToConversation(user.id, conv.id)
    keepRegExec.add(conv.id)
  }
  await pruneFromKind(user.id, 'REGIONAL_EXECUTIVES', keepRegExec)
}

/**
 * Run once to:
 *   - Create national + all regional groups + all executive groups
 *   - Sync every active member into the right groups
 * Idempotent.
 */
export async function backfillAllGroups() {
  // Pre-create all groups so the backfill output is deterministic
  await ensureNationalGroup()
  await ensureAllExecutivesGroup()
  await ensureNationalExecutivesGroup()
  for (const region of GHANA_REGIONS) {
    await ensureRegionalGroup(region)
    await ensureRegionalExecutivesGroup(region)
  }

  const users = await prisma.user.findMany({
    where:  { active: true },
    select: { id: true },
  })
  for (const u of users) {
    await syncMemberGroups(u.id)
  }
}
