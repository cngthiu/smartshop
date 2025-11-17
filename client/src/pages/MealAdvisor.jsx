import React, { useEffect, useMemo, useRef, useState } from "react"
import { IoPaperPlane, IoSparkles } from "react-icons/io5"
import { MdFastfood, MdOutlineTipsAndUpdates } from "react-icons/md"
import { FaCheckCircle } from "react-icons/fa"
import toast from "react-hot-toast"
import Axios from "../utils/Axios"
import SummaryApi from "../common/SummaryApi"
import Loading from "../components/Loading"
import { useNavigate } from "react-router-dom"

const quickPrompts = [
  "Gợi ý bữa sáng nhẹ nhàng",
  "Tôi cần món ăn nhanh cho buổi trưa bận rộn",
  "Món tối ấm bụng cho cả gia đình",
  "Có món ăn chay nào phù hợp hôm nay không?",
  "Đề xuất đồ uống giải nhiệt buổi chiều"
]

const MealAdvisor = () => {
  const [messages, setMessages] = useState([
    {
      role: "bot",
      content:
        "Xin chào, mình là trợ lý tư vấn món ăn. Bạn muốn gợi ý cho bữa nào hoặc theo tiêu chí gì? Ví dụ: \"món sáng nhẹ\" hoặc \"bữa tối ấm bụng cho 2 người.\""
    }
  ])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [lastQuery, setLastQuery] = useState("")
  const [feedbackStatus, setFeedbackStatus] = useState({})
  const chatEndRef = useRef(null)
  const navigate = useNavigate()

  const handleSend = async (text) => {
    const content = text ?? input
    const trimmed = content.trim()
    if (!trimmed || isLoading) return

    setMessages((prev) => [...prev, { role: "user", content: trimmed }])
    setLastQuery(trimmed)
    setInput("")
    setIsLoading(true)

    try {
      const response = await Axios({
        ...SummaryApi.mealAdvisor,
        data: { message: trimmed }
      })

      const data = response?.data

      if (data?.success) {
        setMessages((prev) => [
          ...prev,
          {
            role: "bot",
            content: data.message,
            suggestions: data.suggestions ?? []
          }
        ])
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: "bot",
            content:
              data?.message ??
              "Mình đang bị lỗi mạng rồi, bạn thử lại sau một chút nhé."
          }
        ])
      }
    } catch (error) {
      console.error(error)
      setMessages((prev) => [
        ...prev,
        {
          role: "bot",
          content:
            "Không gửi được yêu cầu. Bạn kiểm tra kết nối hoặc thử lại sau nhé."
        }
      ])
      toast.error("Không gọi được trợ lý món ăn.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    handleSend()
  }

  const handleQuickPrompt = (prompt) => {
    handleSend(prompt)
  }

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages, isLoading])

  const suggestionCards = useMemo(() => {
    return messages
      .filter((msg) => msg.role === "bot" && Array.isArray(msg.suggestions))
      .flatMap((msg) => msg.suggestions || [])
  }, [messages])

  const handleExploreIngredients = (keyword) => {
    if (!keyword) return
    navigate("/search", { state: { keyword } })
  }

  const handleFeedback = async (suggestion) => {
    const recipeId = suggestion?.dishId || suggestion?.dishName
    if (!recipeId || feedbackStatus[recipeId] === "sent") return

    setFeedbackStatus((prev) => ({ ...prev, [recipeId]: "loading" }))
    try {
      await Axios({
        ...SummaryApi.mealAdvisorFeedback,
        data: {
          query: lastQuery,
          chosenRecipeId: recipeId,
          rating: 5
        }
      })
      setFeedbackStatus((prev) => ({ ...prev, [recipeId]: "sent" }))
      toast.success("Cảm ơn phản hồi của bạn!")
    } catch (error) {
      console.error(error)
      toast.error("Không gửi được phản hồi.")
      setFeedbackStatus((prev) => ({ ...prev, [recipeId]: "error" }))
    }
  }

  const formatCurrency = (value) => {
    if (!value) return null
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(value)
  }

  return (
    <section className="container mx-auto px-3 py-6 lg:py-10">
      <div className="mx-auto grid max-w-4xl gap-4 rounded-xl border border-yellow-100 bg-white p-4 shadow-sm lg:p-6">
        <header className="flex items-center justify-between gap-3 rounded-lg bg-yellow-50 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-yellow-200/80 text-yellow-800">
              <MdOutlineTipsAndUpdates size={26} />
            </div>
            <div>
              <h1 className="text-lg font-semibold lg:text-xl">
                Trợ lý món ngon hôm nay
              </h1>
              <p className="text-sm text-neutral-600">
                Đưa ra tiêu chí (bữa sáng, ăn chay, nhanh gọn...) để nhận gợi ý
                phù hợp.
              </p>
            </div>
          </div>
        </header>

        <div className="flex flex-wrap gap-2">
          {quickPrompts.map((prompt) => (
            <button
              key={prompt}
              onClick={() => handleQuickPrompt(prompt)}
              className="flex items-center gap-1 rounded-full border border-yellow-200 bg-yellow-50 px-3 py-1.5 text-sm text-yellow-800 transition hover:bg-yellow-100"
            >
              <IoSparkles />
              {prompt}
            </button>
          ))}
        </div>

        <div className="grid gap-3 rounded-lg border border-neutral-200 bg-neutral-50 p-3 lg:p-4">
          <div className="flex max-h-[420px] flex-col gap-3 overflow-y-auto pr-1">
            {messages.map((msg, index) => (
              <div
                key={`${msg.role}-${index}`}
                className={`flex ${
                  msg.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm lg:text-base ${
                    msg.role === "user"
                      ? "bg-primary-200 text-white rounded-br-none"
                      : "bg-white text-neutral-800 border border-yellow-100 rounded-bl-none"
                  }`}
                >
                  <p className="whitespace-pre-line">{msg.content}</p>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-2xl border border-yellow-100 bg-white px-3 py-2">
                  <Loading />
                  <span className="text-sm text-neutral-500">
                    Đang suy nghĩ món phù hợp...
                  </span>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <form onSubmit={handleSubmit} className="flex items-end gap-2">
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              rows={2}
              placeholder="Bạn muốn ăn gì hôm nay? (ví dụ: bữa trưa nhanh, ăn chay, đồ uống mát)"
              className="flex-1 resize-none rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-primary-200 focus:ring-1 focus:ring-primary-200 lg:text-base"
            />
            <button
              type="submit"
              className="flex h-11 w-11 items-center justify-center rounded-full bg-primary-200 text-white shadow transition hover:bg-primary-300"
              disabled={isLoading}
            >
              <IoPaperPlane size={18} />
            </button>
          </form>
        </div>

        {suggestionCards.length > 0 && (
          <div className="grid gap-3 rounded-lg border border-yellow-100 bg-white p-3 lg:p-4">
            <div className="flex items-center gap-2 text-yellow-700">
              <MdFastfood size={22} />
              <h2 className="text-base font-semibold lg:text-lg">
                Gợi ý chi tiết hôm nay
              </h2>
            </div>
            <div className="grid gap-3 lg:grid-cols-2">
              {suggestionCards.map((item) => (
                <div
                  key={item.dishId || item.dishName}
                  className="flex flex-col gap-2 rounded-xl border border-yellow-100 bg-yellow-50/70 p-3 text-sm text-neutral-700 shadow-sm"
                >
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-base font-semibold text-neutral-900">
                      {item.dishName || item.name}
                    </h3>
                    {item.prepTime ? (
                      <span className="rounded-full bg-white px-2 py-0.5 text-xs text-neutral-500">
                        {item.prepTime} phút
                      </span>
                    ) : null}
                  </div>
                  <p>{item.description}</p>
                  {item.products?.length > 0 && (
                    <div>
                      <p className="font-medium text-neutral-800">Gợi ý mua kèm:</p>
                      <ul className="ml-4 list-disc text-neutral-600">
                        {item.products.slice(0, 4).map((product) => (
                          <li key={product.referenceId}>
                            <span className="font-semibold text-neutral-800">
                              {product.name || product.referenceId}
                            </span>
                            {product.reason && (
                              <span className="text-neutral-500"> – {product.reason}</span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-500">
                    {item.estimatedBudget && (
                      <span>Ước tính: {formatCurrency(item.estimatedBudget)}</span>
                    )}
                    {typeof item.score === "number" && (
                      <span>Điểm phù hợp: {(item.score * 100).toFixed(0)}%</span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => handleExploreIngredients(item.products?.[0]?.name || item.dishName)}
                      className="mt-1 rounded-lg bg-primary-200 px-3 py-2 text-sm font-medium text-white transition hover:bg-primary-300"
                    >
                      Tìm sản phẩm liên quan
                    </button>
                    <button
                      onClick={() => handleFeedback(item)}
                      className="mt-1 flex items-center gap-1 rounded-lg bg-green-50 px-3 py-2 text-sm font-medium text-green-700 transition hover:bg-green-100"
                      disabled={feedbackStatus[item.dishId || item.dishName] === "sent"}
                    >
                      <FaCheckCircle />
                      {feedbackStatus[item.dishId || item.dishName] === "sent"
                        ? "Đã phản hồi"
                        : "Gợi ý hữu ích"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

export default MealAdvisor
