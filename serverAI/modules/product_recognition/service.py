from typing import Optional, Dict, List, Tuple
from pathlib import Path
import os
import numpy as np

# Torch is optional for YOLO-cls but needed for TorchScript/nn.Module
_TORCH_ERROR: Optional[str] = None
try:
    import torch
    from torchvision import transforms as T
except Exception as _e:
    torch = None
    T = None
    _TORCH_ERROR = str(_e)

from modules.product_recognition.model_loader import (
    load_yolo_model, load_torchscript, load_torch_module
)
from modules.product_recognition.utils import crop_with_detector
from utils.file_utils import read_json, read_lines
from utils.image_utils import pil_from_bgr
from core.config import settings

# --------- Global states ---------
_detection_model = None
_cls_model = None
_cls_backend: Optional[str] = None  # "yolo-cls" | "torchscript" | "torch-module"
_model_names = None
_cls_labels: Optional[List[str]] = None

_catalog_by_ref: Dict[str, Dict] = {}
_ref_by_class: Dict[str, str] = {}

def _load_catalog():
    global _catalog_by_ref
    payload = read_json(settings.PRODUCT_METADATA_PATH)
    items = payload.get("items", payload) if isinstance(payload, dict) else payload
    _catalog_by_ref = {}
    for raw in items:
        ref = str(raw.get("reference_id") or raw.get("id") or "").strip()
        if not ref:
            continue
        _catalog_by_ref[ref] = {
            "referenceId": ref,
            "name": raw.get("name", ""),
            "category": raw.get("category", ""),
            "subCategory": raw.get("subCategory", ""),
            "unit": raw.get("unit", ""),
            "stock": raw.get("stock", 0),
            "price": raw.get("price", 0),
            "discount": raw.get("discount", 0),
            "description": raw.get("description", ""),
            "image": raw.get("image", []),
            "reference_image": raw.get("reference_image", []),
            "tags": raw.get("tags", []),
        }
    print(f"[catalog] Loaded {len(_catalog_by_ref)} items")

def _load_class_map():
    global _ref_by_class
    _ref_by_class = {}
    path = settings.PRODUCT_CLASS_MAP_PATH
    if not path:
        print("[mapping] No class_to_reference.json; assume class == reference_id")
        return
    p = Path(path)
    if not p.exists():
        print("[mapping] Not found:", p)
        return
    data = read_json(str(p))
    if isinstance(data, dict):
        _ref_by_class = {str(k): str(v) for k, v in data.items() if k is not None and v is not None}
        print(f"[mapping] class→reference loaded: {len(_ref_by_class)} entries")

def _init_detection():
    global _detection_model
    path = settings.PRODUCT_DET_MODEL
    if not path:
        print("[detector] Not configured; classify full image")
        return
    try:
        _detection_model = load_yolo_model(path)
        print(f"[detector] loaded: {path}")
    except Exception as exc:
        print("[detector] failed:", exc)
        _detection_model = None

def _load_labels_if_needed():
    """
    Cho phép PRODUCT_LABELS_PATH trỏ tới:
      - 1 file duy nhất (classes.txt)
      - hoặc 1 thư mục chứa nhiều file .txt trong các subdir (labels/)
    """
    global _cls_labels
    if _cls_labels is not None or not settings.PRODUCT_LABELS_PATH:
        return

    p = Path(settings.PRODUCT_LABELS_PATH)
    all_labels = []

    if not p.exists():
        print(f"[labels] Path not found: {p}")
        return

    try:
        if p.is_dir():
            # Duyệt toàn bộ file .txt bên trong thư mục labels/
            for txt_file in p.rglob("*.txt"):
                if txt_file.name.lower().startswith("classes"):  # chỉ lấy file classes.txt
                    with open(txt_file, "r", encoding="utf-8") as f:
                        for line in f:
                            label = line.strip()
                            if label and label not in all_labels:
                                all_labels.append(label)
            print(f"[labels] Loaded {len(all_labels)} unique labels from folder {p}")
        else:
            # Trường hợp là 1 file duy nhất
            lines = [ln.strip() for ln in p.read_text(encoding="utf-8").splitlines() if ln.strip()]
            all_labels = lines
            print(f"[labels] Loaded {len(all_labels)} labels from file {p}")
    except Exception as exc:
        print("[labels] Read error:", exc)

    _cls_labels = all_labels

