#!/usr/bin/env bash
# Bring up nginx + certbot containers (after tls-init.sh has issued certs).
# Usage: ./deploy/scripts/tls-up.sh [--restart]

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/config.sh"
require_cmd ssh

ACTION="up -d"
[[ "${1:-}" == "--restart" ]] && ACTION="restart nginx certbot"

color_blue "Bringing up TLS layer (nginx + certbot) ..."
ssh_remote "cd '${REMOTE_APP}' && docker compose -f docker-compose.yml -f docker-compose.tls.yml ${ACTION}"

color_green "Done."
