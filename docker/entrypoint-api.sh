#!/bin/sh
set -e

if [ -z "$BETTER_AUTH_SECRET" ]; then
  echo "[entrypoint] ERROR: BETTER_AUTH_SECRET is required."
  echo "[entrypoint] Set it in your .env (or environment), e.g.:"
  echo "  openssl rand -base64 32"
  echo "  # then: BETTER_AUTH_SECRET=<output>"
  exit 1
fi

if [ -n "$DATABASE_URL" ]; then
  echo "[entrypoint] Waiting for database..."
  host=$(echo "$DATABASE_URL" | sed -n 's|.*@\([^:/]*\).*|\1|p')
  port=$(echo "$DATABASE_URL" | sed -n 's|.*:\([0-9]*\)/.*|\1|p')
  : "${port:=5432}"
  for i in $(seq 1 30); do
    if nc -z "$host" "$port" 2>/dev/null; then break; fi
    sleep 2
  done
fi

echo "[entrypoint] Running migrations..."
if ! bun run /app/dist/migrate.js; then
  echo "[entrypoint] ERROR: migrations failed"
  exit 1
fi

exec "$@"
