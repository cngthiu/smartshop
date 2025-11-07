import json
from pathlib import Path
from typing import Any, Dict

def read_json(path: str) -> Any:
    p = Path(path)
    if not p.exists():
        raise FileNotFoundError(f"JSON not found: {p}")
    try:
        return json.loads(p.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        raise ValueError(f"Invalid JSON: {p} ({exc})")

def read_lines(path: str):
    p = Path(path)
    if not p.exists():
        raise FileNotFoundError(f"File not found: {p}")
    return [ln.strip() for ln in p.read_text(encoding="utf-8").splitlines() if ln.strip()]
