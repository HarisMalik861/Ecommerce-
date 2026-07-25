"""
Persist uploaded datasets in Neon Postgres so they survive Render restarts.

Baseline stays on local/git disk (too large to duplicate). Uploaded CSVs are
stored as BYTEA + metadata and hydrated back to Backend/datasets/ on startup.
"""

from __future__ import annotations

import os
from datetime import datetime, timezone
from typing import Any

BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
DATASETS_DIR = os.path.join(BACKEND_DIR, "datasets")
REGISTRY_PATH = os.path.join(DATASETS_DIR, "registry.json")
BASELINE_ID = "baseline-500k"

DDL = """
CREATE TABLE IF NOT EXISTS ml_datasets (
  id TEXT PRIMARY KEY,
  original_name TEXT NOT NULL,
  file_name TEXT NOT NULL,
  rows INTEGER NOT NULL DEFAULT 0,
  size_bytes BIGINT NOT NULL DEFAULT 0,
  is_baseline BOOLEAN NOT NULL DEFAULT FALSE,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  csv_bytes BYTEA
);
"""


def database_url() -> str:
    return (os.environ.get("DATABASE_URL") or "").strip()


def is_enabled() -> bool:
    return bool(database_url())


def _connect():
    import psycopg

    return psycopg.connect(database_url(), connect_timeout=20)


def ensure_schema() -> None:
    if not is_enabled():
        return
    with _connect() as conn:
        with conn.cursor() as cur:
            cur.execute(DDL)
        conn.commit()


def upsert_dataset(
    *,
    dataset_id: str,
    original_name: str,
    file_name: str,
    rows: int,
    size_bytes: int,
    is_baseline: bool,
    uploaded_at: str | None,
    is_active: bool,
    csv_path: str | None = None,
    store_bytes: bool = True,
) -> None:
    """Upsert metadata; optionally store CSV bytes (skip for baseline)."""
    if not is_enabled():
        return

    csv_bytes: bytes | None = None
    if store_bytes and csv_path and os.path.isfile(csv_path):
        with open(csv_path, "rb") as handle:
            csv_bytes = handle.read()

    uploaded = uploaded_at or datetime.now(timezone.utc).isoformat()
    with _connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO ml_datasets (
                  id, original_name, file_name, rows, size_bytes,
                  is_baseline, uploaded_at, is_active, csv_bytes
                ) VALUES (
                  %s, %s, %s, %s, %s, %s, %s::timestamptz, %s, %s
                )
                ON CONFLICT (id) DO UPDATE SET
                  original_name = EXCLUDED.original_name,
                  file_name = EXCLUDED.file_name,
                  rows = EXCLUDED.rows,
                  size_bytes = EXCLUDED.size_bytes,
                  is_baseline = EXCLUDED.is_baseline,
                  uploaded_at = EXCLUDED.uploaded_at,
                  is_active = EXCLUDED.is_active,
                  csv_bytes = COALESCE(EXCLUDED.csv_bytes, ml_datasets.csv_bytes)
                """,
                (
                    dataset_id,
                    original_name,
                    file_name,
                    int(rows),
                    int(size_bytes),
                    bool(is_baseline),
                    uploaded,
                    bool(is_active),
                    csv_bytes,
                ),
            )
            if is_active:
                cur.execute(
                    "UPDATE ml_datasets SET is_active = FALSE WHERE id <> %s",
                    (dataset_id,),
                )
        conn.commit()


def mark_active(dataset_id: str) -> None:
    if not is_enabled():
        return
    with _connect() as conn:
        with conn.cursor() as cur:
            cur.execute("UPDATE ml_datasets SET is_active = FALSE")
            cur.execute(
                "UPDATE ml_datasets SET is_active = TRUE WHERE id = %s",
                (dataset_id,),
            )
        conn.commit()


def delete_dataset(dataset_id: str) -> None:
    if not is_enabled():
        return
    with _connect() as conn:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM ml_datasets WHERE id = %s", (dataset_id,))
        conn.commit()


def list_remote_datasets() -> list[dict[str, Any]]:
    if not is_enabled():
        return []
    with _connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, original_name, file_name, rows, size_bytes,
                       is_baseline, uploaded_at, is_active,
                       (csv_bytes IS NOT NULL) AS has_bytes
                FROM ml_datasets
                ORDER BY uploaded_at ASC
                """
            )
            rows = cur.fetchall()
    items: list[dict[str, Any]] = []
    for row in rows:
        uploaded = row[6]
        uploaded_iso = (
            uploaded.isoformat() if hasattr(uploaded, "isoformat") else str(uploaded)
        )
        items.append(
            {
                "id": row[0],
                "originalName": row[1],
                "fileName": row[2],
                "rows": int(row[3] or 0),
                "sizeBytes": int(row[4] or 0),
                "isBaseline": bool(row[5]),
                "uploadedAt": uploaded_iso,
                "isActive": bool(row[7]),
                "hasBytes": bool(row[8]),
            }
        )
    return items


