#!/usr/bin/env bash
# Manually renew the certificate (the certbot container does this every 12h
# automatically, but this triggers it on demand).
# Usage:
#   ./deploy/scripts/tls-renew.sh
#   ./deploy/scripts/tls-renew.sh --force   # force renew even if not near expiry

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/config.sh"
require_cmd ssh

EXTRA=""
[[ "${1:-}" == "--force" ]] && EXTRA="--force-renewal"

color_blue "Running certbot renew ..."
ssh_remote "cd '${REMOTE_APP}' && docker compose -f docker-compose.yml -f docker-compose.tls.yml run --rm certbot renew --webroot -w /var/www/certbot ${EXTRA}"

color_blue "Reloading nginx ..."
ssh_remote "cd '${REMOTE_APP}' && docker compose -f docker-compose.yml -f docker-compose.tls.yml exec nginx nginx -s reload"

color_green "Renewal complete."
