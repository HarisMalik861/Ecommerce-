#!/usr/bin/env bash
# Restore the application database from a pg_dump custom-format file.
# Usage: ./deploy/scripts/restore-db.sh [path/to/dump.sql]   (default: epv3.sql)
#
# WARNING: This DROPS the existing 'ep' database on the droplet. All data lost.

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/config.sh"
require_cmd ssh
require_cmd scp

DUMP_NAME="${1:-epv3.sql}"
LOCAL_DUMP="${REPO_ROOT}/${DUMP_NAME}"
REMOTE_DUMP="${REMOTE_APP}/${DUMP_NAME}"

if [[ ! -f "${LOCAL_DUMP}" ]]; then
  color_red "Local dump not found: ${LOCAL_DUMP}"
  exit 1
fi

DUMP_TYPE=$(file -b "${LOCAL_DUMP}" 2>/dev/null || echo "")
if ! echo "${DUMP_TYPE}" | grep -qi "PostgreSQL custom database dump"; then
  color_yellow "Warning: ${LOCAL_DUMP} type: ${DUMP_TYPE}"
  color_yellow "Expected: 'PostgreSQL custom database dump'. Continuing anyway."
fi

color_yellow "About to:"
echo "  1. Upload   ${LOCAL_DUMP}"
echo "              -> ${DROPLET_SSH}:${REMOTE_DUMP}"
echo "  2. List     dump table-of-contents"
echo "  3. DROP     database '${APP_DB_NAME}' on the droplet (DESTRUCTIVE)"
echo "  4. CREATE   database '${APP_DB_NAME}'"
echo "  5. RESTORE  the dump into '${APP_DB_NAME}'"
echo "  6. RESTART  ecommerce-app container"
read -r -p "Proceed? (y/N): " confirm
case "${confirm}" in
  y|Y|yes|YES) ;;
  *) color_yellow "Aborted."; exit 0 ;;
esac

# 1. Upload via scp (binary safe, no shell tricks).
color_blue "Uploading dump to droplet ..."
ssh_remote "mkdir -p '${REMOTE_APP}'"
scp "${SSH_COMMON_OPTS[@]}" "${LOCAL_DUMP}" "${DROPLET_SSH}:${REMOTE_DUMP}"

# 2. Show what's inside.
color_blue "Dump table-of-contents (first 40 entries):"
ssh_remote "docker exec -i '${POSTGRES_CONTAINER}' pg_restore -l < '${REMOTE_DUMP}' | grep -E '^[0-9]' | head -40 || true"

# 3. & 4. Drop and recreate.
color_blue "Dropping database '${APP_DB_NAME}' ..."
ssh_remote "docker exec -i '${POSTGRES_CONTAINER}' psql -U '${POSTGRES_USER}' -d postgres -c \"DROP DATABASE IF EXISTS ${APP_DB_NAME} WITH (FORCE);\""

color_blue "Creating database '${APP_DB_NAME}' ..."
ssh_remote "docker exec -i '${POSTGRES_CONTAINER}' psql -U '${POSTGRES_USER}' -d postgres -c \"CREATE DATABASE ${APP_DB_NAME};\""

# 5. Restore.
color_blue "Restoring dump into '${APP_DB_NAME}' (this may take a moment) ..."
ssh_remote "docker exec -i '${POSTGRES_CONTAINER}' pg_restore -U '${POSTGRES_USER}' -d '${APP_DB_NAME}' --no-owner --no-privileges < '${REMOTE_DUMP}'" \
  || color_yellow "pg_restore reported errors (often harmless; usually 'role does not exist' or 'extension already exists')."

color_green "Tables now in ${APP_DB_NAME}:"
ssh_remote "docker exec -i '${POSTGRES_CONTAINER}' psql -U '${POSTGRES_USER}' -d '${APP_DB_NAME}' -c '\\dt'"

color_green "Row counts:"
ssh_remote "docker exec -i '${POSTGRES_CONTAINER}' psql -U '${POSTGRES_USER}' -d '${APP_DB_NAME}' -c \"
  SELECT schemaname, relname AS table, n_live_tup AS rows
  FROM pg_stat_user_tables
  ORDER BY relname;
\""

# 6. Restart app so the pg pool reconnects against the fresh DB.
color_blue "Restarting ecommerce-app ..."
ssh_remote "cd '${REMOTE_APP}' && docker compose restart ${CONTAINER_NAME}" || true

color_green "Done. Verify:"
echo "  curl http://${DROPLET_HOST}:${APP_PORT}/api/health/db"
