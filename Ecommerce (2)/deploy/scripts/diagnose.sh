#!/usr/bin/env bash
# End-to-end runtime diagnostics for the ecommerce-app container.
# Useful when "the dashboard never loads" / "trends data never appears".
# Usage: ./deploy/scripts/diagnose.sh

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/config.sh"
require_cmd ssh

section() { color_blue ">>> $*"; }

section "1. Container is running"
ssh_remote "docker ps --filter name=^/${CONTAINER_NAME}\$ --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'"

section "2. Backend volume contents (must include CSVs and models)"
ssh_remote "docker exec '${CONTAINER_NAME}' ls -la /app/Backend | head -30"

section "3. Required Backend files for /api/trends"
ssh_remote "
  for f in future_sales_predictions.csv top_20_products.csv predict_future_sales.py predict_new_product_json.py requirements.txt; do
    docker exec '${CONTAINER_NAME}' bash -lc \"test -f /app/Backend/\$f && echo '  OK   /app/Backend/'\$f && stat -c '       size=%s bytes' /app/Backend/\$f || echo '  MISS /app/Backend/'\$f\"
  done
"

section "4. Python interpreter and key packages"
ssh_remote "docker exec '${CONTAINER_NAME}' bash -lc 'which python && python --version && python -c \"import pandas, numpy, xgboost, sklearn; print(\\\"pandas\\\", pandas.__version__); print(\\\"xgboost\\\", xgboost.__version__)\"'"

section "5. Run predict_future_sales.py briefly (10s timeout)"
ssh_remote "docker exec '${CONTAINER_NAME}' bash -lc 'cd /app/Backend && timeout 10 python predict_future_sales.py 2>&1 | head -40 || echo \"  (timed out or errored)\"'"

section "6. Env vars seen by Node"
ssh_remote "docker exec '${CONTAINER_NAME}' bash -lc 'echo DATABASE_URL=\$DATABASE_URL | sed \"s|:[^@/]*@|:****@|\"; echo DATABASE_SSL=\$DATABASE_SSL; echo NODE_ENV=\$NODE_ENV; echo JWT_SECRET=\${JWT_SECRET:0:8}*** ; echo PATH=\$PATH'"

section "7. /api/health/db (no auth)"
ssh_remote "curl -s http://127.0.0.1:${APP_PORT}/api/health/db"
echo

section "8. /api/trends (auth required - expect 401 if not logged in)"
ssh_remote "curl -s -o /tmp/trends.json -w 'HTTP %{http_code}\n' http://127.0.0.1:${APP_PORT}/api/trends && head -c 400 /tmp/trends.json && echo"

section "9. Last 50 lines of container logs"
ssh_remote "cd '${REMOTE_APP}' && docker compose logs --tail=50 ${CONTAINER_NAME}"

color_green "Diagnostics complete. If section 3 shows MISS for CSV files, run: ./deploy/scripts/copy.sh backend"
