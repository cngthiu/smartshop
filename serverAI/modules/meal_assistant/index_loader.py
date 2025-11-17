from __future__ import annotations

import json
from pathlib import Path
from typing import List, Tuple

import faiss
import numpy as np
from sentence_transformers import SentenceTransformer

from core.config import settings

_index = None
_metadata = None
_embedder = None


def load_metadata():
    global _metadata
    if _metadata is None:
        path = Path(settings.MEAL_METADATA_PATH)
        if not path.exists():
            raise FileNotFoundError(f"Metadata not found: {path}. Hãy chạy tools/build_meal_index.py")
        _metadata = json.loads(path.read_text(encoding="utf-8"))
    return _metadata


def get_embedder() -> SentenceTransformer:
    global _embedder
    if _embedder is None:
        _embedder = SentenceTransformer(settings.MEAL_EMBEDDING_MODEL)
    return _embedder


def load_index() -> faiss.Index:
    global _index
    if _index is None:
        path = Path(settings.MEAL_INDEX_PATH)
        if not path.exists():
            raise FileNotFoundError(f"FAISS index not found: {path}. Hãy chạy tools/build_meal_index.py")
        _index = faiss.read_index(str(path))
    return _index


def search(query: str, top_k: int) -> List[Tuple[int, float]]:
    model = get_embedder()
    index = load_index()
    vector = model.encode([query], normalize_embeddings=True)
    sims, idxs = index.search(np.array(vector, dtype=np.float32), top_k)
    pairs = []
    for score, idx in zip(sims[0], idxs[0]):
        pairs.append((int(idx), float(score)))
    return pairs
