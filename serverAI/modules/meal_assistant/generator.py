from __future__ import annotations

from functools import lru_cache

import google.generativeai as genai

from core.config import settings


_PROMPT = """
Bạn là trợ lý ẩm thực của SmartShop. Hãy dựa trên dữ liệu có cấu trúc dưới đây để trả lời dạng hội thoại.
Thông tin món ăn:
{structured}

Yêu cầu khách hàng: {query}

Trả lời bằng tiếng {language} với giọng thân thiện, liệt kê tối đa {count} món.
Đồng thời nhắc sản phẩm nên mua và câu hỏi kết thúc mở để khách phản hồi.
""".strip()


def build_structured_block(recipes: list[dict]) -> str:
    lines = []
    for idx, recipe in enumerate(recipes, start=1):
        lines.append(
            f"{idx}. {recipe['name']} (score {recipe.get('score',0):.2f})\n"
            f"   - Mô tả: {recipe.get('description','')}\n"
            f"   - Thời gian: {recipe.get('prep_time','?')} phút\n"
            f"   - Nguyên liệu: "
            + ", ".join(f"{ing.get('name')}[{ing.get('reference_id')}]" for ing in recipe.get('ingredients', []))
        )
    return "\n".join(lines)


@lru_cache(maxsize=1)
def _get_gemini_model():
    api_key = settings.GEMINI_API_KEY
    if not api_key:
        return None
    genai.configure(api_key=api_key)
    return genai.GenerativeModel(settings.GEMINI_MODEL)


def call_gemini(recipes: list[dict], query: str, language: str, temperature: float) -> str:
    model = _get_gemini_model()
    if model is None:
        return "(Chưa cấu hình GEMINI_API_KEY nên trả về gợi ý dạng JSON)"

    structured = build_structured_block(recipes)
    prompt = _PROMPT.format(
        structured=structured,
        query=query,
        language=language,
        count=len(recipes),
    )

    resp = model.generate_content(
        prompt,
        generation_config={
            "temperature": temperature,
            "max_output_tokens": 512,
        },
    )
    text = getattr(resp, "text", None)
    if text:
        return text.strip()
    return "Gemini không trả nội dung"
