#!/usr/bin/env bash
# Native self-hosted deploy (no Docker): Cloudflare Tunnel first, then Node + Python + Postgres.
#
# Prerequisites (install locally):
#   - Node.js 20+, npm
#   - Python 3.10+
#   - PostgreSQL running on localhost:5432 (database "ep", user postgres)
#   - cloudflared (auto-downloaded on Windows if missing)
#
# Usage:
#   ./deploy/scripts/self-deploy.sh                # full deploy
#   ./deploy/scripts/self-deploy.sh --tunnel-login # tunnel setup only
#   ./deploy/scripts/self-deploy.sh --no-build     # skip next build
#   ./deploy/scripts/self-deploy.sh --seed-admin   # create admin user
#   ./deploy/scripts/self-deploy.sh --skip-tunnel  # app only
#   ./deploy/scripts/self-deploy.sh --stop         # stop app + tunnel
#   ./deploy/scripts/self-deploy.sh --tunnel-reset # wipe THIS app's tunnel creds and re-login

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/config.sh"

ENV_FILE="${REPO_ROOT}/.env.production"
ENV_EXAMPLE="${REPO_ROOT}/.env.selfhosted.example"
FRONTEND_DIR="${REPO_ROOT}/Frontend"
BACKEND_DIR="${REPO_ROOT}/Backend"
CF_DIR="${REPO_ROOT}/deploy/cloudflare"
RUN_DIR="${REPO_ROOT}/.run"
PUBLIC_DOMAIN="${PUBLIC_DOMAIN:-trendinsight.live}"
TUNNEL_WAIT_SECS="${TUNNEL_WAIT_SECS:-90}"
CLOUDFLARED_URL="https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe"

TUNNEL_AUTH_MODE=""
CLOUDFLARED_BIN=""

NO_BUILD=0
SEED_ADMIN=0
SKIP_TUNNEL=0
TUNNEL_LOGIN_ONLY=0
STOP_ONLY=0
TUNNEL_RESET=0
for arg in "$@"; do
  case "${arg}" in
    --no-build) NO_BUILD=1 ;;
    --seed-admin) SEED_ADMIN=1 ;;
    --skip-tunnel) SKIP_TUNNEL=1 ;;
    --tunnel-login) TUNNEL_LOGIN_ONLY=1 ;;
    --tunnel-reset) TUNNEL_RESET=1; TUNNEL_LOGIN_ONLY=1 ;;
    --stop) STOP_ONLY=1 ;;
    -h|--help)
      sed -n '2,17p' "$0"
      exit 0
      ;;
    *) color_yellow "Ignoring unknown arg: ${arg}" ;;
  esac
done

read_env_var() {
  local key="$1"
  grep -E "^${key}=" "${ENV_FILE}" 2>/dev/null | head -1 | cut -d= -f2- | tr -d '\r' | sed 's/^["'\'']//;s/["'\'']$//'
}

set_env_var() {
  local key="$1"
  local value="$2"
  if grep -qE "^${key}=" "${ENV_FILE}" 2>/dev/null; then
    if [[ "$(uname -s)" == Darwin* ]]; then
      sed -i '' "s|^${key}=.*|${key}=${value}|" "${ENV_FILE}"
    else
      sed -i "s|^${key}=.*|${key}=${value}|" "${ENV_FILE}"
    fi
  else
    printf '%s=%s\n' "${key}" "${value}" >> "${ENV_FILE}"
  fi
}

ensure_env_file() {
  if [[ -f "${ENV_FILE}" ]]; then
    return 0
  fi
  if [[ ! -f "${ENV_EXAMPLE}" ]]; then
    color_red "Missing ${ENV_FILE} and ${ENV_EXAMPLE}."
    exit 1
  fi
  color_yellow "Creating .env.production from .env.selfhosted.example ..."
  cp "${ENV_EXAMPLE}" "${ENV_FILE}"
}

