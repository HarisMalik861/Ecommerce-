# Cloudflare Tunnel for trendinsight.live (native, no Docker)

Expose your locally running app at **https://trendinsight.live** without opening router ports. The app runs on **http://localhost:4001**; `cloudflared` forwards traffic from Cloudflare.

## Prerequisites

- Domain **trendinsight.live** on Cloudflare (proxied / orange cloud).
- App deployed via `./deploy/scripts/self-deploy.sh` (or tunnel setup step completed).

## Multiple Cloudflare accounts / apps on one PC

Each app must use its **own** tunnel credentials. Do **not** share `~/.cloudflared/` between projects.

| Location | Used by |
|----------|---------|
| `~/.cloudflared/` | Other app / other Cloudflare account (leave untouched) |
| `deploy/cloudflare/cf-userprofile/.cloudflared/` | **This** ecommerce app only |
| `%USERPROFILE%\.cloudflared\` | Other app — never modified |

On Windows, `cloudflared tunnel login` always reads `%USERPROFILE%\.cloudflared`. The script uses an isolated fake `USERPROFILE` under `deploy/cloudflare/cf-userprofile/` so your other account's certificate is never touched.

When the browser opens for `tunnel login`, sign in with the account that **owns trendinsight.live**.

To start fresh on the correct account:

```bash
./deploy/scripts/self-deploy.sh --tunnel-reset
```

This wipes only `deploy/cloudflare/` — not `~/.cloudflared/`.

## Auth (automatic)

`self-deploy.sh` uses **`cloudflared tunnel login`** by default (browser OAuth). No token required.

Optional: set `CLOUDFLARE_TUNNEL_TOKEN` in `.env.production` to skip browser login.

## What the script does

1. `cloudflared tunnel login` — opens browser, saves cert to `~/.cloudflared/cert.pem` (Windows: `%USERPROFILE%\.cloudflared\`)
2. `cloudflared tunnel create trendinsight-ecommerce` — credentials saved as `~/.cloudflared/<tunnel-id>.json`
3. `cloudflared tunnel route dns` for `trendinsight.live` and `www`
4. Writes `deploy/cloudflare/config.yml`:

```yaml
ingress:
  - hostname: trendinsight.live
    service: http://localhost:4001
  - hostname: www.trendinsight.live
    service: http://localhost:4001
  - service: http_status:404
```

5. Starts `cloudflared` in background (logs: `.run/cloudflared.log`)

## Manual commands (Git Bash)

```bash
# Tunnel setup only
./deploy/scripts/self-deploy.sh --tunnel-login

# Full deploy
./deploy/scripts/self-deploy.sh
```

If `cloudflared` is not installed, the script downloads it to `deploy/cloudflare/cloudflared.exe`.

## SSL/TLS

Cloudflare dashboard → **SSL/TLS** → **Full**.

## Verify

```bash
curl http://localhost:4001/api/health/db
curl https://trendinsight.live/api/health/db
tail -f .run/cloudflared.log
```

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Login browser did not open | Run `./deploy/scripts/self-deploy.sh --tunnel-login` from Git Bash |
| 502 on domain | Ensure Next.js is on port 4001: `curl localhost:4001` |
| DNS points to old IP | Remove stale A records; use tunnel CNAMEs |
| Tunnel stops after closing terminal | Re-run `./deploy/scripts/self-deploy.sh` or keep Git Bash session open |

## Security

Do not commit `cert.pem`, `*.json`, `config.yml`, or `.env.production`.
