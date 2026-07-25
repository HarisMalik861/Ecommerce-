#!/usr/bin/env bash
# Copy files to the droplet via rsync, with tar-over-ssh fallback.
#
# Usage:
#   ./deploy/scripts/copy.sh app      # app source (Frontend, Dockerfile, compose, deploy/)
#   ./deploy/scripts/copy.sh backend  # Backend/ (~160MB models + datasets)
#   ./deploy/scripts/copy.sh all      # both
#
# Honors DRY_RUN=1 for a no-op preview when rsync is available.

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/config.sh"
require_cmd ssh

TARGET="${1:-}"
if [[ -z "${TARGET}" ]]; then
  color_red "Usage: $0 {app|backend|all}"
  exit 1
fi

COPY_MODE="tar"
if command -v rsync >/dev/null 2>&1; then
  COPY_MODE="rsync"
fi

RSYNC_FLAGS=(-avz --progress --human-readable)
if [[ "${DRY_RUN:-0}" == "1" ]]; then
  if [[ "${COPY_MODE}" == "rsync" ]]; then
    RSYNC_FLAGS+=(--dry-run)
    color_yellow "DRY_RUN=1 - no files will be transferred"
  else
    color_yellow "DRY_RUN=1 is only supported with rsync. tar fallback will not run."
    exit 0
  fi
fi

ensure_remote_dirs() {
  ssh_remote "mkdir -p '${REMOTE_APP}' '${REMOTE_BACKEND}' '${REMOTE_FRONTEND_DATA}'"
}

# tar verbose -> awk progress filter (file count + every 50 files prints a line)
tar_progress_filter='
  BEGIN { count = 0; last = 0 }
  {
    count++
    if (count - last >= 50) {
      printf "  ... %d files packed\n", count > "/dev/stderr"
      fflush("/dev/stderr")
      last = count
    }
  }
  END {
    printf "  total %d files packed\n", count > "/dev/stderr"
    fflush("/dev/stderr")
  }
'

show_size() {
  local target="$1"
  local label="$2"
  local size
  if size=$(du -sh "${target}" 2>/dev/null | awk '{print $1}'); then
    color_yellow "  ${label} size: ${size}"
  fi
}

copy_app() {
  color_blue "Syncing app source -> ${DROPLET_SSH}:${REMOTE_APP} (${COPY_MODE})"
  show_size "${REPO_ROOT}" "app source (incl. excluded dirs)"

  if [[ "${COPY_MODE}" == "rsync" ]]; then
    rsync "${RSYNC_FLAGS[@]}" \
      --delete \
      --exclude='.git' \
      --exclude='.git/' \
      --exclude='node_modules' \
      --exclude='.next' \
      --exclude='Backend' \
      --exclude='Backend/' \
      --exclude='.env' \
      --exclude='.env.local' \
      --exclude='.env.production' \
      --exclude='.env.production.local' \
      --exclude='Frontend/.env' \
      --exclude='Frontend/.env.local' \
      --exclude='Frontend/node_modules' \
      --exclude='Frontend/.next' \
      --exclude='Frontend/tsconfig.tsbuildinfo' \
      --exclude='__pycache__' \
      --exclude='*.pyc' \
      --exclude='docs/' \
      "${REPO_ROOT}/" \
      "${DROPLET_SSH}:${REMOTE_APP}/"
    return
  fi

  require_cmd tar
  tar -czvf - \
    --exclude='./.git' \
    --exclude='./.git/*' \
    --exclude='./node_modules' \
    --exclude='./.next' \
    --exclude='./Backend' \
    --exclude='./Backend/*' \
    --exclude='./.env' \
    --exclude='./.env.local' \
    --exclude='./.env.production' \
    --exclude='./.env.production.local' \
    --exclude='./Frontend/.env' \
    --exclude='./Frontend/.env.local' \
    --exclude='./Frontend/node_modules' \
    --exclude='./Frontend/.next' \
    --exclude='./Frontend/tsconfig.tsbuildinfo' \
    --exclude='./__pycache__' \
    --exclude='./*.pyc' \
    --exclude='./docs' \
    -C "${REPO_ROOT}" . 2> >(awk "${tar_progress_filter}" >&2) | \
    ssh "${SSH_COMMON_OPTS[@]}" "${DROPLET_SSH}" \
      "mkdir -p '${REMOTE_APP}' && tar -xzf - -C '${REMOTE_APP}' && echo '  remote extract complete'"
}

copy_backend() {
  color_blue "Syncing Backend/ -> ${DROPLET_SSH}:${REMOTE_BACKEND} (${COPY_MODE})"
  show_size "${REPO_ROOT}/Backend" "Backend"

  if [[ "${COPY_MODE}" == "rsync" ]]; then
    rsync "${RSYNC_FLAGS[@]}" \
      --exclude='__pycache__' \
      --exclude='*.pyc' \
      "${REPO_ROOT}/Backend/" \
      "${DROPLET_SSH}:${REMOTE_BACKEND}/"
    return
  fi

  require_cmd tar
  tar -czvf - \
    --exclude='./__pycache__' \
    --exclude='./*.pyc' \
    -C "${REPO_ROOT}/Backend" . 2> >(awk "${tar_progress_filter}" >&2) | \
    ssh "${SSH_COMMON_OPTS[@]}" "${DROPLET_SSH}" \
      "mkdir -p '${REMOTE_BACKEND}' && tar -xzf - -C '${REMOTE_BACKEND}' && echo '  remote extract complete'"
}

ensure_remote_dirs

case "${TARGET}" in
  app)     copy_app ;;
  backend) copy_backend ;;
  all)     copy_backend; copy_app ;;
  *)       color_red "Unknown target: ${TARGET} (use app|backend|all)"; exit 1 ;;
esac

color_green "Copy complete."
