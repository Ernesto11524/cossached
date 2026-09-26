// One-time migration: copy every uploaded file from the old server's
// uploads/ folder into Vercel Blob, so the site on Vercel shows the same
// avatars, gallery photos/videos, news images and documents.
//
// Run it AFTER the database has been copied to the new Postgres (it reads the
// database to know which files are in use).
//
// Usage (from server/):
//   1. Download the old uploads folder, e.g.
//        scp -r root@<old-server-ip>:/var/www/cossached/server/uploads ./old-uploads
//   2. Put the NEW DATABASE_URL and BLOB_READ_WRITE_TOKEN in server/.env
//   3. node scripts/migrate-uploads-to-blob.mjs ./old-uploads
//
// Old layout on disk                 →  Blob pathname
//   uploads/avatars/<file>           →  avatars/<file>
//   uploads/gallery/<file>           →  gallery/<file>
//   uploads/news/<file>              →  news/<file>
//   uploads/<file>   (documents)     →  documents/<uuid>/<original name>
//                                        (Document.filename is updated so
//                                         downloads keep the real filename)
//
// Safe to re-run: files already in Blob are skipped.

import 'dotenv/config'
import { readFile, stat } from 'fs/promises'
import path from 'path'
import { randomUUID } from 'crypto'
import { prisma } from '../src/lib/prisma.js'
import { saveBuffer, statFile, safeName } from '../src/lib/storage.js'

const MIME = {
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp',
  '.gif': 'image/gif', '.svg': 'image/svg+xml',
  '.mp4': 'video/mp4', '.webm': 'video/webm', '.mov': 'video/quicktime', '.avi': 'video/x-msvideo',
  '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.ogg': 'audio/ogg', '.m4a': 'audio/x-m4a',
  '.pdf': 'application/pdf', '.txt': 'text/plain', '.csv': 'text/csv', '.zip': 'application/zip',
}
const mimeFor = (file) => MIME[path.extname(file).toLowerCase()] || 'application/octet-stream'

const root = process.argv[2]
if (!root) {
  console.error('Usage: node scripts/migrate-uploads-to-blob.mjs <path-to-old-uploads-folder>')
  process.exit(1)
}
if (!process.env.BLOB_READ_WRITE_TOKEN) {
  console.error('BLOB_READ_WRITE_TOKEN is not set in server/.env')
  process.exit(1)
}

const stats = { copied: 0, skipped: 0, missing: [] }

async function exists(p) {
  try { return (await stat(p)).isFile() } catch { return false }
}

async function copy(localPath, folder, key, contentType) {
  if (await statFile(folder, key)) { stats.skipped++; return true }
  if (!(await exists(localPath)))  { stats.missing.push(localPath); return false }
  await saveBuffer(folder, key, await readFile(localPath), contentType || mimeFor(localPath))
  stats.copied++
  console.log(`  ✓ ${folder}/${key}`)
  return true
}

async function main() {
  console.log(`Copying files from ${path.resolve(root)} to Vercel Blob…\n`)

  // ── Avatars ──
  console.log('Avatars')
  const users = await prisma.user.findMany({ where: { avatarFilename: { not: null } }, select: { avatarFilename: true } })
  for (const u of users) await copy(path.join(root, 'avatars', u.avatarFilename), 'avatars', u.avatarFilename)

  // ── Gallery ──
  console.log('Gallery')
  const gallery = await prisma.galleryItem.findMany({ select: { mediaFilename: true } })
  for (const g of gallery) await copy(path.join(root, 'gallery', g.mediaFilename), 'gallery', g.mediaFilename)

  // ── News (primary media + extra media) ──
  console.log('News')
  const articles = await prisma.newsArticle.findMany({ where: { mediaFilename: { not: null } }, select: { mediaFilename: true } })
  for (const a of articles) await copy(path.join(root, 'news', a.mediaFilename), 'news', a.mediaFilename)
  const extras = await prisma.newsMedia.findMany({ select: { filename: true } })
  for (const m of extras) await copy(path.join(root, 'news', m.filename), 'news', m.filename)

  // ── Documents ──
  console.log('Documents')
  const docs = await prisma.document.findMany()
  for (const d of docs) {
    if (d.filename.includes('/')) {            // already migrated on an earlier run
      if (await statFile('documents', d.filename)) { stats.skipped++; continue }
    }
    const local = path.join(root, path.basename(d.filename))
    const key   = `${randomUUID()}/${safeName(d.originalName)}`
    if (await copy(local, 'documents', key, d.mimeType)) {
      await prisma.document.update({ where: { id: d.id }, data: { filename: key } })
    }
  }

  console.log(`\nDone. Copied ${stats.copied}, already there ${stats.skipped}, missing ${stats.missing.length}.`)
  if (stats.missing.length) {
    console.log('\nThese files are referenced in the database but were not in the uploads folder:')
    for (const m of stats.missing) console.log('  - ' + m)
  }
}

main()
  .catch(e => { console.error('Migration failed:', e); process.exit(1) })
  .finally(() => prisma.$disconnect())
