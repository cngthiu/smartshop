import axios from "axios"

const {
  MEAL_ASSISTANT_BASE_URL = "http://localhost:8000",
  MEAL_ASSISTANT_TIMEOUT_MS = "15000"
} = process.env

const baseURL = MEAL_ASSISTANT_BASE_URL.replace(/\/+$/, "")
const timeout = Number(MEAL_ASSISTANT_TIMEOUT_MS) || 15000

export const requestMealAssistant = async (payload) => {
  const endpoint = `${baseURL}/api/v1/meal-assistant/suggest`
  const response = await axios.post(endpoint, payload, { timeout })
  return response.data
}

export const sendMealAssistantFeedback = async (payload) => {
  const endpoint = `${baseURL}/api/v1/meal-assistant/feedback`
  const response = await axios.post(endpoint, payload, { timeout })
  return response.data
}