def _init_classifier():
    global _cls_model, _cls_backend, _model_names

    # Try YOLO classify first
    try:
        m = load_yolo_model(settings.PRODUCT_CLS_MODEL)
        if getattr(m, "task", None) == "classify":
            _cls_model = m
            _cls_backend = "yolo-cls"
            _model_names = getattr(m, "names", None)
            print(f"[classifier] YOLO-cls loaded: {settings.PRODUCT_CLS_MODEL}")
            return
    except Exception as exc:
        print("[classifier] YOLO load failed, try Torch:", exc)

    # Torch backends
    if torch is None:
        raise RuntimeError(f"Torch unavailable: {_TORCH_ERROR}")

    # TorchScript
    try:
        m = load_torchscript(settings.PRODUCT_CLS_MODEL)
        _cls_model = m
        _cls_backend = "torchscript"
        print(f"[classifier] TorchScript loaded: {settings.PRODUCT_CLS_MODEL}")
        _load_labels_if_needed()
        return
    except Exception as exc:
        print("[classifier] TorchScript failed:", exc)

    # nn.Module
    try:
        m = load_torch_module(settings.PRODUCT_CLS_MODEL)
        _cls_model = m
        _cls_backend = "torch-module"
        print(f"[classifier] torch nn.Module loaded: {settings.PRODUCT_CLS_MODEL}")
        _load_labels_if_needed()
    except Exception as exc:
        raise RuntimeError(f"Cannot load classifier: {exc}")

def product_bootstrap():
    _load_catalog()
    _load_class_map()
    _init_detection()
    _init_classifier()
    print("[product] module ready")

def _classify(image_bgr: np.ndarray) -> Tuple[Optional[str], float]:
    if _cls_backend is None or _cls_model is None:
        return None, 0.0

    if _cls_backend == "yolo-cls":
        try:
            res = _cls_model(image_bgr, verbose=False)
            if not res:
                return None, 0.0
            r = res[0]
            if getattr(r, "probs", None) is None:
                return None, 0.0
            idx = int(r.probs.top1)
            conf = float(r.probs.top1conf)
            name = _model_names.get(idx, str(idx)) if _model_names else str(idx)
            return name, conf
        except Exception as exc:
            print("[classifier] YOLO-cls inference failed:", exc)
            return None, 0.0

    # Torch backends
    try:
        if torch is None or T is None:
            return None, 0.0
        pil = pil_from_bgr(image_bgr)
        tfm = T.Compose([
            T.Resize(256, interpolation=T.InterpolationMode.BICUBIC),
            T.CenterCrop(224),
            T.ToTensor(),
            T.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
        ])
        x = tfm(pil).unsqueeze(0)
        with torch.no_grad():
            logits = _cls_model(x)
            if isinstance(logits, (list, tuple)):
                logits = logits[0]
            if isinstance(logits, dict) and "logits" in logits:
                logits = logits["logits"]
            probs = torch.softmax(logits, dim=-1)
            conf, idx = torch.max(probs, dim=-1)
            idx = int(idx.item())
            conf = float(conf.item())
            if _cls_labels and 0 <= idx < len(_cls_labels):
                name = _cls_labels[idx]
            else:
                name = str(idx)
            return name, conf
    except Exception as exc:
        print("[classifier] Torch inference failed:", exc)
        return None, 0.0

def _class_to_reference_id(cls_name: str) -> Optional[str]:
    if cls_name in _ref_by_class:
        return _ref_by_class[cls_name]
    if cls_name in _catalog_by_ref:
        return cls_name
    return None

def recognize(image_bgr: np.ndarray) -> Dict:
    roi = crop_with_detector(
        _detection_model, image_bgr, settings.PRODUCT_DETECTION_CONF, settings.PRODUCT_DETECTION_IOU
    )
    cls_name, conf = _classify(roi)
    if not cls_name:
        return {"success": False, "detected": False, "message": "Không phân loại được sản phẩm", "confidence": 0.0}

    if conf < settings.PRODUCT_RECOGNITION_THRESHOLD:
        return {"success": False, "detected": False, "message": f"Độ tin cậy thấp ({conf:.3f})", "confidence": conf, "class": cls_name}

    ref_id = _class_to_reference_id(cls_name)
    if not ref_id:
        return {"success": False, "detected": False, "message": f"Không ánh xạ được class '{cls_name}'", "confidence": conf, "class": cls_name}

    meta = _catalog_by_ref.get(ref_id)
    if not meta:
        return {"success": False, "detected": False, "message": f"Không tìm thấy metadata cho '{ref_id}'", "confidence": conf, "class": cls_name}

    payload = dict(meta)
    payload["predictedClass"] = cls_name
    payload["confidence"] = conf
    return {"success": True, "detected": True, "message": "Product recognized", "product": payload, "confidence": conf}
