# Deployment guide

This guide covers deploying Pennora to a production environment. The recommended path for most self-hosted setups is **Docker Compose** behind a reverse proxy with HTTPS.

## Architecture

```
                    ┌─────────────────┐
   Browser ────────►│ Reverse proxy   │  (Caddy / Nginx / Traefik)
   HTTPS            │  :443           │
                    └────────┬────────┘
                             │
              ┌──────────────┴──────────────┐
              ▼                             ▼
     ┌────────────────┐           ┌────────────────┐
     │  web (nginx)   │  /api     │  server (Bun)  │
     │  :80           │──────────►│  :3001         │
     │  static SPA    │  proxy    │  Hono + oRPC   │
     └────────────────┘           └───────┬────────┘
                                          │
                                          ▼
                                 ┌────────────────┐
                                 │ SQLite volume  │
                                 │  /data/data.db │
                                 └────────────────┘
```

In Docker Compose, the `web` container serves the built React app and proxies `/api` to the `server` container. The API never needs to be exposed publicly if all traffic goes through `web`.

## Prerequisites

- A Linux server (VPS, homelab, etc.) with Docker and Docker Compose v2
- A domain name pointing to the server (e.g. `pennora.example.com`)
- TLS termination (Caddy, Nginx, or Traefik recommended)

## 1. Prepare environment variables

Create `.env.docker` on the server (never commit production secrets):

```env
# Required — generate with: openssl rand -base64 32
BETTER_AUTH_SECRET=your-production-secret-min-32-chars

# Public URL users visit (must match your domain + scheme)
BETTER_AUTH_URL=https://pennora.example.com
APP_URL=https://pennora.example.com

# Optional — Google OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Optional — transactional email (Resend)
RESEND_API_KEY=
EMAIL_FROM=Pennora <noreply@pennora.example.com>
```

### Variable reference

| Variable | Required | Description |
|----------|----------|-------------|
| `BETTER_AUTH_SECRET` | Yes | Session signing secret (≥ 32 chars). Rotate invalidates all sessions. |
| `BETTER_AUTH_URL` | Yes | Public origin for auth callbacks. Must match the URL in the browser. |
| `APP_URL` | Yes | Same as `BETTER_AUTH_URL` in most setups. Used in invite links. |
| `GOOGLE_CLIENT_ID` | No | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | No | Google OAuth client secret |
| `RESEND_API_KEY` | No | Resend API key for email |
| `EMAIL_FROM` | No | Sender address (required if `RESEND_API_KEY` is set) |

## 2. Build and run with Docker Compose

```bash
git clone https://github.com/xenonwellz/pennora.git
cd pennora

# Edit .env.docker with production values
docker compose --env-file .env.docker up --build -d
```

Default exposed ports:

| Port | Service |
|------|---------|
| `8080` | Web (nginx + SPA) |
| `3001` | API (optional direct access) |

Verify:

```bash
curl -s http://localhost:8080/api/config
```

You should receive JSON with `googleEnabled` and `emailEnabled` flags.

## 3. Reverse proxy and HTTPS

Point your reverse proxy at the `web` container on port `8080` (or map `80:80` in Compose if the proxy runs on the host).

### Caddy example

```
pennora.example.com {
    reverse_proxy localhost:8080
}
```

Caddy handles TLS automatically via Let's Encrypt.

### Nginx example

```nginx
server {
    listen 443 ssl http2;
    server_name pennora.example.com;

    ssl_certificate     /etc/letsencrypt/live/pennora.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/pennora.example.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

After enabling HTTPS, update `.env.docker`:

```env
BETTER_AUTH_URL=https://pennora.example.com
APP_URL=https://pennora.example.com
```

Restart the stack:

```bash
docker compose --env-file .env.docker up -d
```

## 4. Google OAuth (optional)

1. Create credentials at [Google Cloud Console](https://console.cloud.google.com/apis/credentials).
2. Application type: **Web application**.
3. **Authorized JavaScript origins**: `https://pennora.example.com`
4. **Authorized redirect URIs**: `https://pennora.example.com/api/auth/callback/google`
5. Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `.env.docker` and restart.

## 5. Email with Resend (optional)

1. Create an account at [Resend](https://resend.com).
2. Verify your sending domain.
3. Set `RESEND_API_KEY` and `EMAIL_FROM` in `.env.docker`.
4. Restart the server container.

Without email configured, password reset and invite links are still created but must be copied manually from the UI.

## 6. Database persistence and backups

SQLite data is stored in the Docker volume `sqldata` (mounted at `/data` in the server container).

### Backup

```bash
docker compose exec server cp /data/data.db /data/data.db.backup
docker cp "$(docker compose ps -q server)":/data/data.db ./pennora-backup-$(date +%Y%m%d).db
```

### Restore

Stop the stack, replace the database file in the volume, then start again.

> **Tip:** Schedule nightly backups with cron and store copies off-server.

## 7. Updates

```bash
cd pennora
git pull
docker compose --env-file .env.docker up --build -d
```

Migrations run automatically on server startup.

## 8. Manual deployment (without Docker)

For advanced setups where you run Bun and nginx directly:

### Build

```bash
bun install
bun run build
```

### Server

```bash
export BETTER_AUTH_SECRET=...
export BETTER_AUTH_URL=https://pennora.example.com
export APP_URL=https://pennora.example.com
export DB_PATH=/var/lib/pennora/data.db
export PORT=3001

bun run --cwd apps/server start
```

Use a process manager (systemd, PM2) to keep the server running.

### Web

Serve `apps/web/dist` with nginx. Use the provided [`apps/web/nginx.conf`](../apps/web/nginx.conf) as a starting point — update `proxy_pass` to point at your API host.

Add your production origin to CORS in `apps/server/src/index.ts` if it is not already covered by `BETTER_AUTH_URL` / `APP_URL`.

## 9. Health checks

| Endpoint | Expected |
|----------|----------|
| `GET /api/config` | `200` JSON |
| `GET /` (web) | `200` HTML |

## 10. Troubleshooting

| Symptom | Likely cause |
|---------|--------------|
| Auth redirects fail | `BETTER_AUTH_URL` does not match the browser URL (scheme, host, port) |
| Google login error | Redirect URI mismatch in Google Console |
| CORS errors | Production origin not in server CORS list |
| Empty database after restart | Volume not mounted; check `docker volume ls` |
| 502 on `/api` | Server container not running or nginx `proxy_pass` misconfigured |

## Security checklist

- [ ] Strong `BETTER_AUTH_SECRET` (32+ random bytes)
- [ ] HTTPS everywhere in production
- [ ] Do not expose port `3001` publicly unless required
- [ ] Regular SQLite backups
- [ ] Keep Docker images and dependencies updated
- [ ] Restrict server SSH access
