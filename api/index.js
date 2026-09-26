// Vercel serverless function — runs the whole Express API.
// vercel.json rewrites every /api/* request here; Express still sees the
// original URL (e.g. /api/news), so all existing routes work unchanged.
import app from '../server/src/app.js'

export default app
