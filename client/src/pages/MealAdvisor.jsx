import React, { useEffect, useMemo, useRef, useState } from "react"
import { IoPaperPlane, IoSparkles } from "react-icons/io5"
import { MdFastfood, MdOutlineTipsAndUpdates } from "react-icons/md"
import { FaRegSmileBeam } from "react-icons/fa"
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
  const chatEndRef = useRef(null)
  const navigate = useNavigate()

  const handleSend = async (text) => {
    const content = text ?? input
    const trimmed = content.trim()
    if (!trimmed || isLoading) return

    setMessages((prev) => [...prev, { role: "user", content: trimmed }])
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

  const handleExploreIngredients = (name) => {
    navigate("/search", { state: { keyword: name } })
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
                  key={item.id}
                  className="flex flex-col gap-2 rounded-xl border border-yellow-100 bg-yellow-50/70 p-3 text-sm text-neutral-700 shadow-sm"
                >
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-base font-semibold text-neutral-900">
                      {item.name}
                    </h3>
                    <span className="rounded-full bg-white px-2 py-0.5 text-xs text-neutral-500">
                      {item.cookingTime} phút
                    </span>
                  </div>
                  <p>{item.description}</p>
                  <div className="flex flex-wrap gap-1 text-xs text-yellow-700">
                    {item.tags?.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-white/80 px-2 py-0.5"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                  <div>
                    <p className="font-medium text-neutral-800">Nguyên liệu:</p>
                    <ul className="ml-4 list-disc text-neutral-600">
                      {item.ingredients.slice(0, 4).map((ingredient) => (
                        <li key={ingredient}>{ingredient}</li>
                      ))}
                      {item.ingredients.length > 4 && <li>...</li>}
                    </ul>
                  </div>
                  {item.tips && (
                    <div className="flex items-start gap-2 rounded-lg bg-white/70 p-2 text-xs text-neutral-600">
                      <FaRegSmileBeam className="mt-0.5 shrink-0 text-yellow-600" />
                      <span>{item.tips}</span>
                    </div>
                  )}
                  <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-500">
                    <span>Độ khó: {item.difficulty}</span>
                    {item.nutrition?.calories && (
                      <span>~ {item.nutrition.calories} kcal</span>
                    )}
                  </div>
                  <button
                    onClick={() => handleExploreIngredients(item.name)}
                    className="mt-1 rounded-lg bg-primary-200 px-3 py-2 text-sm font-medium text-white transition hover:bg-primary-300"
                  >
                    Tìm nguyên liệu trong SmartShop
                  </button>
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
