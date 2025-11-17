from __future__ import annotations

import json
from pathlib import Path

from core.config import settings
from .schemas import MealAssistantRequest, MealAssistantResponse, MealAssistantFeedback, MealAssistantSuggestion, MealAssistantProduct
from .nlu import interpret
from .retrieval import retrieve_candidates
from .rerank import rerank
from .generator import call_gemini, build_structured_block


def _build_products(recipe: dict) -> list[MealAssistantProduct]:
    products = []
    for ing in recipe.get("ingredients", []):
        products.append(
            MealAssistantProduct(
                referenceId=ing.get("reference_id"),
                name=ing.get("name"),
                reason="Nguyên liệu bắt buộc",
                quantity=ing.get("quantity"),
            )
        )
    return products


def suggest(body: MealAssistantRequest) -> MealAssistantResponse:
    nlu = interpret(body.query, body.servings, body.budget, body.diet_tags, body.allergies)
    candidates = retrieve_candidates(nlu, body.available_products)
    ranked = rerank(candidates, nlu.budget)
    suggestions = [
        MealAssistantSuggestion(
            dishId=item.get("id"),
            dishName=item.get("name", ""),
            description=item.get("description"),
            prepTime=item.get("prep_time"),
            estimatedBudget=item.get("budget"),
            products=_build_products(item),
            score=item.get("score", 0.0),
        )
        for item in ranked
    ]
    language = body.language or settings.MEAL_PROMPT_LANGUAGE
    temperature = body.temperature if body.temperature is not None else settings.MEAL_TEMPERATURE
    llm_response = None
    llm_error = None
    if ranked:
        try:
            llm_response = call_gemini(ranked, body.query, language, temperature)
        except Exception as exc:
            llm_error = str(exc)

    return MealAssistantResponse(
        suggestions=suggestions,
        llmResponse=llm_response or build_structured_block(ranked),
        prompt="Structured meal summary" if llm_response else build_structured_block(ranked),
        nlu={
            "intent": nlu.intent,
            "servings": str(nlu.servings) if nlu.servings else None,
            "diet_tags": ", ".join(nlu.diet_tags) if nlu.diet_tags else None,
            "budget": str(nlu.budget) if nlu.budget else None,
        },
        retrievalDebug={
            "candidates": [
                {"id": item.get("id"), "score": item.get("semantic_score"), "inventory": item.get("inventory")}
                for item in candidates
            ]
        },
        error=llm_error,
    )


def log_feedback(feedback: MealAssistantFeedback) -> dict:
    path = Path(settings.MEAL_FEEDBACK_PATH)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.open("a", encoding="utf-8").write(json.dumps(feedback.dict(), ensure_ascii=False) + "\n")
    return {"success": True}
