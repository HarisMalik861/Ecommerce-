#!/usr/bin/env bash
# Auto-fill env files on the droplet:
#  - .env             POSTGRES_NETWORK from `docker inspect postgres`
#  - .env.production  JWT_SECRET from `openssl rand -hex 32`
#
# Idempotent: if values already set (non-placeholder), they are kept.
# Usage: ./deploy/scripts/env-setup.sh [--force]

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/config.sh"
require_cmd ssh

FORCE=0
[[ "${1:-}" == "--force" ]] && FORCE=1

color_blue "Discovering postgres docker network on ${DROPLET_HOST} ..."
NETS_RAW=$(ssh_remote "docker inspect '${POSTGRES_CONTAINER}' --format '{{range \$k,\$v := .NetworkSettings.Networks}}{{\$k}}{{println}}{{end}}'")
mapfile -t PG_NETS < <(printf '%s\n' "${NETS_RAW}" | tr -d '\r' | sed '/^$/d')

if [[ ${#PG_NETS[@]} -eq 0 ]]; then
  color_red "Could not detect postgres network. Is the '${POSTGRES_CONTAINER}' container running?"
  exit 1
fi

if [[ -n "${POSTGRES_NETWORK_OVERRIDE:-}" ]]; then
  PGNET="${POSTGRES_NETWORK_OVERRIDE}"
  color_yellow "  using POSTGRES_NETWORK_OVERRIDE=${PGNET}"
elif [[ ${#PG_NETS[@]} -eq 1 ]]; then
  PGNET="${PG_NETS[0]}"
  color_green "  postgres network: ${PGNET}"
else
  color_yellow "  postgres is attached to multiple networks:"
  for n in "${PG_NETS[@]}"; do echo "    - ${n}"; done
  PGNET="${PG_NETS[0]}"
  color_yellow "  picking first: ${PGNET}"
  color_yellow "  (override with POSTGRES_NETWORK_OVERRIDE=<name> ./deploy/scripts/env-setup.sh --force)"
fi

color_blue "Ensuring env files exist ..."
ssh_remote "
  set -e
  cd '${REMOTE_APP}'
  [ -f .env ] || cp .env.example .env
  [ -f .env.production ] || cp .env.production.example .env.production
"

color_blue "Writing POSTGRES_NETWORK to ${REMOTE_APP}/.env ..."
ssh_remote "
  set -e
  cd '${REMOTE_APP}'
  if grep -q '^POSTGRES_NETWORK=' .env; then
    sed -i 's|^POSTGRES_NETWORK=.*|POSTGRES_NETWORK=${PGNET}|' .env
  else
    printf '\nPOSTGRES_NETWORK=%s\n' '${PGNET}' >> .env
  fi
"

color_blue "Ensuring DATABASE_SSL=false in ${REMOTE_APP}/.env.production ..."
ssh_remote "
  set -e
  cd '${REMOTE_APP}'
  if grep -q '^DATABASE_SSL=' .env.production; then
    sed -i 's|^DATABASE_SSL=.*|DATABASE_SSL=false|' .env.production
  else
    printf '\nDATABASE_SSL=false\n' >> .env.production
  fi
"

color_blue "Setting JWT_SECRET in ${REMOTE_APP}/.env.production ..."
JWT_GEN=$(ssh_remote "openssl rand -hex 32" | tr -d '\r\n ')
if [[ -z "${JWT_GEN}" ]]; then
  color_red "Failed to generate JWT_SECRET via openssl on droplet."
  exit 1
fi

ssh_remote "
  set -e
  cd '${REMOTE_APP}'
  current=\$(grep '^JWT_SECRET=' .env.production | head -1 | cut -d= -f2- || true)
  case \"\$current\" in
    ''|CHANGE_ME*|fallback-secret-key)
      need_set=1 ;;
    *)
      if [ '${FORCE}' = '1' ]; then need_set=1; else need_set=0; fi ;;
  esac
  if [ \"\$need_set\" = '1' ]; then
    if grep -q '^JWT_SECRET=' .env.production; then
      sed -i 's|^JWT_SECRET=.*|JWT_SECRET=${JWT_GEN}|' .env.production
    else
      printf '\nJWT_SECRET=%s\n' '${JWT_GEN}' >> .env.production
    fi
    echo '  JWT_SECRET set'
  else
    echo '  JWT_SECRET already set (use --force to overwrite)'
  fi
"

color_green "Env setup complete. Verify:"
ssh_remote "echo '----- ${REMOTE_APP}/.env -----'; cat '${REMOTE_APP}/.env'; echo; echo '----- ${REMOTE_APP}/.env.production (JWT_SECRET masked) -----'; sed 's|\(JWT_SECRET=\).*|\1********|' '${REMOTE_APP}/.env.production'"
