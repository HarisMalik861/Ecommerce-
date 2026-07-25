# Vercel + Render split deployment

This project splits as:

| Piece | Host | Root |
|-------|------|------|
| Next.js UI + auth/Postgres APIs | **Vercel** | `Frontend/` |
| Python ML + datasets/models | **Render** | `Backend/` |

## Prerequisites

1. GitHub/GitLab repo with this code pushed
2. [Vercel](https://vercel.com) account (Hobby is fine for personal/FYP)
3. [Render](https://render.com) account
4. A Postgres database (Render Postgres free = 30 days, or Neon/Supabase free forever)

**Do not paste passwords into chat.** Use dashboard login / CLI login.

---

## 1. Database

Create Postgres and run schema/migrations against it:

```bash
# from repo root, with DATABASE_URL set
psql "$DATABASE_URL" -f deploy/init-db.sql
psql "$DATABASE_URL" -d ep -f Frontend/schema.sql
psql "$DATABASE_URL" -d ep -f Frontend/migrations/20260301_add_contact_number_to_users.sql
psql "$DATABASE_URL" -d ep -f Frontend/migrations/20260301_make_email_optional.sql
```

Or use `Frontend/scripts/run-migration.js` with `DATABASE_URL` set.

Create an admin user (with `DATABASE_URL` set):

```bash
cd Frontend && node scripts/create-admin.js
```

---

## 2. Deploy ML Backend on Render

1. New → **Web Service** → connect this repo
2. Settings:
   - **Root Directory:** `Backend`
   - **Runtime:** Python 3
   - **Build:** `pip install -r requirements.txt`
   - **Start:** `uvicorn api.main:app --host 0.0.0.0 --port $PORT`
   - **Health check:** `/health`
3. Environment:
   - `BACKEND_API_KEY` = long random string (save it)
   - `PYTHONUNBUFFERED` = `1`
4. **Disk (important):** Free instances lose files on redeploy. Attach a persistent disk and ensure `datasets/`, `models/`, `future_sales_predictions.csv`, `top_20_products.csv`, and model JSON/pkl files live on it. On first deploy, upload/copy those assets from your local `Backend/` folder (Shell/SSH or one-time scp via a temporary paid instance).
5. Deploy and note the URL, e.g. `https://ecommerce-ml-api.onrender.com`
6. Smoke test: open `/health`

Optional: use root `render.yaml` Blueprint deploy.

**Free tier notes:** spins down after idle (~15 min); cold start can take 30–60s+. ML + large CSVs may need more than 512 MB RAM — upgrade if the service OOMs.

---

## 3. Deploy Frontend on Vercel

1. Import the same repo in Vercel
2. **Root Directory:** `Frontend`
3. Framework: Next.js (auto)
4. Environment variables (Production):

| Name | Value |
|------|--------|
| `DATABASE_URL` | your Postgres URL |
| `DATABASE_SSL` | `true` |
| `JWT_SECRET` | `openssl rand -hex 32` output |
| `JWT_EXPIRES_IN` | `7d` |
| `BACKEND_API_URL` | `https://YOUR-RENDER-SERVICE.onrender.com` |
| `BACKEND_API_KEY` | same as Render |

5. Deploy

CLI alternative (after `npx vercel login`):

```bash
cd Frontend
npx vercel --prod
```

Set env vars in the Vercel dashboard (or `vercel env add`).

---

## 4. Local development with the split

Terminal A — ML API:

```bash
cd Backend
python -m venv .venv
# Windows: .venv\Scripts\activate
pip install -r requirements.txt
python -m uvicorn api.main:app --host 0.0.0.0 --port 8000 --reload
```

Terminal B — Next.js:

```bash
cd Frontend
# .env.local
# BACKEND_API_URL=http://127.0.0.1:8000
# BACKEND_API_KEY=
# DATABASE_URL=...
npm run dev
```

---

## Architecture

```
Browser → Vercel (Next.js)
            ├─ /api/auth/*, /api/admin/users/*  → Postgres
            └─ /api/trends/*, /api/admin/dataset/* → Render FastAPI → Python ML + CSVs
```

See `.env.vercel-render.example` for the env template.
