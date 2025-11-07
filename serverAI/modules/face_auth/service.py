#serverAI/modules/face_auth/service.py
from typing import Optional, Tuple, List
import numpy as np
from insightface.app import FaceAnalysis
from core.config import settings

_face_app: Optional[FaceAnalysis] = None

def _parse_det_size(s: str) -> Tuple[int, int]:
    try:
        w, h = s.split(",")
        return int(w), int(h)
    except Exception:
        return (640, 640)

def face_bootstrap():
    global _face_app
    if _face_app is not None:
        return
    det_w, det_h = _parse_det_size(settings.FACE_DET_SIZE)
    app = FaceAnalysis(name=settings.FACE_MODEL_NAME)
    app.prepare(ctx_id=settings.FACE_CTX_ID, det_size=(det_w, det_h))
    _face_app = app
    print("[face-auth] InsightFace ready:", settings.FACE_MODEL_NAME)

def face_encode(bgr_image: np.ndarray):
    if _face_app is None:
        raise RuntimeError("Face service not initialized")
    faces = _face_app.get(bgr_image)
    return faces  # list of Face objects (InsightFace)
