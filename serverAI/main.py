#serverAI/main.py
from fastapi import FastAPI
from pydantic import BaseModel
import base64
import numpy as np
import cv2
import uvicorn
import insightface
from insightface.app import FaceAnalysis

app = FastAPI(title="FaceAuth Service", version="1.0")

# Load InsightFace model once
face_app = FaceAnalysis(name="buffalo_l")  # gồm det + embedding (ArcFace)
face_app.prepare(ctx_id=0, det_size=(640, 640))

class EncodeBody(BaseModel):
    image_b64: str
    mime: str = "image/jpeg"
@app.post("/api/v1/encode")
def encode(body: EncodeBody):
    try:
        img_bytes = base64.b64decode(body.image_b64)
        img_array = np.frombuffer(img_bytes, dtype=np.uint8)
        img = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
        if img is None:
            return {"embedding": [], "modelVersion": "arcface_r100_onnx_v1", "quality": 0.0, "faces_count": 0}

        faces = face_app.get(img)
        faces_count = len(faces)
        if faces_count != 1:
            # Không trả embedding nếu != 1 mặt
            return {
                "embedding": [],
                "modelVersion": "arcface_r100_onnx_v1",
                "quality": 0.0,
                "faces_count": faces_count
            }

        # Chỉ 1 mặt: lấy mặt đó (hoặc chọn max det_score cũng được)
        best = faces[0]
        emb = best.normed_embedding.tolist()
        quality = float(best.det_score)

        return {
            "embedding": emb,
            "modelVersion": "arcface_r100_onnx_v1",
            "quality": quality,
            "faces_count": faces_count
        }
    except Exception as e:
        return {"embedding": [], "modelVersion": "arcface_r100_onnx_v1", "quality": 0.0, "faces_count": 0, "error": str(e)}
if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
