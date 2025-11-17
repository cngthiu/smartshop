import os
import google.generativeai as genai
from dotenv import load_dotenv

# Load API KEY
load_dotenv()
API_KEY = os.getenv("GEMINI_API_KEY")

genai.configure(api_key=API_KEY)

# Chọn model
model = genai.GenerativeModel("gemini-2.5-flash")

try:
    response = model.generate_content("Xin chào, bạn đang hoạt động chứ?")
    print("=== RESPONSE ===")
    print(response.text)

except Exception as e:
    print("=== ERROR ===")
    print(e)
