#serverAI/core/config.py
from pydantic_settings import BaseSettings
from typing import Optional, Dict

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

    # Meal assistant powered by Gemini + retrieval
    MEAL_RECIPES_PATH: str = "serverAI/data/recipes.json"
    MEAL_INDEX_PATH: str = "serverAI/data/vector/meal_index.faiss"
    MEAL_METADATA_PATH: str = "serverAI/data/vector/meal_index_meta.json"
    MEAL_FEEDBACK_PATH: str = "serverAI/data/logs/meal_feedback.jsonl"
    MEAL_EMBEDDING_MODEL: str = "sentence-transformers/all-MiniLM-L6-v2"
    MEAL_TOP_K: int = 50
    MEAL_RETURN: int = 3
    MEAL_MIN_SIMILARITY: float = 0.15
    MEAL_RERANK_WEIGHTS: Dict[str, float] = {
        "semantic": 0.4,
        "preference": 0.25,
        "popularity": 0.2,
        "freshness": 0.1,
        "promo": 0.05,
    }
    GEMINI_API_KEY: Optional[str] = None
    GEMINI_MODEL: str = "gemini-2.5-flash"
    GEMINI_API_BASE: str = "https://generativelanguage.googleapis.com/v1beta"
    MEAL_PROMPT_LANGUAGE: str = "vi"
    MEAL_TEMPERATURE: float = 0.6

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
