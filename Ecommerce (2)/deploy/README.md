# Ecommerce deployment

## Local self-hosted (Windows) + Cloudflare Tunnel — **recommended**

Run **natively on your PC** (no Docker). The app listens on **port 4001** and is exposed at **https://trendinsight.live** via Cloudflare Tunnel.

| Item | Value |
|------|-------|
| Local URL | http://localhost:4001 |
| Public URL | https://trendinsight.live |
| App port | **4001** (never 3000) |
| Database | Local PostgreSQL on `localhost:5432`, DB `ep` |
| SSL | Cloudflare Tunnel |

### Prerequisites

Install locally:

| Tool | Purpose |
|------|---------|
| [Node.js 20+](https://nodejs.org/) | Next.js app |
| [Python 3.10+](https://www.python.org/) | ML scripts (venv created automatically) |
| [PostgreSQL](https://www.postgresql.org/) | Database `ep`, user `postgres` / password `umerfarooq` |
| Git Bash | Run deploy script (`cloudflared` auto-downloaded if missing) |
| Domain on Cloudflare | `trendinsight.live` |

### Quick start (Git Bash)

```bash
# 1. Env file
cp .env.selfhosted.example .env.production

# 2. Full deploy (tunnel login opens browser on first run)
./deploy/scripts/self-deploy.sh

# First run + admin user
./deploy/scripts/self-deploy.sh --seed-admin

# Tunnel only
./deploy/scripts/self-deploy.sh --tunnel-login

# Stop app + tunnel
./deploy/scripts/self-deploy.sh --stop
```

Deploy order:
1. **`cloudflared tunnel login`** → create tunnel → DNS → start connector
2. Bootstrap PostgreSQL schema on **localhost**
3. `npm ci` + `npm run build` + start Next.js on **4001**
4. Python venv + ML deps in `Backend/.venv`

### Smoke tests

```bash
curl http://localhost:4001/api/health/db
curl https://trendinsight.live/api/health/db
```

### Operations

```bash
# Logs
tail -f .run/next.log .run/cloudflared.log

# Re-deploy after code changes
./deploy/scripts/self-deploy.sh

# App only (tunnel already running)
./deploy/scripts/self-deploy.sh --no-build --skip-tunnel

# Stop
./deploy/scripts/self-deploy.sh --stop
```

### Data locations

| Item | Path |
|------|------|
| ML models, CSVs, datasets | `Backend/` (in repo) |
| Prediction history | `Frontend/data/` |
| Process logs / PIDs | `.run/` |

---

## Legacy: DigitalOcean droplet

Deploy to `68.183.179.83` on **port 3003**, using the existing **postgres** Docker container and **pgAdmin** on port 5050.

| Item | Value |
|------|-------|
| App URL (Phase 1) | http://68.183.179.83:3003 |
| Domain (Phase 2) | https://trendinsight.live (nginx + Let's Encrypt) |
| Host port | 3003 → container 3000 |
| Database | `ep` on existing `postgres` container |
| pgAdmin | http://68.183.179.83:5050 |

Other projects on this droplet (3000, 3001, 5001, 8080, 8001, 5050) are **not** modified.

### Architecture (droplet)

- **Single container** (`ecommerce-app`): Next.js 16 + Python 3 (ML scripts).
- Next.js API routes call Python via `spawn("python", ...)`; `../Backend` must exist at `/app/Backend`.
- Heavy files (models, datasets, CSVs) live on the host at `/root/ecommerce/Backend` and are mounted into the container.
- Postgres is reached by hostname `postgres` on the shared Docker network.

### Prerequisites (droplet)

- SSH access: `root@68.183.179.83`
- Docker and Docker Compose on the droplet
- `rsync` on your local machine (Git Bash / WSL / macOS / Linux)
- Existing containers: `postgres`, `pgadmin` (already running)

---

## Step 1 — Prepare directories on the droplet

```bash
ssh root@68.183.179.83

mkdir -p /root/ecommerce/Backend
mkdir -p /root/ecommerce/Frontend-data
mkdir -p /root/ecommerce/app
```

---

## Step 2 — Copy Backend data and app files

Run from your **local** machine (repo root `Ecommerce/`). The helper script uses `rsync` if available and falls back to `tar | ssh` in Git Bash if `rsync` is missing:

```bash
./deploy/scripts/copy.sh all
```

Manual `rsync` equivalent:

```bash
# ML models, datasets, CSVs (~160MB) — one-time transfer
rsync -avz --progress \
  --exclude='__pycache__' \
  --exclude='*.pyc' \
  Backend/ root@68.183.179.83:/root/ecommerce/Backend/

# Deployment files (Dockerfile, compose, Frontend source)
rsync -avz --progress \
  --exclude='node_modules' \
  --exclude='.next' \
  --exclude='Backend' \
  --exclude='.git' \
  --exclude='.env' \
  --exclude='.env.production' \
  ./ root@68.183.179.83:/root/ecommerce/app/
```

Ensure these exist on the host after rsync:

```bash
ls /root/ecommerce/Backend/datasets/registry.json
ls /root/ecommerce/Backend/models/
ls /root/ecommerce/Backend/future_sales_predictions.csv
```

---

## Step 3 — Discover Postgres Docker network

On the droplet:

```bash
docker inspect postgres --format '{{range $k,$v := .NetworkSettings.Networks}}{{$k}}{{end}}'
```

Example output: `trackit_default` or `bridge`.

Set this in `.env.production` as `POSTGRES_NETWORK` (see next step).

---

## Step 4 — Configure environment

On the droplet:

```bash
cd /root/ecommerce/app

cp .env.production.example .env.production
cp .env.example .env

# Generate JWT secret
openssl rand -hex 32
# Paste the output into .env.production as JWT_SECRET=...

nano .env.production
nano .env
```

Set `POSTGRES_NETWORK` in `.env` (required for Docker Compose external network).

Required values in `.env.production`:

```env
DATABASE_URL=postgresql://postgres:umerfarooq@postgres:5432/ep
DATABASE_SSL=false
JWT_SECRET=<paste openssl output>
JWT_EXPIRES_IN=7d
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1
```

In `.env`:

```env
POSTGRES_NETWORK=<network from step 3>
```

---

## Step 5 — Create database and schema

Still on the droplet, from `/root/ecommerce/app`:

```bash
# Create database ep (idempotent)
docker exec -i postgres psql -U postgres < deploy/init-db.sql

# Base schema
docker exec -i postgres psql -U postgres -d ep < Frontend/schema.sql

# Migrations
docker exec -i postgres psql -U postgres -d ep < Frontend/migrations/20260301_add_contact_number_to_users.sql
docker exec -i postgres psql -U postgres -d ep < Frontend/migrations/20260301_make_email_optional.sql
```

### View database in pgAdmin

1. Open http://68.183.179.83:5050
2. Add server: Host `postgres`, Port `5432`, User `postgres`, Password `umerfarooq`, Database `ep`

---

## Step 6 — Build and start the app

```bash
cd /root/ecommerce/app

docker compose build
docker compose up -d

docker compose logs -f ecommerce-app
```

Wait until you see Next.js listening on port 3000.

---

## Step 7 — Create admin user

```bash
docker compose exec ecommerce-app node scripts/create-admin.js
```

Default credentials (change after first login):

| Field | Value |
|-------|-------|
| Email | admin@example.com |
| Contact | +923000000000 |
| Password | admin123 |

---

## Step 8 — Smoke tests

```bash
# Trends API (reads Backend CSVs via mounted volume)
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3003/api/trends

# Homepage
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3003/

# Database health
curl http://127.0.0.1:3003/api/health/db
```

From your browser: http://68.183.179.83:3003

---

## Operations

### Restart after code changes

```bash
# Local: rsync app files again, then on droplet:
cd /root/ecommerce/app
docker compose build
docker compose up -d
```

### Restart after Backend data / model changes

Only rsync `Backend/` — no rebuild required:

```bash
rsync -avz Backend/ root@68.183.179.83:/root/ecommerce/Backend/
docker compose restart ecommerce-app
```

### View logs

```bash
docker compose logs -f ecommerce-app
```

### Stop / remove

```bash
cd /root/ecommerce/app
docker compose down
```

This does **not** remove `/root/ecommerce/Backend` or the `ep` database.

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `network pgnet not found` | Set correct `POSTGRES_NETWORK` in `.env.production` |
| `connection refused` to postgres | Ensure `postgres` container is on the same network name |
| Trends API 500 | Check Backend volume: `docker compose exec ecommerce-app ls -la /app/Backend` |
| Python not found | Rebuild image; venv PATH is set in Dockerfile |
| `spawn python ENOENT` | Rebuild; confirm `which python` inside container returns `/opt/venv/bin/python` |

```bash
# Shell into container
docker compose exec ecommerce-app bash
which python
python --version
ls -la /app/Backend/
```

---

## Phase 2 — Domain + HTTPS (trendinsight.live)

**Do this after** DNS A record for `trendinsight.live` points to `68.183.179.83`.

### DNS

| Type | Name | Value |
|------|------|-------|
| A | @ | 68.183.179.83 |
| A | www | 68.183.179.83 |

### Approach

Add a separate compose overlay so Phase 1 stays untouched:

1. Create `docker-compose.tls.yml` with:
   - `nginx` service on ports `80:80` and `443:443`
   - Reverse proxy to `ecommerce-app:3000`
   - Static config for `trendinsight.live` and `www.trendinsight.live`

2. Use **Certbot** (or `nginxproxy/acme-companion`) for Let's Encrypt certificates.

3. Start with:

   ```bash
   docker compose -f docker-compose.yml -f docker-compose.tls.yml up -d
   ```

### Example nginx server block (reference)

```nginx
server {
    listen 80;
    server_name trendinsight.live www.trendinsight.live;
    location / {
        proxy_pass http://ecommerce-app:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

After certbot obtains certs, add SSL listen directives and redirect HTTP → HTTPS.

### Notes

- Port 80/443 must be free (currently unused on this droplet; `asl-nginx` uses 8001 only).
- Phase 1 URL (`:3003`) can remain available during migration.
- Set `NEXT_PUBLIC_*` or proxy headers if the app needs to know the public URL.

---

## File reference

| File | Purpose |
|------|---------|
| `Dockerfile` | Multi-stage Node + Python image |
| `docker-compose.selfhosted.yml` | **Local stack**: postgres + app (4001) + cloudflared |
| `docker-compose.yml` | **Droplet**: app on 3003, external postgres network |
| `docker-compose.tls.yml` | **Droplet**: nginx + certbot for HTTPS |
| `.env.selfhosted.example` | Local env template |
| `.env.production.example` | Droplet env template |
| `deploy/cloudflare/README.md` | Cloudflare Tunnel setup |
| `deploy/scripts/self-deploy.sh` | **Single local deploy** (tunnel first, then app) |
| `deploy/init-db.sql` | Create `ep` database |
| `deploy/README.md` | This runbook |
