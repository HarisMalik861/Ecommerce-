"""
ML Backend HTTP API for Render.

Run locally:
  cd Backend
  python -m uvicorn api.main:app --host 0.0.0.0 --port 8000 --reload

Render start command:
  uvicorn api.main:app --host 0.0.0.0 --port $PORT
"""

from __future__ import annotations

import csv
import json
import os
import re
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from fastapi import Depends, FastAPI, File, Form, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .runner import BACKEND_DIR, read_job, run_script, start_detached, write_job
from .security import require_api_key
from .trends_agg import build_category_payload, build_trends_payload

# Backend scripts/modules live one level up from api/
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from dataset_registry import (  # noqa: E402
    get_active_id,
    register_dataset,
    set_active,
)

REQUIRED_COLUMNS = [
    "Product_Name",
    "Category",
    "Gender",
    "Color",
    "Sleeve_Type",
    "Material",
    "Combo_Item",
    "Is_Flash_Sale",
    "Price",
    "Discount_Pct",
    "Month",
    "Year",
    "City",
    "Sales",
]

app = FastAPI(title="Ecommerce ML API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _error_response(payload: dict[str, Any]) -> JSONResponse | None:
    if "__error__" in payload:
        status = int(payload.get("__status__", 500))
        return JSONResponse({"error": payload["__error__"]}, status_code=status)
    return None


@app.get("/health")
def health() -> dict[str, Any]:
    preds = BACKEND_DIR / "future_sales_predictions.csv"
    registry = BACKEND_DIR / "datasets" / "registry.json"
    return {
        "ok": True,
        "backendDir": str(BACKEND_DIR),
        "predictionsPresent": preds.is_file(),
        "registryPresent": registry.is_file(),
    }


@app.post("/v1/predict/product", dependencies=[Depends(require_api_key)])
async def predict_product(payload: dict[str, Any]) -> JSONResponse:
    result = run_script(
        "predict_new_product_json.py",
        stdin_text=json.dumps(payload),
        timeout=180,
    )
    err = _error_response(result)
    if err:
        return err
    if result.get("error"):
        return JSONResponse({"error": result["error"]}, status_code=400)
    return JSONResponse(result)


@app.post("/v1/predict/generic-top", dependencies=[Depends(require_api_key)])
async def predict_generic_top(payload: dict[str, Any]) -> JSONResponse:
    category = str(payload.get("category") or "").strip()
    if not category:
        return JSONResponse(
            {"error": "Product category is required."},
            status_code=400,
        )
    top_n = payload.get("topN", 3)
    result = run_script(
        "predict_generic_top.py",
        stdin_text=json.dumps({"category": category, "topN": top_n}),
        timeout=180,
    )
    err = _error_response(result)
    if err:
        return err
    if result.get("error"):
        return JSONResponse({"error": result["error"]}, status_code=400)
    return JSONResponse(result)


@app.get("/v1/dataset/options", dependencies=[Depends(require_api_key)])
async def dataset_options(category: str = "") -> JSONResponse:
    args = [category] if category.strip() else []
    result = run_script("dataset_options.py", args, timeout=120)
    err = _error_response(result)
    if err:
        return err
    return JSONResponse(result)


@app.get("/v1/trends", dependencies=[Depends(require_api_key)])
async def trends(refresh: bool = False) -> JSONResponse:
    try:
        cache_path = BACKEND_DIR / "trends_cache.json"
        # Prefer precomputed cache on small free instances (avoids loading 76MB CSV).
        if not refresh and cache_path.is_file():
            payload = json.loads(cache_path.read_text(encoding="utf-8"))
        else:
            payload = build_trends_payload(refresh=refresh)
            try:
                cache_path.write_text(json.dumps(payload), encoding="utf-8")
            except OSError:
                pass
        return JSONResponse(
            payload,
            headers={
                "Cache-Control": "public, max-age=10, stale-while-revalidate=30",
            },
        )
    except Exception as exc:  # noqa: BLE001
        return JSONResponse({"error": str(exc)}, status_code=500)


@app.get("/v1/trends/categories/{category_id}", dependencies=[Depends(require_api_key)])
async def trends_category(category_id: str) -> JSONResponse:
    try:
        cache_path = BACKEND_DIR / "category_trends_cache.json"
        if cache_path.is_file():
            cached = json.loads(cache_path.read_text(encoding="utf-8"))
            if category_id in cached:
                return JSONResponse(
                    cached[category_id],
                    headers={
                        "Cache-Control": "public, max-age=10, stale-while-revalidate=30",
                    },
                )
        payload = build_category_payload(category_id)
        return JSONResponse(
            payload,
            headers={
                "Cache-Control": "public, max-age=10, stale-while-revalidate=30",
            },
        )
    except KeyError:
        return JSONResponse({"error": "Unknown category"}, status_code=404)
    except Exception as exc:  # noqa: BLE001
        return JSONResponse({"error": str(exc)}, status_code=500)


@app.get("/v1/admin/datasets", dependencies=[Depends(require_api_key)])
async def list_datasets() -> JSONResponse:
    registry_path = BACKEND_DIR / "datasets" / "registry.json"
    registry: dict[str, Any]
    if registry_path.is_file():
        registry = json.loads(registry_path.read_text(encoding="utf-8"))
    else:
        result = run_script("dataset_admin.py", ["list"], timeout=120)
        err = _error_response(result)
        if err:
            return err
        registry = result

    active_id = registry.get("activeId")
    datasets = []
    for ds in registry.get("datasets") or []:
        datasets.append(
            {
                "id": ds.get("id"),
                "fileName": ds.get("fileName"),
                "originalName": ds.get("originalName"),
                "rows": ds.get("rows"),
                "sizeBytes": ds.get("sizeBytes"),
                "isBaseline": bool(ds.get("isBaseline")),
                "uploadedAt": ds.get("uploadedAt"),
                "isActive": ds.get("id") == active_id,
            }
        )
    return JSONResponse({"activeId": active_id, "datasets": datasets})


@app.post("/v1/admin/datasets/{dataset_id}/activate", dependencies=[Depends(require_api_key)])
async def activate_dataset(dataset_id: str) -> JSONResponse:
    if not re.fullmatch(r"[a-zA-Z0-9_-]+", dataset_id):
        return JSONResponse({"error": "Invalid dataset id"}, status_code=400)

    job_id = uuid.uuid4().hex
    status_path = write_job(
        job_id,
        {
            "status": "queued",
            "progress": 2,
            "message": "Dataset activation queued",
            "datasetId": dataset_id,
            "createdAt": datetime.now(timezone.utc).isoformat(),
        },
    )
    start_detached(
        "dataset_admin.py",
        ["activate", dataset_id, str(status_path)],
    )
    return JSONResponse(
        {
            "message": "Dataset activation started in background.",
            "jobId": job_id,
            "status": "queued",
            "progress": 2,
        }
    )


@app.delete("/v1/admin/datasets/{dataset_id}", dependencies=[Depends(require_api_key)])
async def delete_dataset(dataset_id: str) -> JSONResponse:
    if not re.fullmatch(r"[a-zA-Z0-9_-]+", dataset_id):
        return JSONResponse({"error": "Invalid dataset id"}, status_code=400)

    registry_path = BACKEND_DIR / "datasets" / "registry.json"
    if not registry_path.is_file():
        return JSONResponse({"error": "Registry not found"}, status_code=404)

    registry = json.loads(registry_path.read_text(encoding="utf-8"))
    entry = next(
        (ds for ds in (registry.get("datasets") or []) if ds.get("id") == dataset_id),
        None,
    )
    if not entry:
        return JSONResponse({"error": "Dataset not found"}, status_code=404)
    if entry.get("isBaseline"):
        return JSONResponse(
            {"error": "Cannot delete the baseline dataset"},
            status_code=400,
        )
    if registry.get("activeId") == dataset_id:
        return JSONResponse(
            {
                "error": (
                    "Cannot delete the active dataset. Switch to another dataset first."
                )
            },
            status_code=400,
        )

    result = run_script("dataset_admin.py", ["delete", dataset_id], timeout=120)
    err = _error_response(result)
    if err:
        return err
    if result.get("error"):
        return JSONResponse({"error": result["error"]}, status_code=400)
    return JSONResponse({"deleted": dataset_id})


def _validate_header(header: list[str]) -> dict[str, Any]:
    normalized = [h.strip().lstrip("\ufeff") for h in header]
    missing = [col for col in REQUIRED_COLUMNS if col not in normalized]
    extra = [col for col in normalized if col not in REQUIRED_COLUMNS]
    has_exact_order = len(normalized) == len(REQUIRED_COLUMNS) and all(
        col == REQUIRED_COLUMNS[index] for index, col in enumerate(normalized)
    )
    return {"missing": missing, "extra": extra, "hasExactOrder": has_exact_order}


def _light_validate_csv_file(path: Path) -> tuple[int, dict[str, Any], list[str]]:
    """
    Stream-validate a CSV on disk: header + sample rows + full row count.
    Never loads the whole file into a Python string/list (Render free RAM).
    """
    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        reader = csv.reader(handle)
        try:
            header = next(reader)
        except StopIteration:
            return (
                0,
                {"missing": REQUIRED_COLUMNS, "extra": [], "hasExactOrder": False},
                ["CSV is empty."],
            )

        header_validation = _validate_header(header)
        if (
            header_validation["missing"]
            or header_validation["extra"]
            or not header_validation["hasExactOrder"]
        ):
            return 0, header_validation, []

        numeric_checks = [
            ("Is_Flash_Sale", 7),
            ("Price", 8),
            ("Discount_Pct", 9),
            ("Year", 11),
            ("Sales", 13),
        ]
        errors: list[str] = []
        row_count = 0
        sample_limit = 80

        for i, row in enumerate(reader, start=2):
            if len(row) == 1 and not str(row[0]).strip():
                continue
            row_count += 1
            if row_count > sample_limit or len(errors) >= 5:
                continue
            if len(row) != len(REQUIRED_COLUMNS):
                errors.append(
                    f"Row {i} has {len(row)} columns; expected {len(REQUIRED_COLUMNS)}."
                )
                continue
            for key, index in numeric_checks:
                value = (row[index] if index < len(row) else "").strip()
                try:
                    float(value)
                except ValueError:
                    errors.append(
                        f'Row {i} column {key} must be numeric; got "{value}".'
                    )
                    break

    return row_count, header_validation, errors


@app.post("/v1/admin/datasets/upload", dependencies=[Depends(require_api_key)])
async def upload_dataset(
    dataset: UploadFile = File(...),
    deduplicate: str = Form("false"),
) -> JSONResponse:
    """
    Stream CSV to disk and register immediately (sync).

    Avoids loading the full file into RAM and never starts a background retrain
    (that OOMs Render free and made the UI look like uploads failed).
    """
    if not dataset.filename or not dataset.filename.lower().endswith(".csv"):
        return JSONResponse({"error": "Only CSV files are allowed."}, status_code=400)

    do_dedupe = deduplicate.lower() == "true"
    job_id = uuid.uuid4().hex
    jobs_dir = BACKEND_DIR / "upload_jobs"
    jobs_dir.mkdir(parents=True, exist_ok=True)
    uploaded_tmp = jobs_dir / f"upload_{job_id}.csv"
    cleaned_tmp = jobs_dir / f"upload_{job_id}.cleaned.csv"

    max_bytes = int(os.environ.get("UPLOAD_MAX_BYTES", str(80 * 1024 * 1024)))
    total_bytes = 0
    try:
        with uploaded_tmp.open("wb") as out:
            while True:
                chunk = await dataset.read(1024 * 1024)
                if not chunk:
                    break
                total_bytes += len(chunk)
                if total_bytes > max_bytes:
                    out.close()
                    uploaded_tmp.unlink(missing_ok=True)
                    return JSONResponse(
                        {"error": f"File too large (max {max_bytes // (1024 * 1024)} MB)."},
                        status_code=400,
                    )
                out.write(chunk)
    except Exception as write_exc:
        uploaded_tmp.unlink(missing_ok=True)
        return JSONResponse(
            {"error": f"Failed to receive upload: {write_exc}"},
            status_code=500,
        )

    if total_bytes == 0:
        uploaded_tmp.unlink(missing_ok=True)
        return JSONResponse({"error": "Uploaded file is empty."}, status_code=400)

    row_count, header_validation, row_errors = _light_validate_csv_file(uploaded_tmp)
    if (
        header_validation["missing"]
        or header_validation["extra"]
        or not header_validation["hasExactOrder"]
    ):
        uploaded_tmp.unlink(missing_ok=True)
        return JSONResponse(
            {
                "error": (
                    "CSV columns must exactly match training dataset columns and order."
                ),
                "missingColumns": header_validation["missing"],
                "extraColumns": header_validation["extra"],
                "expectedColumns": REQUIRED_COLUMNS,
            },
            status_code=400,
        )

    if row_count < 1:
        uploaded_tmp.unlink(missing_ok=True)
        return JSONResponse(
            {"error": "CSV must contain a header and at least one data row."},
            status_code=400,
        )

    if row_errors:
        uploaded_tmp.unlink(missing_ok=True)
        return JSONResponse(
            {"error": "CSV row validation failed.", "details": row_errors},
            status_code=400,
        )

    preprocessing_report: dict[str, Any] = {
        "inputRows": row_count,
        "rowsAfterCleaning": row_count,
        "deduplicated": False,
        "operationsApplied": [
            "streamed_to_disk",
            "header_validated",
            "sample_rows_validated",
            "registered_as_uploaded",
        ],
    }

    # Optional light clean/dedupe only for tiny files (avoids OOM on Render free).
    max_clean_bytes = int(os.environ.get("UPLOAD_CLEAN_MAX_BYTES", str(2 * 1024 * 1024)))
    file_size = uploaded_tmp.stat().st_size
    register_path = uploaded_tmp

    if file_size <= max_clean_bytes:
        try:
            import pandas as pd
            from preprocessing_pipeline import clean_raw_dataset_for_append_with_report

            upload_df = pd.read_csv(uploaded_tmp)
            cleaned_upload, preprocessing_report = clean_raw_dataset_for_append_with_report(
                upload_df, deduplicate=do_dedupe
            )
            cleaned_upload.to_csv(cleaned_tmp, index=False)
            register_path = cleaned_tmp
            row_count = int(len(cleaned_upload))
            del upload_df
            del cleaned_upload
        except Exception as clean_exc:
            preprocessing_report["cleanWarning"] = str(clean_exc)
    elif do_dedupe:
        preprocessing_report["cleanWarning"] = (
            "Deduplicate skipped: file too large for this server's memory."
        )

    try:
        previous_dataset_id = get_active_id()
    except Exception:
        previous_dataset_id = None

    new_dataset_id: str | None = None
    try:
        new_dataset_id = register_dataset(str(register_path), dataset.filename)
        set_active(new_dataset_id)
    except Exception as reg_exc:
        for path in (uploaded_tmp, cleaned_tmp):
            path.unlink(missing_ok=True)
        return JSONResponse(
            {"error": f"Failed to register dataset: {reg_exc}"},
            status_code=500,
        )
    finally:
        for path in (uploaded_tmp, cleaned_tmp):
            path.unlink(missing_ok=True)

    result = {
        "newDatasetId": new_dataset_id,
        "previousDatasetId": previous_dataset_id,
        "rows": row_count,
        "totalRows": row_count,
        "retrained": False,
        "predictionsRefreshed": False,
        "preprocessingReport": preprocessing_report,
    }
    message = (
        "Dataset registered and activated successfully."
    )
    write_job(
        job_id,
        {
            "status": "completed",
            "progress": 100,
            "message": message,
            "fileName": dataset.filename,
            "rows": row_count,
            "deduplicate": do_dedupe,
            "createdAt": datetime.now(timezone.utc).isoformat(),
            "result": result,
        },
    )
    return JSONResponse(
        {
            "message": message,
            "jobId": job_id,
            "status": "completed",
            "progress": 100,
            "result": result,
        }
    )


@app.get("/v1/admin/jobs/{job_id}", dependencies=[Depends(require_api_key)])
async def job_status(job_id: str) -> JSONResponse:
    if not re.fullmatch(r"[a-zA-Z0-9_-]+", job_id):
        return JSONResponse({"error": "Invalid jobId"}, status_code=400)
    payload = read_job(job_id)
    if payload is None:
        return JSONResponse({"error": "Job status not found"}, status_code=404)
    return JSONResponse({"jobId": job_id, **payload})
