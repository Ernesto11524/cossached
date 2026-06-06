# COSSA-CHED Website

Production website for the **CHED Senior Staff Association (COSSA-CHED)** — the
senior staff association of the Cocoa Health & Extension Division of COCOBOD
(Ghana Cocoa Board).

---

## Project structure

```
chedssa-website/
├── client/          React + Vite frontend
└── server/          Node.js + Express backend (Phase 2+)
```

---

## Local development (Phase 1 — frontend only)

### Prerequisites
- Node.js 20+
- npm 10+

### Setup

```bash
cd client
npm install
npm run dev
```

The site runs at **http://localhost:5173**.

> The Vite dev server proxies `/api/*` requests to `http://localhost:3001`
> (the Express backend, added in Phase 2). In Phase 1 the chatbot and contact
> form will fall back gracefully when the backend is not running.

---

## Build for production

```bash
cd client
npm run build
# Output: client/dist/
```

Copy `client/dist/` to the server and have nginx serve it as static files.

---

## Hostinger VPS — deployment (Phase 6 detail)

> Full nginx config, PM2 setup, and SSL instructions will be added in Phase 6.
> Outline below for reference.

### Architecture

```
Internet (HTTPS :443)
    │
  nginx
  ├── /          → client/dist/   (static React build)
  └── /api/*     → localhost:3001 (Express, managed by PM2)

  PostgreSQL     → localhost:5432
```

### Quick-start on a fresh Ubuntu 22.04 VPS

```bash
# 1. Install Node via nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
nvm install 20

# 2. Install PostgreSQL
sudo apt install postgresql postgresql-contrib

# 3. Install PM2 and nginx
npm install -g pm2
sudo apt install nginx

# 4. Clone and install
git clone <your-repo> /var/www/chedssa
cd /var/www/chedssa/client && npm ci && npm run build
cd /var/www/chedssa/server && npm ci

# 5. Configure environment
cp server/.env.example server/.env
nano server/.env   # fill in secrets

# 6. Start backend
pm2 start server/src/index.js --name chedssa-api
pm2 save && pm2 startup

# 7. Configure nginx + SSL
# (see Phase 6 nginx.conf)
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

### Environment variables (server/.env)

See `server/.env.example` (added in Phase 2) for all required keys:

| Key                  | Description                            |
|----------------------|----------------------------------------|
| `DATABASE_URL`       | PostgreSQL connection string           |
| `JWT_SECRET`         | Secret for signing auth tokens         |
| `ANTHROPIC_API_KEY`  | Anthropic Claude API key (Phase 4)     |
| `SMTP_HOST` etc.     | SMTP credentials for contact emails    |
| `PORT`               | Express port (default 3001)            |

---

## What you need to purchase / provide

| Item                  | Notes                                                          |
|-----------------------|----------------------------------------------------------------|
| Hostinger VPS KVM 2   | ~$7–10/month, Ubuntu 22.04 LTS                                 |
| Custom domain         | Any registrar; point A record to VPS IP                        |
| Anthropic API key     | console.anthropic.com — goes in server `.env` only             |
| SMTP credentials      | Hostinger business email, Gmail App Password, or Resend        |
| Real content          | Executive names, news articles, documents — placeholders used now |

---

## Build phases

| Phase | Status      | Scope                                             |
|-------|-------------|---------------------------------------------------|
| 1     | ✅ Complete  | Scaffold, public pages (Home, About, News, Contact) |
| 2     | ⬜ Next      | Express backend, PostgreSQL, auth (login / JWT)   |
| 3     | ⬜           | Member portal (all tabs)                          |
| 4     | ✅ Complete  | AI chatbot via Anthropic API                      |
| 5     | ⬜           | Admin capabilities                                |
| 6     | ⬜           | Production hardening + Hostinger deployment       |
