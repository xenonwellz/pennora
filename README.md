# Pennora

**Budget smarter. Track every naira.**

Pennora is a self-hostable monthly budget planner built for people who manage finances in **NGN and USD**. Plan income targets, track recurring and one-off expenses, mark items paid, complete months with analytics, and collaborate with teammates — all in a fast, mobile-friendly web app.

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)

## Features

- **Monthly budgeting** — Start a plan per month, seed recurring items, set USD/NGN exchange rates, and mark the month complete.
- **Income & expenses** — Unified view with filters, paid/unpaid tracking, recurring schedules, and category tags.
- **Multi-currency** — Native support for NGN and USD with monthly rate conversion.
- **Dashboard analytics** — Income vs expenses, category breakdown, trends, and drill-down by category.
- **Collaboration** — Invite collaborators to a shared budget (email invites when SendByte is configured).
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
└── README.md
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
| `SENDBYTE_API_KEY` / `EMAIL_FROM` | Password reset and invite emails (SendByte) |

See [`.env.example`](.env.example) for all variables.

## Docker (local testing only)

Docker Compose is useful for running the full stack locally without Cloudflare. It is **not** the production deployment path — see [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for Cloudflare.

```bash
cp .env.example .env
# Required: set a strong BETTER_AUTH_SECRET
# openssl rand -base64 32
#
# For Docker, point auth/app base URLs at the public web origin:
# BETTER_AUTH_URL=http://localhost:8080
# APP_URL=http://localhost:8080
# CORS_ORIGINS=*   (default in docker-compose.prod.yml — allows any host)

bun run start   # docker compose -f docker-compose.prod.yml up --build -d
```

| Service | URL |
|---------|-----|
| Web app (nginx → API) | http://localhost:8080 |

Stop containers:

```bash
bun run stop
```

If the API container exits with `BETTER_AUTH_SECRET: Required`, your `.env` is missing that variable.
If you see migration errors, rebuild the API image (`bun run start` rebuilds with `--build`).
## Production deployment (Cloudflare)

### Prerequisites

```bash
# Install wrangler
npm install -g wrangler

# Login to Cloudflare
npx wrangler login
```

### 1. Create the database (first time only)

```bash
cd apps/server
npx wrangler d1 create pennora
```

Copy the returned database ID and paste it into `apps/server/wrangler.toml` as `database_id`.

### 2. Deploy the API Worker

```bash
cd apps/server
npx wrangler deploy
```

### 3. Deploy the frontend

```bash
cd apps/web
bun run build
npx wrangler pages deploy
```

That's it. The API is served from your Worker URL and the frontend from your Pages URL.

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
