# Meal Assistant Pipeline

Pipeline 5 bước:
1. **Preprocessing (tools/build_meal_index.py)**
   - Đọc `data/recipes.json` + catalog.
   - Chuẩn hoá tên nguyên liệu, tạo câu mô tả hợp nhất.
   - Encode bằng SentenceTransformer (`MEAL_EMBEDDING_MODEL`).
   - Lưu FAISS index (`MEAL_INDEX_PATH`) và metadata (`MEAL_METADATA_PATH`).
2. **NLU** (`nlu.py`)
   - Phát hiện intent, diet tags, ngân sách, khẩu phần từ câu tự nhiên.
3. **Retrieval + Filtering** (`retrieval.py`)
   - Tìm top-K bằng FAISS (`MEAL_TOP_K`).
   - Loại món chứa allergen, không khớp diet hoặc thiếu nguyên liệu.
4. **Reranking** (`rerank.py`)
   - Score = w_semantic*similarity + w_preference*inventory/budget + w_popularity + w_freshness + w_promo.
   - Trả top-N (`MEAL_RETURN`).
5. **Generation & Feedback** (`service.py`, `generator.py`)
   - Gọi Gemini (nếu có `GEMINI_API_KEY`) để viết câu trả lời hội thoại.
   - Endpoint `/api/v1/meal-assistant/suggest` trả về cấu trúc + text.
   - Endpoint `/api/v1/meal-assistant/feedback` lưu rating vào `MEAL_FEEDBACK_PATH`.

## Cách cài đặt
1. Cập nhật `.env` với `GEMINI_API_KEY` (nếu dùng LLM).
2. `pip install -r serverAI/requirements.txt` (cần sentence-transformers & faiss).
3. Chạy `python -m serverAI.tools.build_meal_index` sau khi cập nhật `data/recipes.json`.
4. `uvicorn serverAI.main:app --reload` và gọi API.
