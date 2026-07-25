#!/usr/bin/env bash
# First-time TLS setup for trendinsight.live.
# Steps:
#   1. Verify DNS A records point to the droplet
#   2. Start nginx with HTTP-only config (for ACME challenge)
#   3. Run certbot to issue the cert (--webroot)
#   4. Swap nginx to HTTPS config and reload
#   5. Start the certbot renewal loop
#
# Usage:
#   EMAIL=you@example.com ./deploy/scripts/tls-init.sh
#   ./deploy/scripts/tls-init.sh --staging       # use Let's Encrypt staging (untrusted certs, for testing)
#   ./deploy/scripts/tls-init.sh --skip-dns      # skip DNS verification

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/config.sh"
require_cmd ssh

DOMAIN="${DOMAIN:-trendinsight.live}"
EMAIL="${EMAIL:-}"
STAGING=0
SKIP_DNS=0

for arg in "$@"; do
  case "${arg}" in
    --staging) STAGING=1 ;;
    --skip-dns) SKIP_DNS=1 ;;
    *) color_yellow "Ignoring unknown arg: ${arg}" ;;
  esac
done

# ---------- 1. Verify DNS ----------
if [[ "${SKIP_DNS}" != "1" ]]; then
  color_blue "Verifying DNS: ${DOMAIN} -> ${DROPLET_HOST}"
  for host in "${DOMAIN}" "www.${DOMAIN}"; do
    resolved=$(ssh_remote "getent hosts '${host}' | awk '{print \$1}' | head -n1" 2>/dev/null | tr -d '\r\n ' || true)
    if [[ -z "${resolved}" ]]; then
      color_red "  ${host} did not resolve. Set A record for '${host}' -> ${DROPLET_HOST} at your registrar, wait 1-10 min, retry."
      exit 1
    fi
    if [[ "${resolved}" != "${DROPLET_HOST}" ]]; then
      color_red "  ${host} resolves to ${resolved} (expected ${DROPLET_HOST})."
      color_red "  Update the A record at your registrar and wait for DNS propagation."
      exit 1
    fi
    color_green "  ${host} -> ${resolved} OK"
  done
else
  color_yellow "DNS verification skipped (--skip-dns)."
fi

# ---------- 2. Make sure ports 80/443 are free ----------
color_blue "Checking ports 80 and 443 are not in use ..."
busy=$(ssh_remote "ss -ltnp 2>/dev/null | awk '\$4 ~ /:80\$|:443\$/'" || true)
if [[ -n "${busy}" ]]; then
  color_yellow "Something is already listening on 80/443:"
  echo "${busy}"
  color_yellow "Continuing anyway -- if it's another container, this script may fail when starting nginx."
fi

# ---------- 3. Activate HTTP-only config (cert issuance only) ----------
color_blue "Switching nginx to HTTP-only config for ACME challenge ..."
ssh_remote "
  set -e
  cd '${REMOTE_APP}'
  mkdir -p deploy/nginx/conf.d.bak
  # Move the production HTTPS config aside so nginx can boot before certs exist.
  if [ -f deploy/nginx/conf.d/trendinsight.conf ]; then
    mv deploy/nginx/conf.d/trendinsight.conf deploy/nginx/conf.d.bak/trendinsight.conf
  fi
  # The .http.conf file remains active.
"

color_blue "Starting nginx (HTTP-only) ..."
ssh_remote "cd '${REMOTE_APP}' && docker compose -f docker-compose.yml -f docker-compose.tls.yml up -d nginx"

sleep 3

# Verify ACME path is reachable from outside
color_blue "Self-test: HTTP from droplet to itself ..."
HTTP_CODE=$(ssh_remote "curl -s -o /dev/null -w '%{http_code}' http://${DOMAIN}/" || echo "000")
if [[ "${HTTP_CODE}" != "200" ]]; then
  color_yellow "  http://${DOMAIN}/ returned ${HTTP_CODE} (expected 200). DNS may still be propagating."
fi

# ---------- 4. Run certbot ----------
color_blue "Issuing Let's Encrypt cert for ${DOMAIN} and www.${DOMAIN} ..."

CERTBOT_ARGS=(certonly --webroot -w /var/www/certbot
              -d "${DOMAIN}" -d "www.${DOMAIN}"
              --agree-tos --no-eff-email --non-interactive)

if [[ -n "${EMAIL}" ]]; then
  CERTBOT_ARGS+=(--email "${EMAIL}")
else
  CERTBOT_ARGS+=(--register-unsafely-without-email)
fi

if [[ "${STAGING}" == "1" ]]; then
  CERTBOT_ARGS+=(--staging)
  color_yellow "  Using Let's Encrypt STAGING (cert will be untrusted; rerun without --staging for real cert)."
fi

ssh_remote "cd '${REMOTE_APP}' && docker compose -f docker-compose.yml -f docker-compose.tls.yml run --rm certbot ${CERTBOT_ARGS[*]}"

# ---------- 5. Restore HTTPS config + reload nginx ----------
color_blue "Activating HTTPS config and reloading nginx ..."
ssh_remote "
  set -e
  cd '${REMOTE_APP}'
  if [ -f deploy/nginx/conf.d.bak/trendinsight.conf ]; then
    mv deploy/nginx/conf.d.bak/trendinsight.conf deploy/nginx/conf.d/trendinsight.conf
    rmdir deploy/nginx/conf.d.bak 2>/dev/null || true
  fi
  docker compose -f docker-compose.yml -f docker-compose.tls.yml exec nginx nginx -t
  docker compose -f docker-compose.yml -f docker-compose.tls.yml exec nginx nginx -s reload
"

# ---------- 6. Start the renewal loop ----------
color_blue "Starting certbot renewal loop ..."
ssh_remote "cd '${REMOTE_APP}' && docker compose -f docker-compose.yml -f docker-compose.tls.yml up -d certbot"

# ---------- 7. Smoke test ----------
color_blue "Smoke test: GET https://${DOMAIN}/"
sleep 3
HTTPS_CODE=$(ssh_remote "curl -s -o /dev/null -w '%{http_code}' https://${DOMAIN}/" || echo "000")
if [[ "${HTTPS_CODE}" =~ ^[23] ]]; then
  color_green "Online: https://${DOMAIN}/ returned ${HTTPS_CODE}."
else
  color_yellow "https://${DOMAIN}/ returned ${HTTPS_CODE}. Check nginx logs: ./deploy/scripts/tls-logs.sh"
fi

color_green "TLS setup complete. Open: https://${DOMAIN}"
