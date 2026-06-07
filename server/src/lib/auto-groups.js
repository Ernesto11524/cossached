import { prisma } from './prisma.js'

export const GHANA_REGIONS = [
  'Greater Accra', 'Ashanti', 'Western', 'Western North', 'Central',
  'Eastern', 'Volta', 'Oti', 'Northern', 'Savannah',
  'North East', 'Upper East', 'Upper West', 'Bono', 'Bono East', 'Ahafo',
]

/**
 * Ensure the single national group chat exists. Returns it.
 */
export async function ensureNationalGroup() {
  let conv = await prisma.conversation.findFirst({ where: { kind: 'NATIONAL' } })
  if (!conv) {
    conv = await prisma.conversation.create({
      data: {
        kind:    'NATIONAL',
        isGroup: true,
        name:    'COSSA-CHED National',
      },
    })
  }
  return conv
}

/**
 * Ensure the regional group chat for one Ghana region exists. Returns it.
 */
export async function ensureRegionalGroup(region) {
  if (!GHANA_REGIONS.includes(region)) {
    throw new Error(`Unknown region: ${region}`)
  }
  let conv = await prisma.conversation.findFirst({
    where: { kind: 'REGIONAL', region },
  })
  if (!conv) {
    conv = await prisma.conversation.create({
      data: {
        kind:    'REGIONAL',
        region,
        isGroup: true,
        name:    `${region} Region`,
      },
    })
  }
  return conv
}

/**
 * Add a user to a conversation if not already a participant. Idempotent.
 */
export async function addToConversation(userId, conversationId) {
  await prisma.conversationParticipant.upsert({
    where:  { conversationId_userId: { conversationId, userId } },
    update: {},
    create: { conversationId, userId },
  })
}

/**
 * Remove a user from a conversation if they're a participant. Idempotent.
 */
export async function removeFromConversation(userId, conversationId) {
  await prisma.conversationParticipant.deleteMany({
    where: { conversationId, userId },
  })
}

/**
 * Apply auto-group membership for one user according to their role + region.
 *
 *   - Everyone joins the National group.
 *   - Members join their own region's regional group.
 *   - Admins join EVERY regional group (so they can monitor / moderate).
 *
 * Idempotent — safe to call after any provisioning, role-change or region-change.
 * Also tidies up old regional memberships for non-admins when their region changes.
 */
export async function syncMemberGroups(userId) {
  const user = await prisma.user.findUnique({
    where:  { id: userId },
    select: { id: true, role: true, region: true, active: true },
  })
  if (!user || !user.active) return

  // 1. National — everyone
  const national = await ensureNationalGroup()
  await addToConversation(user.id, national.id)

  if (user.role === 'ADMIN') {
    // 2a. Admin — every regional group
    for (const region of GHANA_REGIONS) {
      const conv = await ensureRegionalGroup(region)
      await addToConversation(user.id, conv.id)
    }
  } else {
    // 2b. Member — only their own region (and remove from any others
    // they may have been in due to a previous region setting).
    const myRegion = user.region && GHANA_REGIONS.includes(user.region) ? user.region : null
    if (myRegion) {
      const conv = await ensureRegionalGroup(myRegion)
      await addToConversation(user.id, conv.id)
    }

    // Find all regional conversations this user is currently in
    const myRegionalMemberships = await prisma.conversationParticipant.findMany({
      where:   { userId: user.id, conversation: { kind: 'REGIONAL' } },
      include: { conversation: { select: { id: true, region: true } } },
    })
    for (const m of myRegionalMemberships) {
      if (m.conversation.region !== myRegion) {
        await removeFromConversation(user.id, m.conversation.id)
      }
    }
  }
}

/**
 * Backfill — run once to:
 *   - Create the national group + all 16 regional groups
 *   - Add every active member to the appropriate groups
 *
 * Idempotent.
 */
export async function backfillAllGroups() {
  const users = await prisma.user.findMany({
    where:  { active: true },
    select: { id: true },
  })
  for (const u of users) {
    await syncMemberGroups(u.id)
  }
}
