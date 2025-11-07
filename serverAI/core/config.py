#serverAI/core/config.py
from pydantic import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    # App
    APP_NAME: str = "Vision Service"
    APP_VERSION: str = "2.0"
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    # Product recognition
    PRODUCT_CLS_MODEL: str = "serverAI/data/models/best.pt"
    PRODUCT_DET_MODEL: Optional[str] = "serverAI/data/models/yolov8n.pt"
    PRODUCT_METADATA_PATH: str = "serverAI/data/product_catalog.json"
    PRODUCT_CLASS_MAP_PATH: Optional[str] = "serverAI/data/class_to_reference.json"
    PRODUCT_LABELS_PATH: Optional[str] = None
    PRODUCT_RECOGNITION_THRESHOLD: float = 0.28
    PRODUCT_DETECTION_CONF: float = 0.25
    PRODUCT_DETECTION_IOU: float = 0.5

    # Face auth
    FACE_MODEL_NAME: str = "buffalo_l"
    FACE_DET_SIZE: str = "640,640"  # "w,h"
    FACE_CTX_ID: int = 0

    # Logging
    LOG_LEVEL: str = "INFO"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

settings = Settings()
