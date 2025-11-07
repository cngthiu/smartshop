from typing import Optional, Tuple
import numpy as np

_YOLO_ERROR: Optional[str] = None
try:
    from ultralytics import YOLO
except Exception as _e:
    YOLO = None
    _YOLO_ERROR = str(_e)

def crop_with_detector(detector, image: np.ndarray, conf: float, iou: float) -> np.ndarray:
    if detector is None:
        return image
    try:
        results = detector.predict(image, conf=conf, iou=iou, verbose=False)
    except Exception as exc:
        print("[detector] inference failed:", exc)
        return image
    if not results:
        return image
    boxes = getattr(results[0], "boxes", None)
    if boxes is None or boxes.data is None or len(boxes.data) == 0:
        return image
    best_idx = int(np.argmax(boxes.conf.cpu().numpy()))
    x1, y1, x2, y2 = map(int, boxes.xyxy[best_idx].cpu().numpy())
    h, w = image.shape[:2]
    x1, y1 = max(0, x1), max(0, y1)
    x2, y2 = min(w, x2), min(h, y2)
    if x2 <= x1 or y2 <= y1:
        return image
    return image[y1:y2, x1:x2]
