"""
Admin CLI for dataset registry operations (used by Next.js API).

Usage:
  python dataset_admin.py activate <dataset_id> [status_json_path]
  python dataset_admin.py delete <dataset_id>
  python dataset_admin.py list
"""

import json
import os
import shutil
import subprocess
import sys

from dataset_registry import (
    delete_dataset,
    ensure_registry_seeded,
    get_active_id,
    list_datasets,
    set_active,
)
from model_cache import (
    delete_cache,
    has_cached_model,
    load_cache,
    save_cache,
)

MODEL_FILE = "sales_trend_model.json"
ENCODERS_FILE = "label_encoders.pkl"
FEATURES_FILE = "feature_columns.json"


def write_status(status_path: str | None, payload: dict):
    if not status_path:
        return
    try:
        existing = {}
        if os.path.exists(status_path):
            with open(status_path, "r", encoding="utf-8") as f:
                existing = json.load(f)
        with open(status_path, "w", encoding="utf-8") as f:
            json.dump({**existing, **payload}, f, indent=2)
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


def cmd_list():
    ensure_registry_seeded()
    print(
        json.dumps(
            {
                "activeId": get_active_id(),
                "datasets": list_datasets(),
            }
        )
    )


def cmd_activate(dataset_id: str, status_path: str | None):
    ensure_registry_seeded()
    previous_id = get_active_id()

    if previous_id == dataset_id:
        result = {
            "activeId": dataset_id,
            "previousDatasetId": previous_id,
            "retrained": False,
            "predictionsRefreshed": False,
            "message": "Dataset is already active",
        }
        write_status(
            status_path,
            {
                "status": "completed",
                "progress": 100,
                "message": result["message"],
                "result": result,
            },
        )
        print(json.dumps(result))
        return

    write_status(
        status_path,
        {"status": "running", "progress": 10, "message": "Switching active dataset"},
    )

    model_backup = backup_file(MODEL_FILE) if os.path.exists(MODEL_FILE) else None
    enc_backup = backup_file(ENCODERS_FILE) if os.path.exists(ENCODERS_FILE) else None
    feat_backup = backup_file(FEATURES_FILE) if os.path.exists(FEATURES_FILE) else None

    try:
        set_active(dataset_id)

        if has_cached_model(dataset_id):
            write_status(
                status_path,
                {
                    "status": "running",
                    "progress": 60,
                    "message": "Loading cached model for this dataset",
                },
            )
            load_cache(dataset_id)
            used_cache = True
        else:
            write_status(
                status_path,
                {"status": "running", "progress": 50, "message": "Training model"},
            )
            run_script("train_model.py")
            write_status(
                status_path,
                {"status": "running", "progress": 85, "message": "Refreshing predictions"},
            )
            run_script("predict_future_sales.py")
            try:
                save_cache(dataset_id)
            except Exception as cache_exc:
                print(
                    f"warning: failed to cache model for {dataset_id}: {cache_exc}"
                )
            used_cache = False

        result = {
            "activeId": dataset_id,
            "previousDatasetId": previous_id,
            "retrained": not used_cache,
            "predictionsRefreshed": not used_cache,
            "usedCache": used_cache,
        }
        message = (
            "Active dataset switched (cached model loaded)"
            if used_cache
            else "Active dataset switched and model retrained"
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
        if previous_id:
            try:
                set_active(previous_id)
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
        if model_backup:
            remove_file_if_exists(model_backup)
        if enc_backup:
            remove_file_if_exists(enc_backup)
        if feat_backup:
            remove_file_if_exists(feat_backup)


def cmd_delete(dataset_id: str):
    ensure_registry_seeded()
    delete_dataset(dataset_id)
    cache_removed = delete_cache(dataset_id)
    print(json.dumps({"deleted": dataset_id, "cacheRemoved": cache_removed}))


def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Missing command"}))
        sys.exit(1)

    command = sys.argv[1].strip().lower()

    if command == "list":
        cmd_list()
        return

    if command == "activate":
        if len(sys.argv) < 3:
            print(json.dumps({"error": "Missing dataset id"}))
            sys.exit(1)
        status_path = sys.argv[3] if len(sys.argv) > 3 else None
        cmd_activate(sys.argv[2], status_path)
        return

    if command == "delete":
        if len(sys.argv) < 3:
            print(json.dumps({"error": "Missing dataset id"}))
            sys.exit(1)
        try:
            cmd_delete(sys.argv[2])
        except ValueError as exc:
            print(json.dumps({"error": str(exc)}))
            sys.exit(1)
        return

    print(json.dumps({"error": f"Unknown command: {command}"}))
    sys.exit(1)


if __name__ == "__main__":
    main()
