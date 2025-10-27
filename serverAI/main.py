# serverAI/main.py
import base64
import json
import os
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import cv2
import numpy as np
import uvicorn
from fastapi import FastAPI
from insightface.app import FaceAnalysis
from pydantic import BaseModel

try:
    import torch

    _TORCH_ERROR: Optional[str] = None
except Exception as torch_exc:  # pragma: no cover - depends on deploy env
    torch = None
    _TORCH_ERROR = str(torch_exc)

try:
    import open_clip

    _CLIP_ERROR: Optional[str] = None
except Exception as clip_exc:  # pragma: no cover
    open_clip = None
    _CLIP_ERROR = str(clip_exc)

try:
    from ultralytics import YOLO

    _YOLO_ERROR: Optional[str] = None
except Exception as yolo_exc:  # pragma: no cover
    YOLO = None
    _YOLO_ERROR = str(yolo_exc)

from PIL import Image

APP_DIR = Path(__file__).resolve().parent
CATALOG_PATH = APP_DIR / "data" / "product_catalog.json"
REFERENCE_DIR = APP_DIR / "data" / "reference_images"

SIMILARITY_THRESHOLD = float(os.getenv("PRODUCT_RECOGNITION_THRESHOLD", "0.28"))
CLIP_DEVICE = os.getenv("PRODUCT_RECOGNITION_DEVICE", "cpu")
CLIP_MODEL_NAME = os.getenv("PRODUCT_RECOGNITION_MODEL", "ViT-B-32")
CLIP_PRETRAINED = os.getenv("PRODUCT_RECOGNITION_PRETRAINED", "openai")
CLIP_CHECKPOINT = os.getenv("PRODUCT_RECOGNITION_CHECKPOINT")

DETECTION_MODEL_PATH_ENV = os.getenv("PRODUCT_DETECTION_MODEL")
DEFAULT_DETECTION_MODEL_PATH = APP_DIR / "data" / "models" / "yolov8n.pt"
DETECTION_CONF = float(os.getenv("PRODUCT_DETECTION_CONF", "0.25"))
DETECTION_IOU = float(os.getenv("PRODUCT_DETECTION_IOU", "0.5"))

app = FastAPI(title="Vision Service", version="1.1")

face_app = FaceAnalysis(name="buffalo_l")
face_app.prepare(ctx_id=0, det_size=(640, 640))


class EncodeBody(BaseModel):
    image_b64: str
    mime: str = "image/jpeg"


class ProductRecognizeBody(BaseModel):
    image_b64: str
    mime: str = "image/jpeg"


class _ReferenceItem(Dict[str, object]):
    pass


_clip_model = None
_clip_preprocess = None
_clip_init_error: Optional[str] = None

_reference_embeddings: Optional[np.ndarray] = None
_reference_items: List[_ReferenceItem] = []

_detection_model = None
_detection_init_error: Optional[str] = None


def _ensure_clip_model() -> bool:
    global _clip_model, _clip_preprocess, _clip_init_error

    if _clip_model is not None:
        return True

    if _clip_init_error is not None:
        return False

    if open_clip is None or torch is None:
        _clip_init_error = _CLIP_ERROR or _TORCH_ERROR or "open_clip / torch not available"
        print("[product-recognition] Missing dependencies:", _clip_init_error)
        return False

    try:
        if CLIP_CHECKPOINT and Path(CLIP_CHECKPOINT).exists():
            model, preprocess, _ = open_clip.create_model_from_pretrained(
                model_name=CLIP_MODEL_NAME,
                pretrained=CLIP_CHECKPOINT,
                device=CLIP_DEVICE,
            )
        else:
            model, _, preprocess = open_clip.create_model_and_transforms(
                model_name=CLIP_MODEL_NAME,
                pretrained=CLIP_PRETRAINED,
            )
            model = model.to(CLIP_DEVICE)

        model.eval()
        _clip_model = model
        _clip_preprocess = preprocess
        print(
            f"[product-recognition] CLIP model ready ({CLIP_MODEL_NAME}, device={CLIP_DEVICE})"
        )
        return True
    except Exception as exc:  # pragma: no cover - depends on env config
        _clip_init_error = str(exc)
        print("[product-recognition] Failed to init CLIP:", exc)
        return False


