// server/route/chatbot.route.js
import { Router } from "express"
import { mealAdvisorController } from "../controllers/chatbot.controller.js"

const chatbotRouter = Router()

chatbotRouter.post("/meal-advice", mealAdvisorController)

export default chatbotRouter
