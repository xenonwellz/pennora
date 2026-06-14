# Pennora

**Budget smarter. Track every naira.**

Pennora is a self-hostable monthly budget planner built for people who manage finances in **NGN and USD**. Plan income targets, track recurring and one-off expenses, mark items paid, complete months with analytics, and collaborate with teammates — all in a fast, mobile-friendly web app.

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)

## Features

- **Monthly budgeting** — Start a plan per month, seed recurring items, set USD/NGN exchange rates, and mark the month complete.
- **Income & expenses** — Unified view with filters, paid/unpaid tracking, recurring schedules, and category tags.
- **Multi-currency** — Native support for NGN and USD with monthly rate conversion.
- **Dashboard analytics** — Income vs expenses, category breakdown, trends, and drill-down by category.
- **Collaboration** — Invite collaborators to a shared budget (email invites when Resend is configured).
- **Authentication** — Email/password with optional Google OAuth via [Better Auth](https://www.better-auth.com/).
- **Progressive Web App** — Installable on mobile with offline-friendly static assets.
- **Responsive UI** — Card layouts on small screens, full tables on desktop.

## Tech stack

| Layer | Technologies |
|-------|--------------|
| Frontend | React 19, TanStack Router, TanStack Query, Tailwind CSS v4, shadcn/ui, Recharts, Vite |
| Backend | Bun (local), Cloudflare Workers (production), Hono, oRPC, Drizzle ORM, SQLite / D1 |
| Auth | Better Auth |
| Monorepo | Turborepo, Bun workspaces |

## Project structure

```
.
├── apps/
│   ├── web/          # React SPA (Vite)
│   └── server/       # Bun API server (Hono + oRPC)
├── packages/
│   └── shared/       # Shared types and utilities
├── docker-compose.yml
├── .env.example      # Local development environment template
└── docs/
    └── DEPLOYMENT.md # Production deployment guide
```

## Prerequisites

- [Bun](https://bun.sh) 1.3+
- Node.js 20+ (optional; Bun is the primary runtime)

## Quick start (development)

### 1. Clone and install

```bash
git clone https://github.com/xenonwellz/pennora.git
cd pennora
bun install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` and set at minimum:

```env
BETTER_AUTH_SECRET=your-secret-at-least-32-characters-long
BETTER_AUTH_URL=http://localhost:5173
APP_URL=http://localhost:5173
```

Generate a secret:

```bash
openssl rand -base64 32
```

### 3. Run the app

```bash
bun run dev
```

| Service | URL |
|---------|-----|
| Web app | http://localhost:5173 |
| API server | http://localhost:3001 |

The Vite dev server proxies `/api` to the backend. Register an account at `/register` and create your first budget from the dashboard.

### Optional integrations

| Variable | Purpose |
|----------|---------|
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Enable “Continue with Google” |
| `RESEND_API_KEY` / `EMAIL_FROM` | Password reset and invite emails |

See [`.env.example`](.env.example) for all variables.

## Docker (local testing only)

Docker Compose is useful for running the full stack locally without Cloudflare. It is **not** the production deployment path — see [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for Cloudflare.

```bash
cp .env.example .env.docker
# Edit .env.docker — set BETTER_AUTH_SECRET and BETTER_AUTH_URL=http://localhost:8080

bun run start
```

| Service | URL |
|---------|-----|
| Web app | http://localhost:8080 |
| API (direct) | http://localhost:3001 |

Stop containers:

```bash
bun run stop
```

## Production deployment (Cloudflare)

Pennora is deployed live on **Cloudflare** — Pages for the frontend, Workers for the API, and D1 for the database.

See **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)** for the full guide (D1 setup, Worker secrets, Pages deploy, custom domain, CI/CD).

Quick reference:

```bash
# API Worker
npx wrangler deploy --config apps/server/wrangler.toml

# Frontend
bun run --cwd apps/web build
npx wrangler pages deploy apps/web/dist --project-name pennora
```

## Scripts

| Command | Description |
|---------|-------------|
| `bun run dev` | Start web + server in development |
| `bun run build` | Build all packages |
| `bun run typecheck` | Type-check all workspaces |
| `bun run start` | Docker Compose up (local testing) |
| `bun run db:push` | Push Drizzle schema to SQLite |
| `bun run db:generate` | Generate SQL migrations |

## Contributing

We welcome contributions! Please read **[CONTRIBUTING.md](CONTRIBUTING.md)** for setup details, coding standards, and the pull request process.

## License

This project is licensed under the **Apache License 2.0**. See [LICENSE](LICENSE) for the full text.
