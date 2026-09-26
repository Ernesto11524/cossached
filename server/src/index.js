// Local development / traditional hosting entry point.
// On Vercel the app is served by api/index.js instead (no app.listen there).
import app from './app.js'

const PORT = Number(process.env.PORT) || 3001

// Final safety net — make sure a stray async rejection never kills the process
process.on('unhandledRejection', (err) => console.error('[unhandledRejection]', err))
process.on('uncaughtException',  (err) => console.error('[uncaughtException]',  err))

app.listen(PORT, () => {
  console.log(`\nCOSSA-CHED API  →  http://localhost:${PORT}`)
  console.log(`Environment  →  ${process.env.NODE_ENV || 'development'}\n`)
})
