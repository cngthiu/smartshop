from fastapi import APIRouter
from pydantic import BaseModel
from typing import List
import numpy as np

from modules.face_auth.service import face_encode
from utils.image_utils import decode_image_b64

router = APIRouter()

class EncodeBody(BaseModel):
    image_b64: str
    mime: str = "image/jpeg"

@router.post("/encode")
def encode(body: EncodeBody):
    img = decode_image_b64(body.image_b64)
    if img is None:
        return {
            "embedding": [],
            "modelVersion": "arcface_r100_onnx_v1",
            "quality": 0.0,
            "faces_count": 0,
        }

    faces = face_encode(img)
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
