from fastapi import APIRouter

from .schemas import MealAssistantRequest, MealAssistantFeedback
from .service import suggest, log_feedback

router = APIRouter()


@router.post("/meal-assistant/suggest")
def meal_assistant_endpoint(body: MealAssistantRequest):
    return suggest(body)


@router.post("/meal-assistant/feedback")
def meal_assistant_feedback(body: MealAssistantFeedback):
    return log_feedback(body)
