from __future__ import annotations

from typing import Dict, List

from core.config import settings
from .index_loader import load_metadata, search
from .nlu import NLUResult


def _match_diet(recipe: Dict, diets: List[str]) -> bool:
    if not diets:
        return True
    recipe_diets = set(recipe.get("diet", []))
    return bool(recipe_diets.intersection(diets))


def _contains_allergens(recipe: Dict, allergies: List[str]) -> bool:
    if not allergies:
        return False
    recipe_allergens = " ".join(recipe.get("allergens", [])).lower()
    return any(a.lower() in recipe_allergens for a in allergies)


def _inventory_coverage(recipe: Dict, available_refs: List[str]) -> float:
    if not recipe.get("ingredients"):
        return 0.0
    have = sum(1 for ing in recipe["ingredients"] if ing.get("reference_id") in available_refs)
    return have / len(recipe["ingredients"])


def retrieve_candidates(nlu: NLUResult, available_refs: List[str]) -> List[Dict]:
    meta = load_metadata()
    recipes = meta.get("recipes", [])
    pairs = search(" ".join(nlu.ingredients) or nlu.intent, settings.MEAL_TOP_K)
    results = []
    for idx, score in pairs:
        if idx < 0 or idx >= len(recipes):
            continue
        recipe = recipes[idx]
        if score < settings.MEAL_MIN_SIMILARITY:
            continue
        if not _match_diet(recipe, nlu.diet_tags):
            continue
        if _contains_allergens(recipe, nlu.allergies):
            continue
        recipe_copy = dict(recipe)
        recipe_copy["semantic_score"] = score
        recipe_copy["inventory"] = _inventory_coverage(recipe, available_refs)
        results.append(recipe_copy)
    return results
