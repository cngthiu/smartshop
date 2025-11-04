// server/controllers/chatbot.controller.js
import mealSuggestions from "../data/mealSuggestions.js"
import generateMealAdviceWithAI from "../services/mealAdvisorAI.js"

const MEAL_KEYWORDS = {
  breakfast: ["sáng", "buổi sáng", "breakfast", "ăn sáng", "morning"],
  lunch: ["trưa", "buổi trưa", "lunch", "ăn trưa", "midday"],
  dinner: ["tối", "buổi tối", "dinner", "ăn tối", "đêm"],
  snack: ["ăn vặt", "snack", "ăn nhẹ", "xế", "giữa giờ"]
}

const DIET_KEYWORDS = {
  vegetarian: ["ăn chay", "vegetarian", "chay"],
  healthy: ["healthy", "lành mạnh", "giảm cân", "ít dầu"],
  quick: ["nhanh", "gấp", "ít thời gian"],
  comfort: ["ấm bụng", "nhẹ nhàng", "thoải mái", "comfort"],
  spicy: ["cay", "spicy"],
  drink: ["đồ uống", "uống", "drink"]
}

const GREETING_KEYWORDS = ["hi", "hello", "chào", "xin chào", "hey"]
const THANKS_KEYWORDS = ["cảm ơn", "thanks", "thank you"]

const normalizeText = (text = "") =>
  text
    .toLowerCase()
    .replace(/[.,!?]/g, " ")
    .replace(/\s+/g, " ")
    .trim()

const detectKeywords = (message, keywordMap) => {
  const hits = new Set()
  const content = normalizeText(message)
  Object.entries(keywordMap).forEach(([key, variants]) => {
    variants.forEach((variant) => {
      if (content.includes(variant)) {
        hits.add(key)
      }
    })
  })
  return Array.from(hits)
}

const pickMealTypes = (message) => {
  const detected = detectKeywords(message, MEAL_KEYWORDS)
  if (detected.length) return detected

  const hour = new Date().getHours()
  if (hour < 10) return ["breakfast"]
  if (hour < 15) return ["lunch"]
  if (hour < 20) return ["dinner"]
  return ["snack"]
}

const pickDietTags = (message) => detectKeywords(message, DIET_KEYWORDS)

const formatSuggestion = (item) => ({
  id: item.id,
  name: item.name,
  description: item.description,
  cookingTime: item.cookingTime,
  difficulty: item.difficulty,
  ingredients: item.ingredients,
  tips: item.tips,
  pairing: item.pairing,
  nutrition: item.nutrition,
  tags: item.tags,
  mealTypes: item.mealTypes
})

const buildReply = (mealTypes, dietTags, suggestions) => {
  const readableMeal = mealTypes
    .map((type) => {
      switch (type) {
        case "breakfast":
          return "bữa sáng"
        case "lunch":
          return "bữa trưa"
        case "dinner":
          return "bữa tối"
        case "snack":
          return "bữa ăn nhẹ"
        default:
          return type
      }
    })
    .join(" hoặc ")

  const dietNote = dietTags.length
    ? ` theo tiêu chí ${dietTags.join(", ")}`
    : ""

  const names = suggestions.map((item) => item.name).join(", ")
  return `Mình gợi ý cho ${readableMeal}${dietNote}: ${names}. Bạn muốn nghe chi tiết cách chuẩn bị hoặc thay đổi tiêu chí món ăn không?`
}

export const mealAdvisorController = async (req, res) => {
  try {
    const { message } = req.body || {}
    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng cho mình biết bạn muốn ăn gì hoặc bữa nào nhé."
      })
    }

    const normalized = normalizeText(message)

    if (GREETING_KEYWORDS.some((word) => normalized.startsWith(word))) {
      return res.json({
        success: true,
        message:
          "Xin chào! Mình là trợ lý gợi ý món ăn trong ngày. Bạn muốn ăn sáng, trưa, tối hay món ăn nhẹ?",
        suggestions: []
      })
    }

    if (THANKS_KEYWORDS.some((word) => normalized.includes(word))) {
      return res.json({
        success: true,
        message:
          "Rất vui được giúp bạn! Nếu cần thêm gợi ý món hoặc cách chế biến, cứ nhắn cho mình nhé.",
        suggestions: []
      })
    }

    const mealTypes = pickMealTypes(message)
    const dietTags = pickDietTags(message)

    let filtered = mealSuggestions.filter((item) =>
      item.mealTypes.some((type) => mealTypes.includes(type))
    )

    if (dietTags.length) {
      filtered = filtered.filter((item) => {
        const combinedTags = [...(item.tags || []), ...(item.diet || [])]
        return dietTags.every((tag) => combinedTags.includes(tag))
      })
    }

    if (!filtered.length) {
      filtered = mealSuggestions.filter((item) =>
        item.mealTypes.some((type) => mealTypes.includes(type))
      )
    }

    if (!filtered.length) {
      filtered = mealSuggestions
    }

    const topSuggestions = filtered
      .sort(() => Math.random() - 0.5)
      .slice(0, 3)
      .map(formatSuggestion)

    const reply = buildReply(mealTypes, dietTags, topSuggestions)

    let aiAdvice = null
    if (process.env.MEAL_ADVISOR_AI_ENABLED !== "false") {
      aiAdvice = await generateMealAdviceWithAI({
        message,
        suggestions: topSuggestions,
        mealTypes,
        dietTags
      })
    }

    return res.json({
      success: true,
      message: aiAdvice?.message || reply,
      suggestions: topSuggestions,
      meta: {
        mealTypes,
        dietTags,
        ai: aiAdvice
      }
    })
  } catch (error) {
    console.error("[mealAdvisorController] error:", error)
    return res.status(500).json({
      success: false,
      message: "Xin lỗi, hiện tại mình không thể phản hồi. Bạn thử lại sau nhé."
    })
  }
}

export default mealAdvisorController
