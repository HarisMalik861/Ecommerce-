#!/usr/bin/env bash
# Bootstrap the application database on the existing postgres container.
# Idempotent: safe to re-run (uses CREATE IF NOT EXISTS / IF NOT EXISTS).
# Usage: ./deploy/scripts/init-db.sh [--seed-admin]

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/config.sh"
require_cmd ssh

SEED_ADMIN=0
for arg in "$@"; do
  case "${arg}" in
    --seed-admin) SEED_ADMIN=1 ;;
    *) color_yellow "Ignoring unknown arg: ${arg}" ;;
  esac
done

color_blue "Creating database '${APP_DB_NAME}' (if missing) ..."
ssh_remote "docker exec -i '${POSTGRES_CONTAINER}' psql -U '${POSTGRES_USER}' < '${REMOTE_APP}/deploy/init-db.sql'"

color_blue "Applying base schema ..."
ssh_remote "docker exec -i '${POSTGRES_CONTAINER}' psql -U '${POSTGRES_USER}' -d '${APP_DB_NAME}' -v ON_ERROR_STOP=0 < '${REMOTE_APP}/Frontend/schema.sql'" || \
  color_yellow "schema.sql may have already been applied (continuing)"

color_blue "Applying migrations ..."
ssh_remote "docker exec -i '${POSTGRES_CONTAINER}' psql -U '${POSTGRES_USER}' -d '${APP_DB_NAME}' -v ON_ERROR_STOP=1 < '${REMOTE_APP}/Frontend/migrations/20260301_add_contact_number_to_users.sql'"
ssh_remote "docker exec -i '${POSTGRES_CONTAINER}' psql -U '${POSTGRES_USER}' -d '${APP_DB_NAME}' -v ON_ERROR_STOP=1 < '${REMOTE_APP}/Frontend/migrations/20260301_make_email_optional.sql'"

if [[ "${SEED_ADMIN}" == "1" ]]; then
  color_blue "Seeding admin user (admin@example.com / admin123) ..."
  ssh_remote "docker compose -f '${REMOTE_APP}/docker-compose.yml' --env-file '${REMOTE_APP}/.env' exec -T '${CONTAINER_NAME}' node scripts/create-admin.js" || \
    color_yellow "Admin seed skipped (already exists or app not running yet)."
fi

color_green "Database bootstrap complete."
