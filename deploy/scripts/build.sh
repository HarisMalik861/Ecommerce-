#!/usr/bin/env bash
# Build the ecommerce-app Docker image on the droplet.
# Pass --no-cache to force a clean build.
# Usage: ./deploy/scripts/build.sh [--no-cache]

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/config.sh"
require_cmd ssh

EXTRA_ARGS=("$@")

color_blue "Preparing Docker build context from ${REMOTE_BACKEND} ..."
ssh_remote "
  set -e
  mkdir -p '${REMOTE_APP}/Backend'
  test -f '${REMOTE_BACKEND}/requirements.txt'
  cp '${REMOTE_BACKEND}/requirements.txt' '${REMOTE_APP}/Backend/requirements.txt'
  cp '${REMOTE_BACKEND}'/*.py '${REMOTE_APP}/Backend/'
  ls -1 '${REMOTE_APP}/Backend' >/dev/null
"

color_blue "Building image on ${DROPLET_HOST} (cwd=${REMOTE_APP}) ..."
ssh_remote "cd '${REMOTE_APP}' && docker compose build ${EXTRA_ARGS[*]:-}"

color_green "Build complete."
