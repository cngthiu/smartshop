import base64
import cv2
import numpy as np
from typing import Optional
from PIL import Image

def decode_image_b64(image_b64: str) -> Optional[np.ndarray]:
    try:
        img_bytes = base64.b64decode(image_b64)
        img_array = np.frombuffer(img_bytes, dtype=np.uint8)
        return cv2.imdecode(img_array, cv2.IMREAD_COLOR)
    except Exception:
        return None

def pil_from_bgr(img: np.ndarray) -> Image.Image:
    rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    return Image.fromarray(rgb)
