// server/controllers/chatbot.controller.js
import mealSuggestions from "../data/mealSuggestions.js"
import {
  requestMealAssistant,
  sendMealAssistantFeedback
} from "../services/mealAssistantProxy.js"

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

const buildReply = (mealTypes, dietTags, suggestions, getName = (i) => i.name) => {
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

  const names = suggestions.map((item) => getName(item)).join(", ")
  return `Mình gợi ý cho ${readableMeal}${dietNote}: ${names}. Bạn muốn nghe chi tiết cách chuẩn bị hoặc thay đổi tiêu chí món ăn không?`
}

const legacyToAssistantSuggestion = (item) => ({
  dishId: item.id,
  dishName: item.name,
  description: item.description,
  prepTime: item.cookingTime,
  estimatedBudget: item.nutrition?.calories || null,
  products: item.ingredients.map((ingredient) => ({
    referenceId: ingredient,
    name: ingredient,
    reason: "Thành phần gợi ý",
  })),
  score: 0.2,
})

const pickLegacySuggestions = (mealTypes, dietTags) => {
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

  return filtered
    .sort(() => Math.random() - 0.5)
    .slice(0, 3)
    .map(legacyToAssistantSuggestion)
}

export const mealAdvisorController = async (req, res) => {
  try {
    const {
      message,
      availableProducts = [],
      dietTags: dietTagsFromClient = [],
      allergies = [],
      preferredCategories = [],
      servings,
      budget,
    } = req.body || {}
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
    const detectedDietTags = pickDietTags(message)
    const dietTags = Array.from(new Set([...dietTagsFromClient, ...detectedDietTags]))

    const assistantPayload = {
      query: message,
      available_products: availableProducts,
      diet_tags: dietTags,
      allergies,
      preferred_categories: preferredCategories,
      servings,
      budget,
    }

    try {
      const assistant = await requestMealAssistant(assistantPayload)
      if (assistant?.success) {
        const reply = buildReply(
          mealTypes,
          dietTags,
          assistant.suggestions || [],
          (item) => item.dishName || item.name
        )

        return res.json({
          success: true,
          message: assistant.llmResponse || reply,
          suggestions: assistant.suggestions || [],
          meta: {
            mealTypes,
            dietTags,
            nlu: assistant.nlu,
            retrieval: assistant.retrievalDebug,
            llmError: assistant.error,
          },
        })
      }
    } catch (error) {
      const status = error?.response?.status
      const reason = error?.response?.data || error?.message
      console.error("[mealAdvisorController] meal assistant error:", status, reason)
    }

    const fallbackSuggestions = pickLegacySuggestions(mealTypes, dietTags)
    const fallbackReply = buildReply(
      mealTypes,
      dietTags,
      fallbackSuggestions,
      (item) => item.dishName
    )

    return res.json({
      success: true,
      message: fallbackReply,
      suggestions: fallbackSuggestions,
      meta: {
        mealTypes,
        dietTags,
        fallback: true,
      },
    })
  } catch (error) {
    console.error("[mealAdvisorController] error:", error)
    return res.status(500).json({
      success: false,
      message: "Xin lỗi, hiện tại mình không thể phản hồi. Bạn thử lại sau nhé."
    })
  }
}

export const mealAdvisorFeedbackController = async (req, res) => {
  try {
    const { query, chosenRecipeId, rating = 5, note } = req.body || {}
    if (!query || !chosenRecipeId) {
      return res.status(400).json({
        success: false,
        message: "Thiếu thông tin phản hồi",
      })
    }

    await sendMealAssistantFeedback({
      query,
      chosen_recipe_id: chosenRecipeId,
      rating,
      note,
    })

    return res.json({ success: true })
  } catch (error) {
    const status = error?.response?.status
    const reason = error?.response?.data || error?.message
    console.error("[mealAdvisorFeedback] error:", status, reason)
    return res.status(500).json({
      success: false,
      message: "Không ghi nhận được phản hồi, bạn thử lại sau nhé.",
    })
  }
}

export default mealAdvisorController
