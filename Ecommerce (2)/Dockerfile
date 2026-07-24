# Ecommerce: Next.js frontend + Python ML scripts (single container)
# Build context: repo root (Ecommerce/)

# -----------------------------------------------------------------------------
# Stage 1: Build Next.js app
# -----------------------------------------------------------------------------
FROM node:20-bookworm-slim AS builder

WORKDIR /app/Frontend

COPY Frontend/package.json Frontend/package-lock.json ./
RUN npm ci

COPY Frontend/ ./
RUN npm run build

# -----------------------------------------------------------------------------
# Stage 2: Runtime (Node + Python + ML dependencies)
# -----------------------------------------------------------------------------
FROM node:20-bookworm-slim AS runtime

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PYTHONUNBUFFERED=1 \
    PATH="/opt/venv/bin:${PATH}"

# System libs for xgboost, matplotlib, and Python venv
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    python3-venv \
    libgomp1 \
    libstdc++6 \
    libpng16-16 \
    libfreetype6 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Python ML stack (used by Next.js API routes via spawn("python", ...))
COPY Backend/requirements.txt Backend/requirements.txt
RUN python3 -m venv /opt/venv \
    && /opt/venv/bin/pip install --no-cache-dir --upgrade pip \
    && /opt/venv/bin/pip install --no-cache-dir -r Backend/requirements.txt

# Backend scripts (CSVs/models/datasets come from host volume at runtime)
COPY Backend/*.py Backend/
RUN mkdir -p Backend/datasets Backend/models Backend/upload_jobs

# Frontend production bundle
WORKDIR /app/Frontend
COPY Frontend/package.json Frontend/package-lock.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/Frontend/.next ./.next
COPY --from=builder /app/Frontend/public ./public
COPY Frontend/migrations ./migrations
COPY Frontend/scripts ./scripts
COPY Frontend/schema.sql ./schema.sql
COPY Frontend/next.config.mjs ./next.config.mjs

WORKDIR /app/Frontend

EXPOSE 3000

CMD ["npm", "run", "start"]
