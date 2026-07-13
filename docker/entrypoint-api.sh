#!/bin/sh
set -e

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
cd /app && bun run drizzle-kit migrate 2>&1 || echo "[entrypoint] Migrations skipped or failed"

exec "$@"
