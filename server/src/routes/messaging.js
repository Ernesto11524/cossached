import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { notify } from '../lib/notifications.js'

const router = Router()
router.use(requireAuth)

// ── Helpers ────────────────────────────────────────────────────────────────

async function shapeConversation(conv, currentUserId) {
  const myPart = conv.participants.find(p => p.userId === currentUserId)
  const others = conv.participants.filter(p => p.userId !== currentUserId)

  const unreadCount = await prisma.message.count({
    where: {
      conversationId: conv.id,
      createdAt:      { gt: myPart.lastReadAt },
      senderId:       { not: currentUserId },
    },
  })

  return {
    id:             conv.id,
    isGroup:        conv.isGroup,
    name:           conv.name,
    displayName:    conv.isGroup
                      ? conv.name
                      : (others[0]?.user?.name ?? 'Unknown'),
    avatarFilename: conv.isGroup ? null : (others[0]?.user?.avatarFilename ?? null),
    participants:   conv.participants.map(p => ({
      id:             p.user.id,
      name:           p.user.name,
      avatarFilename: p.user.avatarFilename,
    })),
    lastMessage: conv.messages[0] ? {
      body:       conv.messages[0].body,
      createdAt:  conv.messages[0].createdAt,
      senderName: conv.messages[0].sender.name,
      senderId:   conv.messages[0].sender.id,
    } : null,
    lastMessageAt: conv.lastMessageAt,
    unreadCount,
  }
}

// ── GET /api/messaging/conversations ──────────────────────────────────────
router.get('/conversations', async (req, res) => {
  const conversations = await prisma.conversation.findMany({
    where:   { participants: { some: { userId: req.user.sub } } },
    orderBy: { lastMessageAt: 'desc' },
    include: {
      participants: {
        include: {
          user: { select: { id: true, name: true, avatarFilename: true } },
        },
      },
      messages: {
        orderBy: { createdAt: 'desc' },
        take:    1,
        include: { sender: { select: { id: true, name: true } } },
      },
    },
  })

  const shaped = await Promise.all(conversations.map(c => shapeConversation(c, req.user.sub)))
  res.json({ conversations: shaped })
})

// ── GET /api/messaging/unread-count ───────────────────────────────────────
router.get('/unread-count', async (req, res) => {
  // For each conversation I'm in, count messages newer than my lastReadAt
  const parts = await prisma.conversationParticipant.findMany({
    where:  { userId: req.user.sub },
    select: { conversationId: true, lastReadAt: true },
  })

  let total = 0
  for (const p of parts) {
    total += await prisma.message.count({
      where: {
        conversationId: p.conversationId,
        createdAt:      { gt: p.lastReadAt },
        senderId:       { not: req.user.sub },
      },
    })
  }

  res.json({ unreadCount: total })
})

// ── POST /api/messaging/conversations ─────────────────────────────────────
router.post('/conversations', async (req, res) => {
  const schema = z.object({
    isGroup: z.boolean().default(false),
    name:    z.string().min(1).max(100).optional(),
    userIds: z.array(z.string().min(1)).min(1).max(50),
  })
  const parse = schema.safeParse(req.body)
  if (!parse.success) return res.status(400).json({ error: 'Invalid conversation data.' })

  const { isGroup, name, userIds } = parse.data
  const me = req.user.sub

  if (isGroup && !name) {
    return res.status(400).json({ error: 'Group conversations need a name.' })
  }
  if (!isGroup && userIds.length !== 1) {
    return res.status(400).json({ error: 'Direct conversations are 1-to-1.' })
  }

  // Make sure none of the target users are myself, and dedupe
  const otherIds = [...new Set(userIds.filter(id => id !== me))]
  if (otherIds.length === 0) {
    return res.status(400).json({ error: 'You cannot start a conversation with only yourself.' })
  }

  // Validate users exist & active
  const targets = await prisma.user.findMany({
    where:  { id: { in: otherIds }, active: true },
    select: { id: true },
  })
  if (targets.length !== otherIds.length) {
    return res.status(400).json({ error: 'One or more selected members are invalid.' })
  }

  // For 1:1, reuse existing conversation if one exists
  if (!isGroup) {
    const existing = await prisma.conversation.findFirst({
      where: {
        isGroup: false,
        AND: [
          { participants: { some: { userId: me } } },
          { participants: { some: { userId: otherIds[0] } } },
        ],
      },
      include: {
        participants: {
          include: { user: { select: { id: true, name: true, avatarFilename: true } } },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take:    1,
          include: { sender: { select: { id: true, name: true } } },
        },
      },
    })
    if (existing) {
      return res.json({ conversation: await shapeConversation(existing, me) })
    }
  }

  const allParticipantIds = [me, ...otherIds]
  const conv = await prisma.conversation.create({
    data: {
      isGroup,
      name: isGroup ? name : null,
      participants: {
        create: allParticipantIds.map(uid => ({ userId: uid })),
      },
    },
    include: {
      participants: {
        include: { user: { select: { id: true, name: true, avatarFilename: true } } },
      },
      messages: {
        orderBy: { createdAt: 'desc' },
        take:    1,
        include: { sender: { select: { id: true, name: true } } },
      },
    },
  })

  res.status(201).json({ conversation: await shapeConversation(conv, me) })
})