auto_fill_secrets() {
  local changed=0 jwt

  jwt="$(read_env_var JWT_SECRET)"
  if [[ -z "${jwt}" || "${jwt}" == *CHANGE_ME* ]]; then
    require_cmd openssl
    jwt="$(openssl rand -hex 32)"
    set_env_var JWT_SECRET "${jwt}"
    color_green "Generated JWT_SECRET."
    changed=1
  fi

  if ! grep -qE '^DATABASE_URL=.*@localhost:' "${ENV_FILE}" 2>/dev/null; then
    set_env_var DATABASE_URL "${DATABASE_URL_NATIVE_DEFAULT}"
    color_green "Set DATABASE_URL=${DATABASE_URL_NATIVE_DEFAULT}"
    changed=1
  fi

  if [[ "${changed}" == "1" ]]; then
    color_blue "Secrets updated in .env.production"
  fi
}

write_frontend_env() {
  grep -vE '^(POSTGRES_PASSWORD|CLOUDFLARE_TUNNEL_TOKEN|CLOUDFLARE_TUNNEL_NAME)=' "${ENV_FILE}" \
    | sed 's/@postgres:/@localhost:/g' > "${FRONTEND_DIR}/.env.production"
  color_blue "Wrote Frontend/.env.production"
}

ensure_cloudflared() {
  mkdir -p "${CF_DIR}"

  if command -v cloudflared >/dev/null 2>&1; then
    CLOUDFLARED_BIN="cloudflared"
    return 0
  fi

  if [[ -f "${CF_DIR}/cloudflared.exe" ]]; then
    CLOUDFLARED_BIN="${CF_DIR}/cloudflared.exe"
    return 0
  fi

  color_blue "Downloading cloudflared for Windows ..."
  require_cmd curl
  curl -fsSL -o "${CF_DIR}/cloudflared.exe" "${CLOUDFLARED_URL}"
  CLOUDFLARED_BIN="${CF_DIR}/cloudflared.exe"
  color_green "Installed ${CLOUDFLARED_BIN}"
}

to_windows_path() {
  local p="$1"
  if command -v cygpath >/dev/null 2>&1; then
    cygpath -w "${p}"
  else
    printf '%s' "${p}"
  fi
}

# cloudflared on Windows reads %USERPROFILE%\.cloudflared via Win32 API regardless of env vars.
# Strategy: temporarily rename the other app's cert.pem, run login (saves new cert), copy to
# project dir, then restore the original cert. Neither app permanently loses its cert.

# System .cloudflared dir (the one cloudflared always uses on Windows)
system_cf_dir() {
  printf '%s/.cloudflared' "${HOME}"
}

# Project-specific storage
cf_state_dir() {
  printf '%s/cf-state/.cloudflared' "${CF_DIR}"
}

cloudflared_cmd() {
  ensure_cloudflared
  mkdir -p "$(cf_state_dir)"

  # tunnel login must NOT use --origincert (Windows ignores it and uses %USERPROFILE% anyway).
  # All other tunnel subcommands DO support --origincert → use the project cert directly.
  if [[ "${1:-}" == "tunnel" && "${2:-}" != "login" ]]; then
    local origin_cert
    origin_cert="$(to_windows_path "$(cf_state_dir)/cert.pem")"
    "${CLOUDFLARED_BIN}" tunnel --origincert "${origin_cert}" "${@:2}"
  else
    "${CLOUDFLARED_BIN}" "$@"
  fi
}

has_project_cert() {
  [[ -f "$(cf_state_dir)/cert.pem" ]]
}

find_tunnel_credentials_json() {
  # Only look in the project dir — JSON from system ~/.cloudflared belongs to other accounts.
  find "$(cf_state_dir)" -maxdepth 1 -name '*.json' -type f 2>/dev/null | head -1
}

reset_project_tunnel_files() {
  color_yellow "Removing project tunnel files (does not touch other apps) ..."
  rm -rf "${CF_DIR}/cf-state" "${CF_DIR}/config.yml" 2>/dev/null || true
}

