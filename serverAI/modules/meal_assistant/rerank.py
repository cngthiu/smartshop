from __future__ import annotations

from typing import Dict, List

from core.config import settings


def calculate_score(recipe: Dict, nlu_budget: float | None) -> float:
    weights = settings.MEAL_RERANK_WEIGHTS
    semantic = recipe.get("semantic_score", 0.0)
    preference = recipe.get("inventory", 0.0)
    popularity = recipe.get("popularity", 0.5)
    freshness = recipe.get("freshness", 0.5)
    promo = 1.0 if recipe.get("promo") else 0.0
    if nlu_budget and recipe.get("budget"):
        diff = max(nlu_budget - recipe["budget"], 0)
        preference += min(diff / (nlu_budget + 1e-6), 0.4)
    score = (
        weights.get("semantic", 0.4) * semantic
        + weights.get("preference", 0.25) * preference
        + weights.get("popularity", 0.2) * popularity
        + weights.get("freshness", 0.1) * freshness
        + weights.get("promo", 0.05) * promo
    )
    return float(min(score, 1.0))


def rerank(recipes: List[Dict], nlu_budget: float | None) -> List[Dict]:
    for recipe in recipes:
        recipe["score"] = calculate_score(recipe, nlu_budget)
    recipes.sort(key=lambda r: r.get("score", 0.0), reverse=True)
    return recipes[: settings.MEAL_RETURN]
