"""
Register uploaded dataset as a separate file, set active, and retrain model artifacts.

Usage:
  python append_and_retrain.py <uploaded_csv_path> [deduplicate(0|1)] [status_json_path]
"""

import json
import os
import shutil
import subprocess
import sys
import pandas as pd
from preprocessing_pipeline import clean_raw_dataset_for_append_with_report
from dataset_registry import (
    delete_dataset,
    ensure_registry_seeded,
    get_active_id,
    register_dataset,
    set_active,
)
from model_cache import save_cache

MODEL_FILE = "sales_trend_model.json"
ENCODERS_FILE = "label_encoders.pkl"
FEATURES_FILE = "feature_columns.json"


def write_status(status_path: str | None, payload: dict):
    if not status_path:
        return
    try:
        existing = {}
        if os.path.exists(status_path):
            with open(status_path, "r", encoding="utf-8") as read_status_file:
                existing = json.load(read_status_file)
        with open(status_path, "w", encoding="utf-8") as status_file:
            json.dump({**existing, **payload}, status_file, indent=2)
    except Exception:
        pass


def run_script(script_name: str):
    process = subprocess.run(
        [sys.executable, script_name],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
    )
    if process.returncode != 0:
        raise RuntimeError(
            f"{script_name} failed:\n{process.stderr.strip() or process.stdout.strip()}"
        )


def backup_file(path: str) -> str:
    backup = f"{path}.backup_tmp"
    shutil.copy2(path, backup)
    return backup


def restore_file(backup: str, original: str):
    if os.path.exists(backup):
        shutil.copy2(backup, original)


def remove_file_if_exists(path: str):
    if os.path.exists(path):
        os.remove(path)


def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Missing uploaded CSV path argument"}))
        sys.exit(1)

    uploaded_csv = sys.argv[1]
    deduplicate = len(sys.argv) > 2 and str(sys.argv[2]).strip() in {"1", "true", "True"}
    status_path = sys.argv[3] if len(sys.argv) > 3 else None

    if not os.path.exists(uploaded_csv):
        write_status(
            status_path,
            {"status": "failed", "progress": 100, "message": "Uploaded CSV file not found"},
        )
        print(json.dumps({"error": "Uploaded CSV file not found"}))
        sys.exit(1)

    write_status(
        status_path,
        {"status": "running", "progress": 5, "message": "Preparing dataset registration job"},
    )

    ensure_registry_seeded()
    previous_dataset_id = get_active_id()

    model_backup = backup_file(MODEL_FILE) if os.path.exists(MODEL_FILE) else None
    enc_backup = backup_file(ENCODERS_FILE) if os.path.exists(ENCODERS_FILE) else None
    feat_backup = backup_file(FEATURES_FILE) if os.path.exists(FEATURES_FILE) else None

    cleaned_tmp = f"{uploaded_csv}.cleaned_tmp.csv"
    new_dataset_id = None

    try:
        write_status(
            status_path,
            {"status": "running", "progress": 20, "message": "Cleaning uploaded dataset"},
        )
        upload_df = pd.read_csv(uploaded_csv)
        cleaned_upload, preprocessing_report = clean_raw_dataset_for_append_with_report(
            upload_df, deduplicate=deduplicate
        )
        cleaned_upload.to_csv(cleaned_tmp, index=False)

        write_status(
            status_path,
            {"status": "running", "progress": 40, "message": "Saving dataset as separate file"},
        )
        original_name = "uploaded_dataset.csv"
        if status_path and os.path.exists(status_path):
            try:
                with open(status_path, "r", encoding="utf-8") as status_file:
                    status_data = json.load(status_file)
                original_name = str(status_data.get("fileName") or original_name)
            except Exception:
                pass

        new_dataset_id = register_dataset(cleaned_tmp, original_name)
        set_active(new_dataset_id)

        # Persist "registered" early so a later OOM/restart still leaves a usable dataset.
        write_status(
            status_path,
            {
                "status": "running",
                "progress": 55,
                "message": "Dataset saved. Starting model retrain...",
                "result": {
                    "newDatasetId": new_dataset_id,
                    "previousDatasetId": previous_dataset_id,
                    "rows": int(len(cleaned_upload)),
                    "totalRows": int(len(cleaned_upload)),
                    "retrained": False,
                    "predictionsRefreshed": False,
                    "preprocessingReport": preprocessing_report,
                },
            },
        )

        retrained = False
        predictions_refreshed = False
        train_error = None
        try:
            write_status(
                status_path,
                {
                    "status": "running",
                    "progress": 70,
                    "message": "Retraining model on active dataset",
                },
            )
            run_script("train_model.py")
            retrained = True

            write_status(
                status_path,
                {
                    "status": "running",
                    "progress": 90,
                    "message": "Refreshing prediction outputs",
                },
            )
            run_script("predict_future_sales.py")
            predictions_refreshed = True

            try:
                save_cache(new_dataset_id)
            except Exception as cache_exc:
                print(f"warning: failed to cache model for {new_dataset_id}: {cache_exc}")
        except Exception as train_exc:
            # Keep the uploaded dataset even if retrain dies (common on free RAM limits).
            train_error = str(train_exc)
            print(f"warning: retrain/predict failed, dataset kept: {train_error}")
            if model_backup:
                restore_file(model_backup, MODEL_FILE)
            if enc_backup:
                restore_file(enc_backup, ENCODERS_FILE)
            if feat_backup:
                restore_file(feat_backup, FEATURES_FILE)

        total_rows = int(len(cleaned_upload))
        result = {
            "newDatasetId": new_dataset_id,
            "previousDatasetId": previous_dataset_id,
            "rows": total_rows,
            "totalRows": total_rows,
            "retrained": retrained,
            "predictionsRefreshed": predictions_refreshed,
            "preprocessingReport": preprocessing_report,
            "trainError": train_error,
        }
        message = (
            "Dataset registered, activated, model retrained, predictions refreshed"
            if retrained and predictions_refreshed
            else (
                "Dataset registered and activated. Model retrain skipped/failed "
                "(not enough server memory). Dataset is still available."
            )
        )
        write_status(
            status_path,
            {
                "status": "completed",
                "progress": 100,
                "message": message,
                "result": result,
            },
        )
        print(json.dumps(result))
    except Exception as exc:
        if new_dataset_id:
            try:
                if previous_dataset_id:
                    set_active(previous_dataset_id)
                delete_dataset(new_dataset_id)
            except Exception:
                pass

        if model_backup:
            restore_file(model_backup, MODEL_FILE)
        if enc_backup:
            restore_file(enc_backup, ENCODERS_FILE)
        if feat_backup:
            restore_file(feat_backup, FEATURES_FILE)

        write_status(
            status_path,
            {"status": "failed", "progress": 100, "message": str(exc)},
        )
        print(json.dumps({"error": str(exc)}))
        sys.exit(1)
    finally:
        remove_file_if_exists(uploaded_csv)
        remove_file_if_exists(cleaned_tmp)
        if model_backup:
            remove_file_if_exists(model_backup)
        if enc_backup:
            remove_file_if_exists(enc_backup)
        if feat_backup:
            remove_file_if_exists(feat_backup)


if __name__ == "__main__":
    main()