# Temporarily move other app's cert aside, run login, copy cert to project dir, restore original.
run_login_with_cert_swap() {
  local sys_dir orig_cert orig_backup new_cert project_cert
  sys_dir="$(system_cf_dir)"
  orig_cert="${sys_dir}/cert.pem"
  orig_backup="${sys_dir}/cert.pem.backup_ecommerce_$$"
  new_cert="${sys_dir}/cert.pem"
  project_cert="$(cf_state_dir)/cert.pem"

  mkdir -p "$(cf_state_dir)"

  # Move existing cert aside so cloudflared won't refuse
  if [[ -f "${orig_cert}" ]]; then
    color_blue "Temporarily moving other app's cert aside (will be restored after login) ..."
    mv "${orig_cert}" "${orig_backup}"
  fi

  local login_ok=0
  if cloudflared_cmd tunnel login; then
    login_ok=1
  fi

  # Copy ONLY the cert to the project dir (no JSON — those belong to specific accounts
  # and will be created fresh by `tunnel create --credentials-file` using --origincert).
  if [[ -f "${new_cert}" ]]; then
    cp "${new_cert}" "${project_cert}"
  fi

  # Restore the other app's cert
  if [[ -f "${orig_backup}" ]]; then
    mv "${orig_backup}" "${orig_cert}"
    color_blue "Restored other app's certificate."
  fi

  if [[ "${login_ok}" == "0" ]] && ! has_project_cert; then
    color_red "cloudflared tunnel login failed."
    color_blue "Retry: ./deploy/scripts/self-deploy.sh --tunnel-reset"
    exit 1
  fi
}

tunnel_credentials_ready() {
  [[ -f "${CF_DIR}/config.yml" ]] && [[ -n "$(find_tunnel_credentials_json)" ]]
}

write_tunnel_config() {
  local creds tunnel_id creds_path config_path
  creds="$(find_tunnel_credentials_json)"
  if [[ -z "${creds}" ]]; then
    color_red "No tunnel credentials JSON found in $(cf_state_dir)."
    color_blue "Run: ./deploy/scripts/self-deploy.sh --tunnel-login"
    color_blue "Log in with the Cloudflare account that owns ${PUBLIC_DOMAIN}."
    exit 1
  fi
  tunnel_id="$(basename "${creds}" .json)"
  creds_path="$(to_windows_path "$(cd "$(dirname "${creds}")" && pwd)/$(basename "${creds}")")"
  config_path="$(cd "${CF_DIR}" && pwd)/config.yml"

  mkdir -p "${CF_DIR}"
  cat > "${config_path}" <<EOF
# Generated by self-deploy.sh — native (no Docker)
tunnel: ${tunnel_id}
credentials-file: ${creds_path}

ingress:
  - hostname: ${PUBLIC_DOMAIN}
    service: http://localhost:${APP_PORT}
  - hostname: www.${PUBLIC_DOMAIN}
    service: http://localhost:${APP_PORT}
  - service: http_status:404
EOF
  color_green "Wrote deploy/cloudflare/config.yml (origin -> localhost:${APP_PORT})"
  color_blue "Using credentials: ${creds}"
}

run_tunnel_login() {
  if has_project_cert; then
    color_blue "Using project certificate: $(cf_state_dir)/cert.pem"
    return 0
  fi

  color_blue "Opening browser for Cloudflare authorization (cloudflared tunnel login) ..."
  color_yellow "IMPORTANT: Log in with the Cloudflare account that owns ${PUBLIC_DOMAIN}."
  color_yellow "Select zone: ${PUBLIC_DOMAIN}"
  color_blue "(Other app's cert will be moved aside during login and restored after.)"

  run_login_with_cert_swap

  if has_project_cert; then
    color_green "Certificate saved to $(cf_state_dir)/cert.pem"
    return 0
  fi

  color_red "Login completed but no certificate was saved."
  color_blue "Retry: ./deploy/scripts/self-deploy.sh --tunnel-reset"
  exit 1
}

