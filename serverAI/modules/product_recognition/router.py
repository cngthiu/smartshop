from fastapi import APIRouter
from pydantic import BaseModel

from utils.image_utils import decode_image_b64
from modules.product_recognition.service import recognize

router = APIRouter()

class ProductRecognizeBody(BaseModel):
    image_b64: str
    mime: str = "image/jpeg"

@router.post("/product/recognize")
def recognize_product(body: ProductRecognizeBody):
    image = decode_image_b64(body.image_b64)
    if image is None:
        return {"success": False, "detected": False, "message": "Invalid image payload"}
    return recognize(image)
