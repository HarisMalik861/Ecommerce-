#!/usr/bin/env bash
# Tail nginx + certbot logs.
# Usage: ./deploy/scripts/tls-logs.sh [nginx|certbot]

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/config.sh"
require_cmd ssh

SERVICE="${1:-}"

color_blue "Tailing logs (Ctrl+C to exit) ..."
exec ssh -t "${SSH_COMMON_OPTS[@]}" "${DROPLET_SSH}" \
  "cd '${REMOTE_APP}' && docker compose -f docker-compose.yml -f docker-compose.tls.yml logs --tail=200 -f ${SERVICE}"
