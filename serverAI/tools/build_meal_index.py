"""Utility to preprocess recipes and build FAISS index for meal assistant."""
from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import List

import faiss
import numpy as np
from sentence_transformers import SentenceTransformer

from serverAI.core.config import settings
from serverAI.utils.file_utils import read_json


def normalize_text(text: str) -> str:
    return " ".join(text.strip().lower().split())


def build_corpus(recipes: List[dict]) -> List[str]:
    corpus = []
    for recipe in recipes:
        ingredients = ", ".join(i.get("name", "") for i in recipe.get("ingredients", []))
        tags = ", ".join(recipe.get("tags", []))
        desc = recipe.get("description", "")
        text = f"{recipe.get('name','')} {tags} {ingredients} {desc}"
        corpus.append(normalize_text(text))
    return corpus


def load_recipes() -> List[dict]:
    payload = read_json(settings.MEAL_RECIPES_PATH)
    if isinstance(payload, dict):
        return payload.get("recipes", [])
    return payload


def save_metadata(recipes: List[dict]) -> None:
    meta_path = Path(settings.MEAL_METADATA_PATH)
    meta_path.parent.mkdir(parents=True, exist_ok=True)
    meta = {
        "embedding_model": settings.MEAL_EMBEDDING_MODEL,
        "recipes": recipes,
    }
    meta_path.write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")


def build_index() -> None:
    recipes = load_recipes()
    if not recipes:
        raise RuntimeError("No recipes found; please populate data/recipes.json")
    corpus = build_corpus(recipes)
    model = SentenceTransformer(settings.MEAL_EMBEDDING_MODEL)
    embeddings = model.encode(corpus, normalize_embeddings=True)
    vectors = np.asarray(embeddings, dtype=np.float32)
    dim = vectors.shape[1]
    index = faiss.IndexFlatIP(dim)
    index.add(vectors)
    index_path = Path(settings.MEAL_INDEX_PATH)
    index_path.parent.mkdir(parents=True, exist_ok=True)
    faiss.write_index(index, str(index_path))
    save_metadata(recipes)
    print(f"[meal-index] Built index for {len(recipes)} recipes -> {index_path}")


def main():
    parser = argparse.ArgumentParser(description="Build meal assistant FAISS index")
    parser.parse_args()
    build_index()


if __name__ == "__main__":
    main()
