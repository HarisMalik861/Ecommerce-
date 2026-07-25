"""Helpers to run existing Backend CLI scripts and manage job status files."""

from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path
from typing import Any


BACKEND_DIR = Path(__file__).resolve().parent.parent
PYTHON = sys.executable


def run_script(
    script: str,
    args: list[str] | None = None,
    *,
    stdin_text: str | None = None,
    timeout: int | None = 300,
) -> dict[str, Any]:
    """Run a Backend/*.py script and parse JSON from stdout."""
    cmd = [PYTHON, str(BACKEND_DIR / script), *(args or [])]
    completed = subprocess.run(
        cmd,
        cwd=str(BACKEND_DIR),
        input=stdin_text,
        capture_output=True,
        text=True,
        timeout=timeout,
        env={**os.environ, "PYTHONUNBUFFERED": "1"},
        check=False,
    )
    stdout = (completed.stdout or "").strip()
    stderr = (completed.stderr or "").strip()

    if completed.returncode != 0:
        # Prefer JSON error from stdout if present
        if stdout:
            try:
                parsed = json.loads(stdout)
                if isinstance(parsed, dict) and parsed.get("error"):
                    return {"__error__": str(parsed["error"]), "__status__": 400}
            except json.JSONDecodeError:
                pass
        message = stderr or stdout or f"{script} exited with code {completed.returncode}"
        return {"__error__": message, "__status__": 500}

    if not stdout:
        return {"__error__": f"{script} returned empty output", "__status__": 500}

    try:
        return json.loads(stdout)
    except json.JSONDecodeError:
        return {
            "__error__": f"Invalid JSON from {script}",
            "__status__": 500,
            "__raw__": stdout[:2000],
        }


def start_detached(script: str, args: list[str]) -> None:
    """Fire-and-forget background script (upload/retrain/activate)."""
    cmd = [PYTHON, str(BACKEND_DIR / script), *args]
    kwargs: dict[str, Any] = {
        "cwd": str(BACKEND_DIR),
        "stdout": subprocess.DEVNULL,
        "stderr": subprocess.DEVNULL,
        "stdin": subprocess.DEVNULL,
        "env": {**os.environ, "PYTHONUNBUFFERED": "1"},
    }
    if os.name == "nt":
        kwargs["creationflags"] = subprocess.CREATE_NEW_PROCESS_GROUP  # type: ignore[attr-defined]
    else:
        kwargs["start_new_session"] = True

    subprocess.Popen(cmd, **kwargs)


def read_job(job_id: str) -> dict[str, Any] | None:
    path = BACKEND_DIR / "upload_jobs" / f"{job_id}.json"
    if not path.is_file():
        return None
    return json.loads(path.read_text(encoding="utf-8"))


def write_job(job_id: str, payload: dict[str, Any]) -> Path:
    jobs_dir = BACKEND_DIR / "upload_jobs"
    jobs_dir.mkdir(parents=True, exist_ok=True)
    path = jobs_dir / f"{job_id}.json"
    path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    return path
