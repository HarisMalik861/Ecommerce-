# Deployment scripts

## Local self-hosted (native, no Docker)

| Script | Purpose |
|--------|---------|
| **`self-deploy.sh`** | **Single deploy** — tunnel login first, then Node + Python + Postgres on port **4001** |
| **`self-deploy.ps1`** | PowerShell wrapper (requires Git Bash) |
| `local-up.sh` | Alias → `self-deploy.sh` |

**Use Git Bash** (not plain bash without path fixes):

```bash
cp .env.selfhosted.example .env.production
./deploy/scripts/self-deploy.sh
./deploy/scripts/self-deploy.sh --seed-admin
./deploy/scripts/self-deploy.sh --tunnel-login
./deploy/scripts/self-deploy.sh --stop
```

Requires: Node.js, Python 3, PostgreSQL on localhost:5432. No Docker.

See [deploy/cloudflare/README.md](../cloudflare/README.md).

---

## DigitalOcean droplet (legacy)

Helper bash scripts for deploying Ecommerce to the DigitalOcean droplet at `68.183.179.83`.

## Requirements

- `ssh` on your machine.
- `rsync` is preferred, but optional. If it is missing, `copy.sh` automatically falls back to `tar | ssh`.
- On Windows: run from **Git Bash**, **WSL**, or any POSIX shell.
- SSH key already authorized on `root@68.183.179.83`.

## First-time setup

```bash
# Make scripts executable (only needed once on Linux/macOS/WSL)
chmod +x deploy/scripts/*.sh

# Verify SSH connectivity
./deploy/scripts/ssh.sh
exit
```

## End-to-end deploy

```bash
./deploy/scripts/all.sh
```

This runs every step. On the first run it stops after creating `.env` files on the droplet and asks you to fill in `POSTGRES_NETWORK` and `JWT_SECRET`. Then re-run.

## Individual commands

| Script | Purpose |
|--------|---------|
| `ssh.sh` | SSH into the droplet, cwd `/root/ecommerce/app` |
| `copy.sh app` | copy app source (no Backend, no node_modules) |
| `copy.sh backend` | copy Backend/ (~160MB models + datasets) |
| `copy.sh all` | both |
| `env-setup.sh [--force]` | Auto-fill `.env` (POSTGRES_NETWORK) and `.env.production` (JWT_SECRET) on droplet |
| `build.sh [--no-cache]` | `docker compose build` on droplet |
| `init-db.sh [--seed-admin]` | Create `ep` DB, run schema + migrations, optional admin seed |
| `deploy.sh [--build] [--restart]` | `docker compose up -d` + smoke test |
| `logs.sh [--all]` | Tail container logs |
| `all.sh` | End-to-end deployment |
| `tls-init.sh` | First-time HTTPS setup (verify DNS, issue Let's Encrypt cert, enable HTTPS) |
| `tls-up.sh [--restart]` | Bring up nginx + certbot containers |
| `tls-renew.sh [--force]` | Manually trigger cert renewal |
| `tls-logs.sh [nginx\|certbot]` | Tail TLS layer logs |

## Avoid passphrase prompts (recommended)

If your SSH key has a passphrase, every script step prompts you. Start ssh-agent **once per Git Bash session** to cache the passphrase:

```bash
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_ed25519
```

After this, all `./deploy/scripts/*.sh` calls reuse the cached key.

## Environment overrides

All scripts source `config.sh`. Override any default by exporting before running:

```bash
DROPLET_HOST=1.2.3.4 ./deploy/scripts/ssh.sh
APP_PORT=4001 ./deploy/scripts/deploy.sh
DRY_RUN=1 ./deploy/scripts/copy.sh app
```

## Typical workflows

### Updating app code (no Backend changes)

```bash
./deploy/scripts/copy.sh app
./deploy/scripts/deploy.sh --build
```

### Updating model / dataset only

```bash
./deploy/scripts/copy.sh backend
./deploy/scripts/deploy.sh --restart
```

### Just want logs

```bash
./deploy/scripts/logs.sh
```
