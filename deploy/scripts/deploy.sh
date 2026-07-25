#!/usr/bin/env bash
# Bring the app up on the droplet (uses already-built image; rebuilds if missing).
# Usage: ./deploy/scripts/deploy.sh [--build] [--restart]

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/config.sh"
require_cmd ssh
require_cmd curl || true

DO_BUILD=0
DO_RESTART=0
for arg in "$@"; do
  case "${arg}" in
    --build)   DO_BUILD=1 ;;
    --restart) DO_RESTART=1 ;;
    *) color_yellow "Ignoring unknown arg: ${arg}" ;;
  esac
done

color_blue "Verifying remote prerequisites ..."
ssh_remote "test -f '${REMOTE_APP}/.env' || (echo 'Missing ${REMOTE_APP}/.env (POSTGRES_NETWORK)'; exit 1)"
ssh_remote "test -f '${REMOTE_APP}/.env.production' || (echo 'Missing ${REMOTE_APP}/.env.production'; exit 1)"
ssh_remote "test -d '${REMOTE_BACKEND}' || (echo 'Missing ${REMOTE_BACKEND} (run copy.sh backend)'; exit 1)"

if [[ "${DO_BUILD}" == "1" ]]; then
  color_blue "Building image ..."
  ssh_remote "cd '${REMOTE_APP}' && docker compose build"
fi

if [[ "${DO_RESTART}" == "1" ]]; then
  color_blue "Restarting container ..."
  ssh_remote "cd '${REMOTE_APP}' && docker compose restart"
else
  color_blue "Starting container (compose up -d) ..."
  ssh_remote "cd '${REMOTE_APP}' && docker compose up -d"
fi

color_blue "Recent logs:"
ssh_remote "cd '${REMOTE_APP}' && docker compose logs --tail=40 ${CONTAINER_NAME}" || true

color_blue "Smoke test: GET http://${DROPLET_HOST}:${APP_PORT}/"
sleep 3
HTTP_CODE=$(ssh_remote "curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:${APP_PORT}/" || echo "000")
if [[ "${HTTP_CODE}" =~ ^2 ]]; then
  color_green "App is up. Homepage returned ${HTTP_CODE}."
else
  color_yellow "Smoke test got HTTP ${HTTP_CODE}. Tail logs with: ./deploy/scripts/logs.sh"
fi

color_blue "Database smoke test: GET http://${DROPLET_HOST}:${APP_PORT}/api/health/db"
DB_HTTP_CODE=$(ssh_remote "curl -s -o /tmp/ecommerce-db-health.json -w '%{http_code}' http://127.0.0.1:${APP_PORT}/api/health/db && echo && cat /tmp/ecommerce-db-health.json" || echo "000")
printf '%s\n' "${DB_HTTP_CODE}"

color_green "Deploy finished. Open: http://${DROPLET_HOST}:${APP_PORT}"
