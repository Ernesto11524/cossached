import 'dotenv/config'
import 'express-async-errors' // routes can throw async — caught by the global error handler
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import cookieParser from 'cookie-parser'

import authRoutes          from './routes/auth.js'
import contactRoutes       from './routes/contact.js'
import chatRoutes          from './routes/chat.js'
import newsRoutes          from './routes/news.js'
import avatarRoutes        from './routes/avatars.js'
import announcementRoutes  from './routes/announcements.js'
import documentRoutes      from './routes/documents.js'
import memberRoutes        from './routes/members.js'
import welfareRoutes       from './routes/welfare.js'
import eventRoutes         from './routes/events.js'
import profileRoutes       from './routes/profile.js'
import messagingRoutes     from './routes/messaging.js'
import webauthnRoutes      from './routes/webauthn.js'
import notificationRoutes  from './routes/notifications.js'
import passwordResetRoutes from './routes/password-reset.js'

// ── Fail fast on missing required secrets ─────────────────────────────────
if (!process.env.JWT_SECRET) {
  console.error('FATAL: JWT_SECRET is not set. Set it in server/.env and restart.')
  process.exit(1)
}
if (!process.env.DATABASE_URL) {
  console.error('FATAL: DATABASE_URL is not set. Set it in server/.env and restart.')
  process.exit(1)
}

const app  = express()
const PORT = Number(process.env.PORT) || 3001

// ── Security headers ──────────────────────────────────────────────────────
app.use(helmet())

// ── CORS ──────────────────────────────────────────────────────────────────
app.use(cors({
  origin:      process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  credentials: true,
}))

// ── Body + cookie parsing ─────────────────────────────────────────────────
app.use(express.json())
app.use(cookieParser())

// ── Health check ──────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => res.json({ ok: true, ts: new Date().toISOString() }))

// ── Public routes ─────────────────────────────────────────────────────────
app.use('/api/auth',    authRoutes)
app.use('/api/contact', contactRoutes)
app.use('/api/chat',    chatRoutes)
app.use('/api/news',    newsRoutes)
app.use('/api/avatars', avatarRoutes)

// ── Protected routes (each router applies requireAuth internally) ──────────
app.use('/api/announcements', announcementRoutes)
app.use('/api/documents',     documentRoutes)
app.use('/api/members',       memberRoutes)
app.use('/api/welfare',       welfareRoutes)
app.use('/api/events',        eventRoutes)
app.use('/api/profile',       profileRoutes)
app.use('/api/messaging',      messagingRoutes)
app.use('/api/webauthn',       webauthnRoutes)
app.use('/api/notifications',  notificationRoutes)
app.use('/api/password-reset', passwordResetRoutes)

// ── Global error handler ──────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error('[server error]', err)
  const status = err.status || (err.code === 'LIMIT_FILE_SIZE' ? 413 : 500)
  const message = err.code === 'LIMIT_FILE_SIZE'
    ? 'File too large. Maximum size is 20 MB.'
    : err.message || 'Internal server error.'
  res.status(status).json({ error: message })
})

// Final safety net — make sure a stray async rejection never kills the process
process.on('unhandledRejection', (err) => console.error('[unhandledRejection]', err))
process.on('uncaughtException',  (err) => console.error('[uncaughtException]',  err))

app.listen(PORT, () => {
  console.log(`\nCOSSA-CHED API  →  http://localhost:${PORT}`)
  console.log(`Environment  →  ${process.env.NODE_ENV || 'development'}\n`)
})
