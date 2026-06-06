import { Router } from 'express'
import Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'
import { chatLimiter } from '../middleware/rateLimiter.js'

const router = Router()

const DEFAULT_MODEL = 'claude-haiku-4-5-20251001'

const SYSTEM_PROMPT = `You are COSSA-CHED Assistant, the helpful AI chatbot for the CHED Senior Staff Association (COSSA-CHED) website.

COSSA-CHED represents the senior staff of the Cocoa Health & Extension Division (CHED), a division of COCOBOD (Ghana Cocoa Board). CHED's mandate covers cocoa disease control — particularly Cocoa Swollen Shoot Virus Disease (CSSVD) and capsid management — and agricultural extension services supporting Ghana's cocoa farmers across all ten cocoa-growing regions.

COSSA-CHED's role:
- Welfare support for members (medical aid, bereavement support, education grants, emergency assistance, retirement support)
- Industrial relations representation with COCOBOD management
- Professional development through training and seminars
- Annual General Meeting (AGM) and association events
- Advocacy on policy matters affecting CHED staff

Membership: COSSA-CHED membership is strictly for confirmed CHED senior staff — it is NOT open to the general public, students, or staff of other COCOBOD divisions. Members access the portal using their COCOBOD staff credentials. Direct anyone asking how to "join" COSSA-CHED to the secretariat to confirm their staff status.

Contact the secretariat:
- Email: cossa-ched@cocobod.gh
- Phone: +233 30 266 1877
- Address: COCOBOD HQ, 41 Kwame Nkrumah Avenue, Accra, Ghana
- Hours: Monday – Friday, 8:00 AM – 5:00 PM

Tone: warm, professional, and concise. Answer questions about COSSA-CHED, CHED, COCOBOD, welfare benefits, industrial relations, HR matters, and Ghana's cocoa sector. Keep responses brief (2–4 short paragraphs at most) — this is a chat widget, not a full document. If you don't know something specific or it's outside your scope, say so and direct the user to the secretariat.`

const messageSchema = z.object({
  role:    z.enum(['user', 'assistant']),
  content: z.string().min(1).max(2000),
})

const bodySchema = z.object({
  messages: z.array(messageSchema).min(1).max(20),
})

const FALLBACK_REPLY =
  "Hello! I'm the COSSA-CHED Assistant. My AI capabilities are being configured. " +
  'In the meantime, please contact the secretariat at cossa-ched@cocobod.gh ' +
  'or call +233 30 266 1877 for assistance.'

const ERROR_REPLY =
  "I'm having trouble responding right now. Please try again in a moment, or " +
  'contact the secretariat at cossa-ched@cocobod.gh or +233 30 266 1877 for immediate assistance.'

// Lazily initialise the Anthropic client so the route still works (with the
// fallback reply) when ANTHROPIC_API_KEY is unset at startup.
let _client = null
function getClient() {
  if (!_client) _client = new Anthropic()
  return _client
}

// ── POST /api/chat ──────────────────────────────────────────────────────────
router.post('/', chatLimiter, async (req, res) => {
  // No API key configured — graceful fallback (200 OK so the widget shows it)
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.json({ reply: FALLBACK_REPLY })
  }

  // Validate request shape
  const parse = bodySchema.safeParse(req.body)
  if (!parse.success) {
    return res.status(400).json({
      reply: "Sorry, I couldn't process that message. Please try a shorter question.",
    })
  }

  try {
    const response = await getClient().messages.create({
      model:      process.env.ANTHROPIC_MODEL || DEFAULT_MODEL,
      max_tokens: 1024,
      system: [
        {
          type:          'text',
          text:          SYSTEM_PROMPT,
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: parse.data.messages,
    })

    const textBlock = response.content.find((b) => b.type === 'text')
    const reply = textBlock?.text?.trim() ||
      "I'm sorry, I couldn't generate a response. Please try rephrasing your question."

    res.json({ reply })
  } catch (err) {
    console.error('[chat] Anthropic API error:', err?.message || err)
    res.status(500).json({ reply: ERROR_REPLY })
  }
})

export default router
