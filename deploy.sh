#!/usr/bin/env bash
set -euo pipefail

#
# Local deploy script for Pennora (Cloudflare)
#
# Usage:
#   ./deploy.sh              # full deploy
#   ./deploy.sh --only api   # deploy only the API worker
#   ./deploy.sh --only web   # deploy only the Pages frontend
#   ./deploy.sh --only db    # run migrations only
#
# Prerequisites:
#   1. Copy .env.deploy.example -> .env.deploy and fill in your values
#   2. Install wrangler: bun add -g wrangler (or npx wrangler)
#   3. Run: ./deploy.sh
#

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_DEPLOY="$SCRIPT_DIR/.env.deploy"
WRANGLER_CONFIG="$SCRIPT_DIR/wrangler.worker.toml"
WRANGLER_PAGES_CONFIG="$SCRIPT_DIR/wrangler.pages.toml"
WEB_DIST="$SCRIPT_DIR/apps/web/dist"

# --- Colors ---
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

info() { echo -e "${BLUE}▸${NC} $*"; }
ok() { echo -e "${GREEN}✔${NC} $*"; }
warn() { echo -e "${YELLOW}⚠${NC} $*"; }
fail() {
    echo -e "${RED}✖${NC} $*"
    exit 1
}

# --- Load .env.deploy ---
if [[ ! -f "$ENV_DEPLOY" ]]; then
    fail "Missing .env.deploy — copy .env.deploy.example and fill in your values."
fi

set -a
# shellcheck source=/dev/null
source "$ENV_DEPLOY"
set +a

# Validate required vars
for var in CLOUDFLARE_API_TOKEN CLOUDFLARE_ACCOUNT_ID PROJECT_NAME; do
    if [[ -z "${!var:-}" ]]; then
        fail "Missing required variable: $var"
    fi
done

export CLOUDFLARE_API_TOKEN
export CLOUDFLARE_ACCOUNT_ID

# Defaults
BETTER_AUTH_URL="${BETTER_AUTH_URL:-https://pennora.cv}"
APP_URL="${APP_URL:-https://pennora.cv}"
EMAIL_FROM="${EMAIL_FROM:-Pennora <noreply@pennora.cv>}"

# D1_DATABASE_ID — use from .env.deploy if set, otherwise auto-create
if [[ -n "${D1_DATABASE_ID:-}" ]]; then
    export D1_DATABASE_ID
fi

# --- Parse args ---
DEPLOY_ONLY=""
while [[ $# -gt 0 ]]; do
    case "$1" in
    --only)
        DEPLOY_ONLY="$2"
        shift 2
        ;;
    *) fail "Unknown argument: $1" ;;
    esac
done

# --- Helper: get or create D1 database ---
get_or_create_db() {
    local db_name="$PROJECT_NAME"

    info "Looking for D1 database '$db_name'..."

    # Try to list existing databases and find one with this name
    local existing
    existing=$(wrangler d1 list --json 2>/dev/null | jq -r --arg name "$db_name" '.[] | select(.name == $name) | .uuid' 2>/dev/null || true)

    if [[ -n "$existing" ]]; then
        ok "Found existing D1 database: $existing"
        echo "$existing"
        return
    fi

    info "Creating new D1 database '$db_name'..."
    local output
    output=$(wrangler d1 create "$db_name" 2>&1)
    echo "$output"

    # Extract database ID from output
    local db_id
    db_id=$(echo "$output" | grep -oP 'database_id = "\K[^"]+' || true)

    if [[ -z "$db_id" ]]; then
        # Try alternative parsing
        db_id=$(echo "$output" | grep -oP 'ID:\s*\K\S+' || true)
    fi

    if [[ -z "$db_id" ]]; then
        fail "Failed to extract database ID from wrangler output"
    fi

    ok "Created D1 database: $db_id"
    echo "$db_id"
}

# --- Helper: get or create R2 bucket ---
get_or_create_r2() {
    local bucket_name="$PROJECT_NAME"

    info "Looking for R2 bucket '$bucket_name'..."

    local existing
    existing=$(wrangler r2 bucket list 2>/dev/null | grep -w "$bucket_name" || true)

    if [[ -n "$existing" ]]; then
        ok "Found existing R2 bucket: $bucket_name"
        return
    fi

    info "Creating new R2 bucket '$bucket_name'..."
    wrangler r2 bucket create "$bucket_name"
    ok "Created R2 bucket: $bucket_name"
}

# --- Helper: update wrangler.toml with database ID ---
update_wrangler_config() {
    local db_id="$1"

    info "Exporting D1_DATABASE_ID..."
    export D1_DATABASE_ID="$db_id"
    ok "D1_DATABASE_ID=$db_id"
}

# --- Step: Install dependencies ---
install_deps() {
    info "Installing dependencies..."
    bun install
    ok "Dependencies installed"
}

# --- Step: Apply D1 migrations ---
apply_migrations() {
    info "Applying D1 migrations..."
    wrangler d1 migrations apply "$PROJECT_NAME" --remote --config "$WRANGLER_CONFIG"
    ok "D1 migrations applied"
}

# --- Step: Build frontend ---
build_web() {
    info "Building frontend..."
    bun run --cwd apps/web build
    ok "Frontend built"
}

# --- Step: Deploy API worker ---
deploy_api() {
    info "Deploying API worker..."
    wrangler deploy --config "$WRANGLER_CONFIG"
    ok "API worker deployed"
}

# --- Step: Deploy Pages ---
deploy_pages() {
    if [[ ! -d "$WEB_DIST" ]]; then
        fail "Frontend dist not found at $WEB_DIST — run with no --only flag or --only web first"
    fi

    info "Deploying Pages..."
    wrangler pages deploy "$WEB_DIST" --project-name "$PROJECT_NAME" --config "$WRANGLER_PAGES_CONFIG"
    ok "Pages deployed"
}

# --- Main ---
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  Pennora Deploy${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Always ensure infrastructure exists
install_deps

if [[ -z "${D1_DATABASE_ID:-}" ]]; then
    DB_ID=$(get_or_create_db)
    export D1_DATABASE_ID="$DB_ID"
else
    info "Using existing D1_DATABASE_ID: $D1_DATABASE_ID"
fi

get_or_create_r2

echo ""

case "$DEPLOY_ONLY" in
api)
    apply_migrations
    deploy_api
    ;;
web)
    build_web
    deploy_pages
    ;;
db)
    apply_migrations
    ;;
"")
    apply_migrations
    build_web
    deploy_api
    deploy_pages
    ;;
*)
    fail "Unknown --only value: $DEPLOY_ONLY (use 'api', 'web', or 'db')"
    ;;
esac

echo ""
ok "Deploy complete!"
echo ""