setup_tunnel_via_login() {
  local tunnel_name creds
  tunnel_name="$(read_env_var CLOUDFLARE_TUNNEL_NAME)"
  tunnel_name="${tunnel_name:-trendinsight-ecommerce}"

  mkdir -p "${CF_DIR}"

  if [[ "${TUNNEL_RESET}" == "1" ]]; then
    reset_project_tunnel_files
  fi

  run_tunnel_login

  creds="$(find_tunnel_credentials_json)"
  if [[ -z "${creds}" ]]; then
    color_blue "Creating tunnel '${tunnel_name}' ..."
    local creds_file creds_file_win
    # Use a temp name; cloudflared will rename to <uuid>.json internally if needed.
    creds_file="$(cf_state_dir)/${tunnel_name}.json"
    creds_file_win="$(to_windows_path "${creds_file}")"
    if ! cloudflared_cmd tunnel create --credentials-file "${creds_file_win}" "${tunnel_name}"; then
      # Tunnel may already exist on this account — try to get its credentials
      color_yellow "Tunnel may already exist on this account. Listing tunnels ..."
      cloudflared_cmd tunnel list
      color_yellow "If tunnel exists, delete it in Zero Trust and re-run --tunnel-reset, or set a new CLOUDFLARE_TUNNEL_NAME in .env.production"
    fi
    creds="$(find_tunnel_credentials_json)"
  else
    color_blue "Tunnel credentials already present: ${creds}"
  fi

  if [[ -z "${creds}" ]]; then
    color_red "Could not find tunnel credentials in $(cf_state_dir)."
    color_blue "Use CLOUDFLARE_TUNNEL_NAME or run: ./deploy/scripts/self-deploy.sh --tunnel-reset"
    exit 1
  fi

  write_tunnel_config
  cloudflared_cmd tunnel route dns "${tunnel_name}" "${PUBLIC_DOMAIN}" || \
    color_yellow "DNS route for ${PUBLIC_DOMAIN} may already exist."
  cloudflared_cmd tunnel route dns "${tunnel_name}" "www.${PUBLIC_DOMAIN}" || \
    color_yellow "DNS route for www.${PUBLIC_DOMAIN} may already exist."

  TUNNEL_AUTH_MODE="login"
}

detect_tunnel_auth_mode() {
  local token
  token="$(read_env_var CLOUDFLARE_TUNNEL_TOKEN)"

  if [[ -n "${token}" ]]; then
    TUNNEL_AUTH_MODE="token"
    color_blue "Tunnel auth: token"
    return 0
  fi

  if [[ -n "$(find_tunnel_credentials_json)" ]]; then
    TUNNEL_AUTH_MODE="login"
    color_blue "Tunnel auth: login (existing credentials)"
    if [[ ! -f "${CF_DIR}/config.yml" ]]; then
      write_tunnel_config
    fi
    return 0
  fi

  if [[ "${SKIP_TUNNEL}" == "1" ]]; then
    color_red "No tunnel credentials found. Run without --skip-tunnel first."
    exit 1
  fi

  setup_tunnel_via_login
}

tunnel_log_ok() {
  [[ -f "${RUN_DIR}/cloudflared.log" ]] && \
    grep -qiE 'Registered tunnel connection|Connection .* registered|connIndex=' "${RUN_DIR}/cloudflared.log"
}

stop_process() {
  local name="$1"
  local pidfile="${RUN_DIR}/${name}.pid"
  if [[ -f "${pidfile}" ]]; then
    local pid
    pid="$(cat "${pidfile}")"
    if kill "${pid}" 2>/dev/null; then
      color_blue "Stopped ${name} (pid ${pid})"
    fi
    rm -f "${pidfile}"
  fi
}

kill_port() {
  local port="$1"
  # Kill whatever is holding the port (Windows netstat → taskkill)
  local pids
  pids="$(cmd //c "netstat -ano" 2>/dev/null \
    | grep -E "[:.]${port}[[:space:]].*LISTENING" \
    | awk '{print $NF}' | sort -u || true)"
  if [[ -n "${pids}" ]]; then
    echo "${pids}" | while read -r pid; do
      [[ -z "${pid}" || "${pid}" == "0" ]] && continue
      cmd //c "taskkill /F /PID ${pid}" >/dev/null 2>&1 && \
        color_blue "Killed PID ${pid} holding port ${port}"
    done
  fi
}

stop_all() {
  stop_process cloudflared
  # Kill the Next.js window process if PID file exists
  stop_process next
  # Also kill anything on port 4001 (catches manually opened windows)
  kill_port "${APP_PORT}"
  color_green "Stopped native stack."
}

