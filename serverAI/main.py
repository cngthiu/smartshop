#serverAI/main.py
from fastapi import FastAPI
import uvicorn

from core.config import settings
from core.bootstrap import bootstrap_all

# Routers
from modules.face_auth.router import router as face_router
from modules.product_recognition.router import router as product_router
from modules.meal_assistant.router import router as meal_assistant_router

app = FastAPI(title=settings.APP_NAME, version=settings.APP_VERSION)

# Mount routers
app.include_router(face_router, prefix="/api/v1", tags=["FaceAuth"])
app.include_router(product_router, prefix="/api/v1", tags=["ProductRecognition"])
app.include_router(meal_assistant_router, prefix="/api/v1", tags=["MealAssistant"])

@app.on_event("startup")
def _startup():
    bootstrap_all()

if __name__ == "__main__":
    uvicorn.run(app, host=settings.HOST, port=settings.PORT)
