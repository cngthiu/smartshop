from typing import Optional, Dict, Any
from pathlib import Path

_TORCH_ERROR: Optional[str] = None
try:
    import torch
except Exception as _e:
    torch = None
    _TORCH_ERROR = str(_e)

_YOLO_ERROR: Optional[str] = None
try:
    from ultralytics import YOLO
except Exception as _e:
    YOLO = None
    _YOLO_ERROR = str(_e)

def load_yolo_model(path: str):
    if YOLO is None:
        raise RuntimeError(f"ultralytics not available: {_YOLO_ERROR}")
    p = Path(path)
    if not p.exists():
        raise FileNotFoundError(f"YOLO model not found: {p}")
    return YOLO(str(p))

def load_torchscript(path: str):
    if torch is None:
        raise RuntimeError(f"Torch unavailable: {_TORCH_ERROR}")
    p = Path(path)
    if not p.exists():
        raise FileNotFoundError(f"Torch model not found: {p}")
    m = torch.jit.load(str(p), map_location="cpu")
    m.eval()
    return m

def load_torch_module(path: str):
    if torch is None:
        raise RuntimeError(f"Torch unavailable: {_TORCH_ERROR}")
    p = Path(path)
    if not p.exists():
        raise FileNotFoundError(f"Torch model not found: {p}")
    m = torch.load(str(p), map_location="cpu")
    if not hasattr(m, "eval"):
        raise RuntimeError("Loaded object is not nn.Module")
    m.eval()
    return m