start_tunnel() {
  mkdir -p "${RUN_DIR}"
  stop_process cloudflared

  color_blue "Starting cloudflared tunnel ..."
  if [[ "${TUNNEL_AUTH_MODE}" == "token" ]]; then
    nohup "${CLOUDFLARED_BIN}" tunnel run --token "$(read_env_var CLOUDFLARE_TUNNEL_TOKEN)" \
      > "${RUN_DIR}/cloudflared.log" 2>&1 &
  else
    local origin_cert config_path
    origin_cert="$(to_windows_path "$(cf_state_dir)/cert.pem")"
    config_path="$(to_windows_path "$(cd "${CF_DIR}" && pwd)/config.yml")"
    nohup "${CLOUDFLARED_BIN}" tunnel --origincert "${origin_cert}" --config "${config_path}" run \
      > "${RUN_DIR}/cloudflared.log" 2>&1 &
  fi
  echo $! > "${RUN_DIR}/cloudflared.pid"

  local elapsed=0
  while [[ "${elapsed}" -lt "${TUNNEL_WAIT_SECS}" ]]; do
    if grep -qiE 'invalid tunnel token|failed to authenticate|Unauthorized' "${RUN_DIR}/cloudflared.log" 2>/dev/null; then
      color_red "Cloudflare rejected tunnel credentials."
      tail -20 "${RUN_DIR}/cloudflared.log"
      exit 1
    fi
    if tunnel_log_ok; then
      color_green "Cloudflare Tunnel connected."
      return 0
    fi
    sleep 2
    elapsed=$((elapsed + 2))
  done

  color_yellow "Tunnel not confirmed in logs yet — check ${RUN_DIR}/cloudflared.log"
}

setup_python_venv() {
  local venv="${BACKEND_DIR}/.venv"
  local stamp="${venv}/.deps_installed"
  local req="${BACKEND_DIR}/requirements.txt"
  local py=""

  if [[ -f "${venv}/Scripts/python.exe" ]]; then
    py="${venv}/Scripts/python.exe"
  elif [[ -f "${venv}/bin/python" ]]; then
    py="${venv}/bin/python"
  else
    require_cmd python
    color_blue "Creating Python venv in Backend/.venv ..."
    python -m venv "${venv}"
    if [[ -f "${venv}/Scripts/python.exe" ]]; then
      py="${venv}/Scripts/python.exe"
    else
      py="${venv}/bin/python"
    fi
  fi

  # Skip install if requirements haven't changed since the last successful install
  if [[ -f "${stamp}" && "${stamp}" -nt "${req}" ]]; then
    color_green "Python dependencies already up-to-date (skipping install)."
    return 0
  fi

  color_blue "Installing Python ML dependencies ..."
  "${py}" -m pip install --upgrade pip -q
  "${py}" -m pip install -r "${req}" -q
  touch "${stamp}"
  color_green "Python dependencies ready."
}

find_psql() {
  if command -v psql >/dev/null 2>&1; then
    command -v psql
    return 0
  fi
  local candidates=(
    "/c/Program Files/PostgreSQL/17/bin/psql.exe"
    "/c/Program Files/PostgreSQL/16/bin/psql.exe"
    "/c/Program Files/PostgreSQL/15/bin/psql.exe"
  )
  local c
  for c in "${candidates[@]}"; do
    if [[ -f "${c}" ]]; then
      echo "${c}"
      return 0
    fi
  done
  return 1
}

bootstrap_database() {
  local psql_bin pg_pass
  pg_pass="${POSTGRES_PASSWORD_DEFAULT}"

  if ! psql_bin="$(find_psql)"; then
    color_yellow "psql not found — skipping DB bootstrap."
    color_yellow "Ensure PostgreSQL is running and database '${APP_DB_NAME}' exists."
    color_yellow "Then run: cd Frontend && npm run migrate"
    return 0
  fi

  export PGPASSWORD="${pg_pass}"
  color_blue "Bootstrapping database on localhost ..."

  "${psql_bin}" -h localhost -U postgres -f "${REPO_ROOT}/deploy/init-db.sql" || true
  "${psql_bin}" -h localhost -U postgres -d "${APP_DB_NAME}" -v ON_ERROR_STOP=0 \
    -f "${REPO_ROOT}/Frontend/schema.sql" || color_yellow "schema may already exist"
  "${psql_bin}" -h localhost -U postgres -d "${APP_DB_NAME}" -v ON_ERROR_STOP=1 \
    -f "${REPO_ROOT}/Frontend/migrations/20260301_add_contact_number_to_users.sql"
  "${psql_bin}" -h localhost -U postgres -d "${APP_DB_NAME}" -v ON_ERROR_STOP=1 \
    -f "${REPO_ROOT}/Frontend/migrations/20260301_make_email_optional.sql"

  unset PGPASSWORD
  color_green "Database bootstrap complete."
}

