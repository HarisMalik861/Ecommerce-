#!/usr/bin/env bash
# Tail container logs.
# Usage: ./deploy/scripts/logs.sh [--all]

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/config.sh"
require_cmd ssh

TAIL_ARG="--tail=200 -f"
if [[ "${1:-}" == "--all" ]]; then
  TAIL_ARG="-f"
fi

color_blue "Tailing logs for ${CONTAINER_NAME} on ${DROPLET_HOST} (Ctrl+C to exit) ..."
exec ssh -t "${SSH_COMMON_OPTS[@]}" "${DROPLET_SSH}" \
  "cd '${REMOTE_APP}' && docker compose logs ${TAIL_ARG} ${CONTAINER_NAME}"
