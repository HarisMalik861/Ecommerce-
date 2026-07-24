#!/usr/bin/env bash
# Shared deployment config. Override via environment if needed.

DROPLET_USER="${DROPLET_USER:-root}"
DROPLET_HOST="${DROPLET_HOST:-68.183.179.83}"
DROPLET_SSH="${DROPLET_USER}@${DROPLET_HOST}"
SSH_COMMON_OPTS=(
  -o StrictHostKeyChecking=accept-new
  # Avoid broken ControlMaster sockets from ~/.ssh/config on Git Bash.
  -o ControlMaster=no
)

REMOTE_BASE="${REMOTE_BASE:-/root/ecommerce}"
REMOTE_APP="${REMOTE_APP:-${REMOTE_BASE}/app}"
REMOTE_BACKEND="${REMOTE_BACKEND:-${REMOTE_BASE}/Backend}"
REMOTE_FRONTEND_DATA="${REMOTE_FRONTEND_DATA:-${REMOTE_BASE}/Frontend-data}"

POSTGRES_CONTAINER="${POSTGRES_CONTAINER:-postgres}"
POSTGRES_USER="${POSTGRES_USER:-postgres}"
APP_DB_NAME="${APP_DB_NAME:-ep}"
POSTGRES_PASSWORD_DEFAULT="${POSTGRES_PASSWORD_DEFAULT:-umerfarooq}"
DATABASE_URL_DEFAULT="postgresql://postgres:${POSTGRES_PASSWORD_DEFAULT}@postgres:5432/${APP_DB_NAME}"
DATABASE_URL_NATIVE_DEFAULT="postgresql://postgres:${POSTGRES_PASSWORD_DEFAULT}@localhost:5432/${APP_DB_NAME}"
APP_PORT="${APP_PORT:-4001}"
CONTAINER_NAME="${CONTAINER_NAME:-ecommerce-app}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

color_blue()  { printf "\033[1;34m%s\033[0m\n" "$*"; }
color_green() { printf "\033[1;32m%s\033[0m\n" "$*"; }
color_red()   { printf "\033[1;31m%s\033[0m\n" "$*" >&2; }
color_yellow(){ printf "\033[1;33m%s\033[0m\n" "$*"; }

ssh_remote() {
  ssh "${SSH_COMMON_OPTS[@]}" "${DROPLET_SSH}" "$@"
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || { color_red "Missing required command: $1"; exit 1; }
}