def _init_detection_model() -> None:
    global _detection_model, _detection_init_error

    if YOLO is None:
        _detection_init_error = _YOLO_ERROR or "ultralytics not available"
        print("[product-detection] YOLO import failed:", _detection_init_error)
        return

    model_path = (
        Path(DETECTION_MODEL_PATH_ENV)
        if DETECTION_MODEL_PATH_ENV
        else DEFAULT_DETECTION_MODEL_PATH
    )

    if not model_path.exists():
        _detection_init_error = f"detector not found at {model_path}"
        print("[product-detection]", _detection_init_error)
        return

    try:
        _detection_model = YOLO(str(model_path))
        print(f"[product-detection] Loaded model {model_path}")
    except Exception as exc:  # pragma: no cover
        _detection_init_error = str(exc)
        print("[product-detection] Failed to load detector:", exc)


def _load_catalog() -> List[_ReferenceItem]:
    if not CATALOG_PATH.exists():
        print(f"[catalog] Missing file {CATALOG_PATH}")
        return []

    try:
        payload = json.loads(CATALOG_PATH.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        print(f"[catalog] Invalid JSON ({CATALOG_PATH}): {exc}")
        return []

    items_raw = payload.get("items", [])
    items: List[_ReferenceItem] = []

    for raw in items_raw:
        reference_id = str(raw.get("reference_id") or raw.get("id") or "").strip()
        ref_image_name = raw.get("reference_image")
        if not reference_id or not ref_image_name:
            print(
                f"[catalog] Skipping entry without reference_id/reference_image: {raw}"
            )
            continue

        ref_image_name = (
            ref_image_name[0]
            if isinstance(ref_image_name, list)
            else ref_image_name
        )

        if not isinstance(ref_image_name, str) or not ref_image_name.strip():
            print(
                f"[catalog] Invalid reference_image for {reference_id}: {ref_image_name}"
            )
            continue

        ref_path = (
            Path(ref_image_name)
            if Path(ref_image_name).is_absolute()
            else REFERENCE_DIR / ref_image_name
        )

        item: _ReferenceItem = {
            "referenceId": reference_id,
            "reference_image_path": str(ref_path),
            "name": raw.get("name", ""),
            "category": raw.get("category", ""),
            "subCategory": raw.get("subCategory", ""),
            "unit": raw.get("unit", ""),
            "stock": raw.get("stock", 0),
            "price": raw.get("price", 0),
            "discount": raw.get("discount", 0),
            "description": raw.get("description", ""),
            "more_details": raw.get("more_details", {}),
            "image": raw.get("image", []),
            "tags": raw.get("tags", []),
        }
        items.append(item)

    print(f"[catalog] Loaded {len(items)} reference items")
    return items


def _image_to_embedding(image: Image.Image) -> Optional[np.ndarray]:
    if not _ensure_clip_model():
        return None

    assert _clip_model is not None and _clip_preprocess is not None

    with torch.no_grad():
        image_tensor = _clip_preprocess(image).unsqueeze(0).to(CLIP_DEVICE)
        features = _clip_model.encode_image(image_tensor)
        features = features / features.norm(dim=-1, keepdim=True)
    return features[0].detach().cpu().numpy().astype(np.float32)


def _prepare_reference_embeddings(items: List[_ReferenceItem]) -> None:
    global _reference_embeddings, _reference_items

    if not items:
        _reference_embeddings = np.zeros((0, 512), dtype=np.float32)
        _reference_items = []
        return

    embeddings: List[np.ndarray] = []
    kept_items: List[_ReferenceItem] = []

    for item in items:
        ref_path = Path(item["reference_image_path"])
        if not ref_path.exists():
            print(f"[catalog] Reference image missing: {ref_path}")
            continue

        try:
            pil_image = Image.open(ref_path).convert("RGB")
        except Exception as exc:
            print(f"[catalog] Failed to read {ref_path}: {exc}")
            continue

        embedding = _image_to_embedding(pil_image)
        if embedding is None:
            print(f"[catalog] Embedding unavailable for {ref_path}")
            continue

        embeddings.append(embedding)
        kept_items.append(item)

    if embeddings:
        _reference_embeddings = np.stack(embeddings).astype(np.float32)
        _reference_items = kept_items
        print(f"[catalog] Prepared {len(_reference_items)} embeddings")
    else:
        _reference_embeddings = np.zeros((0, 512), dtype=np.float32)
        _reference_items = []
        print("[catalog] No embeddings prepared")


def _decode_image(image_b64: str) -> Optional[np.ndarray]:
    try:
        img_bytes = base64.b64decode(image_b64)
    except Exception:
        return None

    img_array = np.frombuffer(img_bytes, dtype=np.uint8)
    image = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
    return image


def _crop_with_detector(image: np.ndarray) -> np.ndarray:
    if _detection_model is None:
        return image

    try:
        results = _detection_model.predict(
            image,
            conf=DETECTION_CONF,
            iou=DETECTION_IOU,
            verbose=False,
        )
    except Exception as exc:  # pragma: no cover
        print("[product-detection] inference failed:", exc)
        return image

    if not results:
        return image

    # YOLOv8 returns boxes.xyxy as tensor on device
    boxes = getattr(results[0], "boxes", None)
    if boxes is None or boxes.numel() == 0:
        return image

    confs = boxes.conf.cpu().numpy()
    best_idx = int(np.argmax(confs))
    xyxy = boxes.xyxy[best_idx].cpu().numpy()
    x1, y1, x2, y2 = [int(max(0, coord)) for coord in xyxy]
    x2 = min(x2, image.shape[1])
    y2 = min(y2, image.shape[0])

    if x2 <= x1 or y2 <= y1:
        return image
    return image[y1:y2, x1:x2]


def _recognize_product(image: np.ndarray) -> Tuple[bool, Dict]:
    if _reference_embeddings is None or _reference_embeddings.shape[0] == 0:
        return False, {
            "message": "No reference embeddings available. Populate data/product_catalog.json and reference images.",
        }

    if not _ensure_clip_model():
        return False, {"message": _clip_init_error or "Vision model unavailable"}

    roi = _crop_with_detector(image)
    rgb = cv2.cvtColor(roi, cv2.COLOR_BGR2RGB)
    pil_image = Image.fromarray(rgb)

    embedding = _image_to_embedding(pil_image)
    if embedding is None:
        return False, {"message": "Failed to compute embedding"}

    similarities = _reference_embeddings @ embedding
    best_idx = int(np.argmax(similarities))
    best_score = float(similarities[best_idx])

    if best_score < SIMILARITY_THRESHOLD:
        return False, {
            "message": "No product matched the reference set",
            "confidence": best_score,
        }

    product_meta = dict(_reference_items[best_idx])
    product_meta.pop("reference_image_path", None)
    product_meta["confidence"] = best_score
    return True, {"product": product_meta, "confidence": best_score}


@app.post("/api/v1/encode")
def encode(body: EncodeBody):
    try:
        img_bytes = base64.b64decode(body.image_b64)
        img_array = np.frombuffer(img_bytes, dtype=np.uint8)
        img = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
        if img is None:
            return {
                "embedding": [],
                "modelVersion": "arcface_r100_onnx_v1",
                "quality": 0.0,
                "faces_count": 0,
            }

        faces = face_app.get(img)
        faces_count = len(faces)
        if faces_count != 1:
            return {
                "embedding": [],
                "modelVersion": "arcface_r100_onnx_v1",
                "quality": 0.0,
                "faces_count": faces_count,
            }

        best = faces[0]
        emb = best.normed_embedding.tolist()
        quality = float(best.det_score)

        return {
            "embedding": emb,
            "modelVersion": "arcface_r100_onnx_v1",
            "quality": quality,
            "faces_count": faces_count,
        }
    except Exception as exc:  # pragma: no cover
        return {
            "embedding": [],
            "modelVersion": "arcface_r100_onnx_v1",
            "quality": 0.0,
            "faces_count": 0,
            "error": str(exc),
        }


@app.post("/api/v1/product/recognize")
def recognize_product(body: ProductRecognizeBody):
    image = _decode_image(body.image_b64)
    if image is None:
        return {
            "success": False,
            "detected": False,
            "message": "Invalid image payload",
        }

    matched, payload = _recognize_product(image)
    if matched:
        product_meta = payload.get("product", {})
        return {
            "success": True,
            "detected": True,
            "message": "Product recognized",
            "product": product_meta,
            "confidence": payload.get("confidence"),
        }

    response = {
        "success": False,
        "detected": False,
    }
    response.update(payload)
    return response


def _bootstrap() -> None:
    catalog_items = _load_catalog()
    if _ensure_clip_model():
        _prepare_reference_embeddings(catalog_items)
    else:
        print(
            "[product-recognition] CLIP unavailable; product recognition endpoint will return error"
        )
    _init_detection_model()


_bootstrap()


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
