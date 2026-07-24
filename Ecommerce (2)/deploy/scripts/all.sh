#!/usr/bin/env bash
# End-to-end first-time deployment.
# Steps:
#   1. rsync Backend/ and app/ to droplet
#   2. Verify .env / .env.production exist (creates from examples if missing, then aborts so user can fill)
#   3. Build Docker image
#   4. Bootstrap database
#   5. compose up -d, smoke test
#   6. Seed admin user
#
# Usage: ./deploy/scripts/all.sh

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/config.sh"

color_blue "==> 1/6  Copying Backend + app to ${DROPLET_HOST}"
"${SCRIPT_DIR}/copy.sh" all

color_blue "==> 2/6  Setting up env files on droplet (auto-discover network, generate JWT)"
"${SCRIPT_DIR}/env-setup.sh"

color_blue "==> 3/6  Building image"
"${SCRIPT_DIR}/build.sh"

color_blue "==> 4/6  Bootstrapping database"
"${SCRIPT_DIR}/init-db.sh"

color_blue "==> 5/6  Starting container"
"${SCRIPT_DIR}/deploy.sh"

color_blue "==> 6/6  Seeding admin user"
ssh_remote "cd '${REMOTE_APP}' && docker compose exec -T '${CONTAINER_NAME}' node scripts/create-admin.js" || \
  color_yellow "Admin already exists or container not ready. Run later with: ./deploy/scripts/init-db.sh --seed-admin"

color_green "All done. Visit: http://${DROPLET_HOST}:${APP_PORT}"
