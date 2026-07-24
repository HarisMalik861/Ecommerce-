#!/usr/bin/env bash
# SSH into the droplet, dropping into /root/ecommerce/app by default.
# Usage: ./deploy/scripts/ssh.sh [extra ssh args]

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/config.sh"
require_cmd ssh

color_blue "Connecting to ${DROPLET_SSH} ..."
exec ssh "${SSH_COMMON_OPTS[@]}" -t "$@" "${DROPLET_SSH}" \
  "cd ${REMOTE_APP} 2>/dev/null || cd ~ ; exec \$SHELL -l"