// ── GET /api/messaging/conversations/:id/messages ─────────────────────────
// Returns last 100 messages by default, or only messages newer than `?since=<ISO>`
router.get('/conversations/:id/messages', async (req, res) => {
  // Verify I'm a participant
  const myPart = await prisma.conversationParticipant.findUnique({
    where: {
      conversationId_userId: {
        conversationId: req.params.id,
        userId:         req.user.sub,
      },
    },
  })
  if (!myPart) return res.status(404).json({ error: 'Conversation not found.' })

  const since = req.query.since ? new Date(req.query.since) : null

  const messages = await prisma.message.findMany({
    where: {
      conversationId: req.params.id,
      ...(since && !isNaN(since.getTime()) && { createdAt: { gt: since } }),
    },
    orderBy: { createdAt: 'asc' },
    take:    since ? undefined : 100,
    include: {
      sender: { select: { id: true, name: true, avatarFilename: true } },
    },
  })

  res.json({ messages })
})

// ── POST /api/messaging/conversations/:id/messages ────────────────────────
router.post('/conversations/:id/messages', async (req, res) => {
  const schema = z.object({ body: z.string().min(1).max(4000) })
  const parse = schema.safeParse(req.body)
  if (!parse.success) return res.status(400).json({ error: 'Message body required (max 4000 chars).' })

  // Verify I'm a participant
  const myPart = await prisma.conversationParticipant.findUnique({
    where: {
      conversationId_userId: {
        conversationId: req.params.id,
        userId:         req.user.sub,
      },
    },
  })
  if (!myPart) return res.status(404).json({ error: 'Conversation not found.' })

  const now = new Date()
  const message = await prisma.message.create({
    data: {
      conversationId: req.params.id,
      senderId:       req.user.sub,
      body:           parse.data.body,
    },
    include: {
      sender: { select: { id: true, name: true, avatarFilename: true } },
    },
  })

  // Bump the conversation's lastMessageAt + my own lastReadAt (I just sent it)
  await prisma.conversation.update({
    where: { id: req.params.id },
    data:  { lastMessageAt: now },
  })
  await prisma.conversationParticipant.update({
    where: { id: myPart.id },
    data:  { lastReadAt: now },
  })

  // Notify every other participant
  const otherParticipants = await prisma.conversationParticipant.findMany({
    where:  { conversationId: req.params.id, userId: { not: req.user.sub } },
    select: { userId: true },
  })
  const conv = await prisma.conversation.findUnique({ where: { id: req.params.id } })
  const preview = parse.data.body.length > 80 ? parse.data.body.slice(0, 80) + '…' : parse.data.body
  await Promise.all(otherParticipants.map(p => notify({
    userId: p.userId,
    type:   'message',
    title:  conv.isGroup ? `New message in ${conv.name}` : `New message from ${message.sender.name}`,
    body:   preview,
    link:   'messages',
    email:  true,
  })))

  res.status(201).json({ message })
})

// ── POST /api/messaging/conversations/:id/read ────────────────────────────
router.post('/conversations/:id/read', async (req, res) => {
  const myPart = await prisma.conversationParticipant.findUnique({
    where: {
      conversationId_userId: {
        conversationId: req.params.id,
        userId:         req.user.sub,
      },
    },
  })
  if (!myPart) return res.status(404).json({ error: 'Conversation not found.' })

  await prisma.conversationParticipant.update({
    where: { id: myPart.id },
    data:  { lastReadAt: new Date() },
  })
  res.json({ ok: true })
})

export default router
