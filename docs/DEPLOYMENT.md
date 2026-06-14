# Deploying Pennora on Cloudflare

This is the **production deployment guide** for Pennora. The live app at [pennora.cv](https://pennora.cv) runs entirely on Cloudflare — not Docker, not a VPS.

Pennora uses two Cloudflare products on the **same domain**:

| Service | Cloudflare product | Handles |
|---------|-------------------|---------|
| Frontend | **Pages** | React SPA (`/`, `/budget`, `/settings`, …) |
| API | **Worker** | `/api/*` (auth, oRPC, config) |
| Database | **D1** | SQLite-compatible persistent storage |

HTTPS and the custom domain are managed by Cloudflare automatically once DNS is on Cloudflare.

## Architecture

```
                         ┌──────────────────────────────┐
  Browser (HTTPS)  ────► │  pennora.cv (Cloudflare)    │
                         │                              │
                         │  /api/*  ──► Worker (Hono)   │
                         │              │               │
                         │              ▼               │
                         │           D1 database        │
                         │                              │
                         │  /*      ──► Pages (Vite)    │
                         │              SPA assets      │
                         └──────────────────────────────┘
```

The web client calls `/api/rpc` and `/api/auth` on the **same origin** (`window.location.origin`), so the Worker must be routed on `pennora.cv/api/*` and Pages must **not** intercept those paths.

## Prerequisites

- A [Cloudflare account](https://dash.cloudflare.com/sign-up)
- A domain added to Cloudflare (e.g. `pennora.cv`)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/) v3+
- [Bun](https://bun.sh) 1.3+ (for building locally)

Log in:

```bash
npx wrangler login
```

## 1. Create the D1 database

From the repo root:

```bash
npx wrangler d1 create pennora
```

Copy the `database_id` from the output into [`apps/server/wrangler.toml`](../apps/server/wrangler.toml):

```toml
[[d1_databases]]
binding = "DB"
database_name = "pennora"
database_id = "<paste-database-id-here>"
```

Apply migrations to the **remote** database:

```bash
npx wrangler d1 migrations apply pennora --remote --config apps/server/wrangler.toml
```

To inspect data:

```bash
npx wrangler d1 execute pennora --remote --command "SELECT name FROM sqlite_master WHERE type='table';"
```

### Local D1 (optional, for Worker dev)

```bash
npx wrangler d1 migrations apply pennora --local --config apps/server/wrangler.toml
npx wrangler dev --config apps/server/wrangler.toml
```

## 2. Configure the API Worker

Edit [`apps/server/wrangler.toml`](../apps/server/wrangler.toml) and set production URLs:

```toml
[vars]
BETTER_AUTH_URL = "https://pennora.cv"
APP_URL = "https://pennora.cv"
```

### Secrets

Set sensitive values with Wrangler (never commit these):

```bash
# Required — generate with: openssl rand -base64 32
npx wrangler secret put BETTER_AUTH_SECRET --config apps/server/wrangler.toml

# Optional — Google OAuth
npx wrangler secret put GOOGLE_CLIENT_ID --config apps/server/wrangler.toml
npx wrangler secret put GOOGLE_CLIENT_SECRET --config apps/server/wrangler.toml

# Optional — Resend email
npx wrangler secret put RESEND_API_KEY --config apps/server/wrangler.toml
```

| Secret / var | Required | Description |
|--------------|----------|-------------|
| `BETTER_AUTH_SECRET` | Yes | Session signing secret (≥ 32 chars) |
| `BETTER_AUTH_URL` | Yes | Public app URL (`https://pennora.cv`) |
| `APP_URL` | Yes | Used in invite links (usually same as above) |
| `GOOGLE_CLIENT_ID` | No | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | No | Google OAuth client secret |
| `RESEND_API_KEY` | No | Resend API key |
| `EMAIL_FROM` | No | Sender address (set as a `[vars]` entry if using Resend) |

### Deploy the Worker

```bash
npx wrangler deploy --config apps/server/wrangler.toml
```

### Attach the Worker route

In the [Cloudflare dashboard](https://dash.cloudflare.com) → **Workers & Pages** → your `pennora-api` worker → **Settings** → **Triggers** → **Routes**, add:

| Route | Zone |
|-------|------|
| `pennora.cv/api/*` | `pennora.cv` |

Or uncomment and fill in the `routes` block in `wrangler.toml`, then redeploy.

Verify:

```bash
curl -s https://pennora.cv/api/config
# → {"googleEnabled":false,"emailEnabled":false}
```

## 3. Deploy the frontend (Cloudflare Pages)

### Build

```bash
bun install
bun run --cwd apps/web build
```

Output directory: `apps/web/dist`

### Create the Pages project (first time)

```bash
npx wrangler pages project create pennora --production-branch main
```

### Deploy

```bash
npx wrangler pages deploy apps/web/dist --project-name pennora
```

### Custom domain

In **Workers & Pages** → **pennora** (Pages) → **Custom domains**, add:

```
pennora.cv
www.pennora.cv   # optional
```

Cloudflare provisions TLS automatically.

### SPA routing

Pages must serve `index.html` for client-side routes. Add [`apps/web/public/_routes.json`](../apps/web/public/_routes.json) (included in the build output):

```json
{
  "version": 1,
  "include": ["/*"],
  "exclude": ["/api/*"]
}
```

The `exclude` rule ensures `/api/*` requests reach the Worker, not Pages.

## 4. Google OAuth (production)

1. Open [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials).
2. Create a **Web application** OAuth client.
3. Configure:

| Field | Value |
|-------|-------|
| Authorized JavaScript origins | `https://pennora.cv` |
| Authorized redirect URIs | `https://pennora.cv/api/auth/callback/google` |

4. Store the client ID and secret as Worker secrets (step 2).
5. Redeploy the Worker if you changed vars.

## 5. Email with Resend (optional)

1. Create an account at [Resend](https://resend.com).
2. Verify your sending domain (e.g. `pennora.cv`).
3. Set `RESEND_API_KEY` as a Worker secret.
4. Add to `wrangler.toml` `[vars]`:

   ```toml
   EMAIL_FROM = "Pennora <noreply@pennora.cv>"
   ```

Without email, password reset and invite links still work — users copy the link from the UI.

## 6. Local deploy script

Instead of CI/CD, Pennora uses a local deploy script (`deploy.sh`) that handles everything:

### First-time setup

```bash
cp .env.deploy.example .env.deploy
# Edit .env.deploy with your Cloudflare API token and account ID
```

### Deploy everything

```bash
./deploy.sh
```

This will:
1. Create the D1 database if it doesn't exist
2. Create the R2 bucket if it doesn't exist
3. Update `wrangler.toml` with the database ID
4. Apply D1 migrations
5. Build the frontend
6. Deploy the API worker
7. Deploy the Pages frontend

### Partial deploys

```bash
./deploy.sh --only api   # deploy only the API worker (+ migrations)
./deploy.sh --only web   # deploy only the Pages frontend
./deploy.sh --only db    # run migrations only
```

### npm scripts

```bash
bun run deploy         # full deploy
bun run deploy:api     # API only
bun run deploy:web     # Pages only
bun run deploy:db      # migrations only
```

### Secrets

After the first deploy, set sensitive values with Wrangler:

```bash
npx wrangler secret put BETTER_AUTH_SECRET --config apps/server/wrangler.toml
npx wrangler secret put GOOGLE_CLIENT_ID --config apps/server/wrangler.toml
npx wrangler secret put GOOGLE_CLIENT_SECRET --config apps/server/wrangler.toml
npx wrangler secret put RESEND_API_KEY --config apps/server/wrangler.toml
```

## 7. Updates

After pulling new code:

```bash
./deploy.sh
```

Or for targeted deploys:

```bash
./deploy.sh --only api   # API + migrations
./deploy.sh --only web   # frontend only
```

## 8. Backups (D1)

Export the remote database periodically:

```bash
npx wrangler d1 export pennora --remote --output pennora-backup-$(date +%Y%m%d).sql
```

Store exports off Cloudflare (S3, R2, local disk).

To restore, use `wrangler d1 execute` with the SQL file or import via the dashboard.

## 9. Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| `404` on `/api/config` | Worker route missing | Add `pennora.cv/api/*` route to the Worker |
| `404` on `/api/config` | Pages intercepting `/api` | Ensure `_routes.json` excludes `/api/*` |
| Auth redirect loop | Wrong `BETTER_AUTH_URL` | Must be exactly `https://pennora.cv` (no trailing slash) |
| Google login fails | Redirect URI mismatch | Use `https://pennora.cv/api/auth/callback/google` in Google Console |
| CORS errors | Origin not trusted | Set `BETTER_AUTH_URL` and `APP_URL` to production URL |
| Empty app after deploy | D1 migrations not applied | Run `wrangler d1 migrations apply … --remote` |
| SPA routes 404 on refresh | Pages SPA fallback missing | Confirm `_routes.json` is in `apps/web/public/` |

## 10. Security checklist

- [ ] Strong `BETTER_AUTH_SECRET` (32+ random bytes via `wrangler secret`)
- [ ] Secrets only in Wrangler — never in git or Pages env unless necessary
- [ ] Worker route scoped to `/api/*` only
- [ ] Cloudflare **SSL/TLS** mode: Full (strict)
- [ ] Regular D1 exports
- [ ] API token scoped to minimum required permissions

## Local development vs production

| | Local (`bun run dev`) | Cloudflare production |
|--|----------------------|------------------------|
| Frontend | Vite dev server `:5173` | Pages CDN |
| API | Bun server `:3001` | Worker |
| Database | SQLite file (`data.db`) | D1 |
| Env file | `.env` | `wrangler.toml` + secrets |

Docker Compose (`bun run start`) is available for local full-stack testing without Cloudflare — it is **not** the production deployment path.
