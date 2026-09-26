# COSSA-CHED Website

Production website for the **CHED Senior Staff Association (COSSA-CHED)** — the
senior staff association of the Cocoa Health & Extension Division of COCOBOD
(Ghana Cocoa Board).

---

## Project structure

```
cossached/
├── api/index.js     Vercel serverless entry — runs the Express API
├── vercel.json      Build, function and routing config for Vercel
├── client/          React + Vite frontend  (built to client/dist)
└── server/          Node.js + Express API, Prisma (PostgreSQL)
    └── scripts/migrate-uploads-to-blob.mjs   one-time file migration
```

Everything runs as **one Vercel project**:

```
https://cossached.org
  ├── /            → client/dist  (static React build, served from Vercel's CDN)
  └── /api/*       → api/index.js (the Express app, as a serverless function)

PostgreSQL        → Neon (Vercel Marketplace)
Uploaded files    → Vercel Blob (avatars/, gallery/, news/, documents/)
```

### What changed for Vercel (and why)

The code was already JavaScript, which Vercel runs natively — no language change
was needed. What Vercel doesn't have is a long-running server with its own disk,
so:

| Before (VPS / Render)                         | Now (Vercel)                                             |
|-----------------------------------------------|----------------------------------------------------------|
| `app.listen()` on a server kept running by PM2 | `server/src/app.js` exported; `api/index.js` serves it   |
| Files saved to `server/uploads/` on disk       | Files saved to **Vercel Blob**                           |
| Files streamed from disk by the API            | API checks access, then redirects to the file on Blob    |
| Uploads sent through the API (up to 200 MB)    | Browser uploads straight to Blob; API gets a reference (Vercel caps API requests at 4.5 MB) |
| nginx `/api` proxy                             | `vercel.json` rewrites                                   |

Routes, database schema, URLs and pages are unchanged. The frontend still calls
`api.upload('/gallery', formData)` etc.; only `client/src/lib/api.js` learned
to send the files to Blob first.

---

## Local development

Prerequisites: Node.js 20+, a PostgreSQL database.

```bash
# API
cd server
cp .env.example .env      # fill in DATABASE_URL, JWT_SECRET, BLOB_READ_WRITE_TOKEN …
npm install
npm run dev               # http://localhost:3001

# Frontend (second terminal)
cd client
npm install
npm run dev               # http://localhost:5173 — proxies /api to :3001
```

Uploads need `BLOB_READ_WRITE_TOKEN` even locally (Vercel → Storage → your Blob
store → `.env.local` tab). Use a separate "dev" Blob store so test uploads don't
mix with the live site's files.

---

## Deploying on Vercel

### 1. Point the Vercel project at the repo root

If the site is already on Vercel (frontend only, Root Directory = `client`):
**Project → Settings → Build & Deployment → Root Directory → clear it (repo
root)**. Keeping the same project keeps the `cossached.org` domain attached.

For a new project: *Add New → Project → import the repo*, leave Root Directory
empty. `vercel.json` sets the install/build commands and output folder.

### 2. Add storage (Project → Storage)

- **Neon Postgres** — create it in **Frankfurt (eu-central-1)**, the closest
  region to Ghana. `vercel.json` runs the API in Frankfurt (`fra1`) to match.
- **Blob** — create a store and connect it. This adds `BLOB_READ_WRITE_TOKEN`.

Then check `DATABASE_URL` is Neon's **pooled** URL (host contains `-pooler`)
and append `&pgbouncer=true` to it.

### 3. Environment variables (Project → Settings → Environment Variables)

| Key                  | Value                                                        |
|----------------------|--------------------------------------------------------------|
| `DATABASE_URL`       | Neon pooled URL + `&pgbouncer=true` (step 2)                 |
| `BLOB_READ_WRITE_TOKEN` | added automatically by the Blob store                     |
| `JWT_SECRET`         | **copy the value from the old server** so members stay logged in |
| `CLIENT_ORIGIN`      | `https://cossached.org,https://www.cossached.org`            |
| `WEBAUTHN_RP_ID`     | `cossached.org` — must stay the same or saved biometric logins stop working |
| `WEBAUTHN_ORIGIN`    | `https://cossached.org,https://www.cossached.org`            |
| `WEBAUTHN_RP_NAME`   | `COSSA-CHED Member Portal`                                   |
| `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL` | as on the old server                       |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, `CONTACT_EMAIL_TO` | as on the old server |
| `SMS_PROVIDER`, `SMS_API_KEY`, `SMS_CLIENT_ID`, `SMS_SENDER_ID` (or `TWILIO_*`) | as on the old server |

`NODE_ENV` and `PORT` are not needed on Vercel.

### 4. Move the data (nothing moves automatically)

Vercel only runs the code. Member accounts, messages, elections, news, etc. are
in the **old PostgreSQL database**, and photos/documents are in the **old
server's `uploads/` folder**. Both must be copied. Do this before switching the
domain, and ideally at a quiet time (changes made on the old site after the copy
won't come across).

**a. Database** — needs PostgreSQL client tools (`pg_dump`/`pg_restore`) of the
same major version as the old database or newer.

```bash
# Old database URL: Hostinger VPS → postgresql://USER:PASS@localhost:5432/DB (run on the VPS)
#                   Render → Dashboard → the database → "External Database URL"
pg_dump "OLD_DATABASE_URL" --format=custom --no-owner --no-privileges --file=cossached.dump

# New database: use Neon's *direct* (unpooled) URL — DATABASE_URL_UNPOOLED in Vercel
pg_restore --no-owner --no-privileges --dbname="NEON_UNPOOLED_URL" cossached.dump
```

This copies the tables and all rows exactly (same IDs), so every link keeps
working. Don't run `prisma db seed` against the new database.

**b. Uploaded files**

```bash
# Get the old uploads folder onto your computer, e.g. from the VPS:
scp -r root@OLD_SERVER_IP:/var/www/cossached/server/uploads ./old-uploads
#   (on Render: open a Shell on the service, the folder is /opt/render/project/src/server/uploads)

# Then, from server/ with the NEW DATABASE_URL and BLOB_READ_WRITE_TOKEN in server/.env:
node scripts/migrate-uploads-to-blob.mjs ../old-uploads
```

The script reads the new database, uploads every file it references to Blob,
and prints any file that was referenced but not found. It's safe to re-run.

### 5. Deploy and check

Push to GitHub (or click Redeploy). Test on the `*.vercel.app` URL first: public
pages, login, portal tabs, gallery, downloads, an upload. Biometric (WebAuthn)
login only works on `cossached.org` itself, so test that after step 6.

### 6. Domain

If you reused the existing Vercel project, `cossached.org` is already attached —
nothing to do. Otherwise add `cossached.org` and `www.cossached.org` under
**Project → Settings → Domains** and update the DNS records Vercel shows.

Keep the old server (and the `cossached.dump` file) until you've confirmed
everything works, then shut it down.

---

## Things to know

- **Plan:** Vercel's free Hobby plan is for non-commercial use; check whether the
  association should be on Pro. Neon and Blob also have free-tier limits.
- **File privacy:** documents and gallery media still require login to get to,
  but they're served from long random Blob URLs — someone who is *given* a direct
  file link can open it without logging in.
- **Rate limits** (login, contact form, chatbot) are kept in memory, so on
  serverless they are per instance — still useful, but looser than on one server.
- **Schema changes:** `prisma/migrations` is incomplete (the live schema was
  applied with `db push`), so run schema changes with
  `DATABASE_URL=<neon unpooled url> npx prisma db push` from `server/`.

---

## Environment variables reference

See `server/.env.example` for every key with comments.