deploy_application() {
  require_cmd npm
  setup_python_venv
  write_frontend_env

  cd "${FRONTEND_DIR}"

  if [[ ! -d node_modules ]]; then
    color_blue "Installing npm dependencies ..."
    npm ci
  fi

  if [[ "${NO_BUILD}" == "0" ]]; then
    color_blue "Building Next.js app ..."
    npm run build
  else
    color_yellow "Skipping build (--no-build)."
  fi

  # Kill anything already on the port (previous window, nohup, etc.)
  kill_port "${APP_PORT}"
  stop_process next
  mkdir -p "${RUN_DIR}"

  # Build Windows-native paths for the new CMD window
  local frontend_win backend_win venv_scripts_win bat_file bat_win
  frontend_win="$(to_windows_path "${FRONTEND_DIR}")"
  backend_win="$(to_windows_path "${BACKEND_DIR}")"
  venv_scripts_win="${backend_win}\\.venv\\Scripts"
  bat_file="${RUN_DIR}/start-next.bat"
  bat_win="$(to_windows_path "${bat_file}")"

  # Write a batch file — avoids all inline quoting nightmares
  cat > "${bat_file}" << BATEOF
@echo off
title TrendInsight :${APP_PORT}
set "PATH=${venv_scripts_win};%PATH%"
cd /d "${frontend_win}"
set NODE_ENV=production
npm run start:selfhosted
pause
BATEOF

  color_blue "Opening Next.js in a new window (port ${APP_PORT}) — close that window to stop the app."
  cmd //c start "TrendInsight :${APP_PORT}" "${bat_win}"

  color_blue "Waiting for app to become ready ..."
  local elapsed=0
  while [[ "${elapsed}" -lt 90 ]]; do
    local code
    code="$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:${APP_PORT}/api/health/db" 2>/dev/null || echo "000")"
    if [[ "${code}" == "200" ]]; then
      color_green "Next.js is running on http://localhost:${APP_PORT}"
      return 0
    fi
    sleep 3
    elapsed=$((elapsed + 3))
  done

  color_yellow "App window opened — may still be starting. Check the CMD window for output."
}

seed_admin() {
  cd "${FRONTEND_DIR}"
  node scripts/create-admin.js || color_yellow "Admin seed skipped (may already exist)."
}

smoke_tests() {
  echo ""
  color_green "Deployment complete (native, no Docker)."
  echo ""
  echo "  Local:  http://localhost:${APP_PORT}"
  echo "  Public: https://${PUBLIC_DOMAIN}"
  echo ""
  color_blue "Next.js:"
  echo "  Running in its own CMD window (title: TrendInsight :${APP_PORT})"
  echo "  Close that window to stop the app."
  echo ""
  color_blue "To stop everything:"
  echo "  ./deploy/scripts/self-deploy.sh --stop"
  echo ""
  color_blue "Tunnel logs:"
  echo "  tail -f .run/cloudflared.log"
  echo ""
  color_yellow "First visit: log in at https://${PUBLIC_DOMAIN}/login"
  color_yellow "(cookies from localhost do not transfer to the domain)"
}

# --- main ---

if [[ "${STOP_ONLY}" == "1" ]]; then
  stop_all
  exit 0
fi

require_cmd node
require_cmd npm
require_cmd curl

ensure_env_file
auto_fill_secrets
ensure_cloudflared

if [[ "${TUNNEL_LOGIN_ONLY}" == "1" ]]; then
  setup_tunnel_via_login
  start_tunnel
  color_green "Tunnel setup complete. Run ./deploy/scripts/self-deploy.sh to deploy the app."
  exit 0
fi

detect_tunnel_auth_mode

if [[ "${SKIP_TUNNEL}" == "0" ]]; then
  color_blue "Step 1/3 — Cloudflare Tunnel (authorized first) ..."
  start_tunnel
else
  color_yellow "Skipping tunnel (--skip-tunnel)."
fi

color_blue "Step 2/3 — Database + Python ..."
bootstrap_database

color_blue "Step 3/3 — Build and start app on port ${APP_PORT} ..."
deploy_application

if [[ "${SEED_ADMIN}" == "1" ]]; then
  seed_admin
fi

smoke_tests
