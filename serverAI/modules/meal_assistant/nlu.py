from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import List, Optional


DIET_KEYWORDS = {
    "healthy": ["healthy", "eat clean", "nhẹ nhàng"],
    "vegan": ["thuần chay", "vegan"],
    "vegetarian": ["ăn chay", "vegetarian"],
    "high-protein": ["giàu đạm", "high protein"],
}

INTENT_KEYWORDS = {
    "suggest": ["gợi ý", "ăn gì", "suggest"],
    "search": ["tìm", "kiếm"],
    "add_to_cart": ["thêm giỏ", "đặt"],
}


@dataclass
class NLUResult:
    intent: str = "suggest"
    ingredients: List[str] = field(default_factory=list)
    servings: Optional[int] = None
    diet_tags: List[str] = field(default_factory=list)
    allergies: List[str] = field(default_factory=list)
    budget: Optional[float] = None


def interpret(query: str, explicit_servings: Optional[int], explicit_budget: Optional[float], diet_tags: List[str], allergies: List[str]) -> NLUResult:
    q = query.lower()
    intent = "suggest"
    for label, kws in INTENT_KEYWORDS.items():
        if any(kw in q for kw in kws):
            intent = label
            break

    servings = explicit_servings
    if servings is None:
        match = re.search(r"(\d+)\s*(người|khẩu|phần)", q)
        if match:
            servings = int(match.group(1))

    budget = explicit_budget
    if budget is None:
        match = re.search(r"(\d+[.,]?\d*)\s*(k|nghìn|ngan|triệu|vnd|đ)", q)
        if match:
            value = float(match.group(1).replace(",", "."))
            unit = match.group(2)
            if unit in {"k", "nghìn", "ngan"}:
                budget = value * 1000
            elif unit == "triệu":
                budget = value * 1_000_000
            else:
                budget = value

    detected_diets = set(diet_tags)
    for label, kws in DIET_KEYWORDS.items():
        if any(kw in q for kw in kws):
            detected_diets.add(label)

    ingredients = re.findall(r"\b([a-zA-ZÀ-ỹ0-9-]+)\b", q)

    return NLUResult(
        intent=intent,
        ingredients=[w for w in ingredients if len(w) > 3],
        servings=servings,
        diet_tags=list(detected_diets),
        allergies=allergies,
        budget=budget,
    )