def fetch_csv_bytes(dataset_id: str) -> bytes | None:
    if not is_enabled():
        return None
    with _connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT csv_bytes FROM ml_datasets WHERE id = %s",
                (dataset_id,),
            )
            row = cur.fetchone()
    if not row or row[0] is None:
        return None
    return bytes(row[0])


def hydrate_to_disk() -> dict[str, Any]:
    """
    Restore uploaded CSVs + registry from Neon onto local disk.
    Safe no-op when DATABASE_URL is unset.
    """
    import json

    if not is_enabled():
        return {"enabled": False, "restored": 0}

    ensure_schema()
    os.makedirs(DATASETS_DIR, exist_ok=True)
    remote = list_remote_datasets()
    if not remote:
        return {"enabled": True, "restored": 0, "datasets": 0}

    restored = 0
    datasets_meta: list[dict[str, Any]] = []
    active_id = None

    for item in remote:
        dataset_id = str(item["id"])
        if item.get("isActive"):
            active_id = dataset_id

        # Always keep baseline metadata; bytes come from git/local seed.
        if dataset_id == BASELINE_ID or item.get("isBaseline"):
            datasets_meta.append(
                {
                    "id": dataset_id,
                    "fileName": item.get("fileName") or f"{dataset_id}.csv",
                    "originalName": item.get("originalName") or dataset_id,
                    "rows": item.get("rows") or 0,
                    "sizeBytes": item.get("sizeBytes") or 0,
                    "isBaseline": True,
                    "uploadedAt": item.get("uploadedAt") or "",
                }
            )
            continue

        dest = os.path.join(DATASETS_DIR, f"{dataset_id}.csv")
        if not os.path.isfile(dest) and item.get("hasBytes"):
            payload = fetch_csv_bytes(dataset_id)
            if payload:
                with open(dest, "wb") as handle:
                    handle.write(payload)
                restored += 1

        if os.path.isfile(dest):
            datasets_meta.append(
                {
                    "id": dataset_id,
                    "fileName": item.get("fileName") or f"{dataset_id}.csv",
                    "originalName": item.get("originalName") or dataset_id,
                    "rows": item.get("rows") or 0,
                    "sizeBytes": item.get("sizeBytes")
                    or os.path.getsize(dest),
                    "isBaseline": False,
                    "uploadedAt": item.get("uploadedAt") or "",
                }
            )

    # Merge with any local-only baseline if remote omitted it.
    local_baseline = os.path.join(DATASETS_DIR, f"{BASELINE_ID}.csv")
    if not any(d["id"] == BASELINE_ID for d in datasets_meta) and os.path.isfile(
        local_baseline
    ):
        datasets_meta.insert(
            0,
            {
                "id": BASELINE_ID,
                "fileName": f"{BASELINE_ID}.csv",
                "originalName": "daraz_multicategory_pakistan_500k.csv",
                "rows": 500000,
                "sizeBytes": os.path.getsize(local_baseline),
                "isBaseline": True,
                "uploadedAt": "",
            },
        )

    if not active_id:
        active_id = BASELINE_ID if any(d["id"] == BASELINE_ID for d in datasets_meta) else (
            datasets_meta[0]["id"] if datasets_meta else None
        )

    registry = {"activeId": active_id, "datasets": datasets_meta}
    with open(REGISTRY_PATH, "w", encoding="utf-8") as handle:
        json.dump(registry, handle, indent=2)

    return {
        "enabled": True,
        "restored": restored,
        "datasets": len(datasets_meta),
        "activeId": active_id,
    }
