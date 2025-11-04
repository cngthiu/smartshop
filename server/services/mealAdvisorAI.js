// server/services/mealAdvisorAI.js
import axios from "axios"

const {
  MEAL_ADVISOR_AI_PROVIDER = "openai",
  MEAL_ADVISOR_AI_ENDPOINT,
  MEAL_ADVISOR_OPENAI_MODEL = "gpt-3.5-turbo",
  OPENAI_API_KEY
} = process.env

const buildPrompt = ({ message, suggestions, mealTypes, dietTags }) => {
  const formattedSuggestions = suggestions
    .map(
      (item, index) =>
        `${index + 1}. ${item.name} – ${item.description}. Thành phần chính: ${item.ingredients.join(
          ", "
        )}. Gợi ý kết hợp: ${item.pairing || "tùy chọn"}`
    )
    .join("\n")

  const mealText = mealTypes?.length ? mealTypes.join(", ") : "any"
  const dietText = dietTags?.length ? dietTags.join(", ") : "tùy chọn"

  return `Bạn là trợ lý ẩm thực thân thiện, trả lời bằng tiếng Việt. Người dùng đang tìm món ăn cho: ${mealText}. Yêu cầu chế độ dinh dưỡng: ${dietText}.

Câu hỏi của người dùng: "${message}".

Dưới đây là gợi ý hệ thống đã lọc:
${formattedSuggestions}

Hãy:
1. Viết lời tư vấn tự nhiên, ấm áp (3-4 câu).
2. Nêu lý do vì sao các món phù hợp.
3. Đề xuất thêm mẹo chuẩn bị hoặc biến tấu.
4. Gợi ý uống kèm hoặc món tráng miệng nếu phù hợp.
5. Kết thúc bằng lời mời gọi: “Bạn muốn mình gợi ý chi tiết cách làm hay món khác không?”`
}

export const generateMealAdviceWithAI = async ({
  message,
  suggestions,
  mealTypes,
  dietTags
}) => {
  const provider = MEAL_ADVISOR_AI_PROVIDER.toLowerCase()

  if (provider === "openai" && OPENAI_API_KEY) {
    try {
      const endpoint =
        MEAL_ADVISOR_AI_ENDPOINT || "https://api.openai.com/v1/chat/completions"

      const response = await axios.post(
        endpoint,
        {
          model: MEAL_ADVISOR_OPENAI_MODEL,
          messages: [
            {
              role: "system",
              content:
                "Bạn là trợ lý ẩm thực Việt Nam, hiểu khẩu vị người Việt, tư vấn món ăn thân thiện và chi tiết."
            },
            {
              role: "user",
              content: buildPrompt({ message, suggestions, mealTypes, dietTags })
            }
          ],
          temperature: 0.7,
          max_tokens: 600
        },
        {
          headers: {
            Authorization: `Bearer ${OPENAI_API_KEY}`,
            "Content-Type": "application/json"
          },
          timeout: 15_000
        }
      )

      const aiMessage =
        response.data?.choices?.[0]?.message?.content?.trim() ?? null

      if (aiMessage) {
        return {
          provider: "openai",
          model: MEAL_ADVISOR_OPENAI_MODEL,
          message: aiMessage
        }
      }
    } catch (error) {
      const status = error?.response?.status
      const reason = error?.response?.data || error?.message
      console.error("[mealAdvisorAI] OpenAI error:", status, reason)
      return null
    }
  }

  return null
}

export default generateMealAdviceWithAI
