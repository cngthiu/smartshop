// server/route/chatbot.route.js
import { Router } from "express"
import {
  mealAdvisorController,
  mealAdvisorFeedbackController,
} from "../controllers/chatbot.controller.js"

const chatbotRouter = Router()

chatbotRouter.post("/meal-advice", mealAdvisorController)
chatbotRouter.post("/meal-advice/feedback", mealAdvisorFeedbackController)

export default chatbotRouter
