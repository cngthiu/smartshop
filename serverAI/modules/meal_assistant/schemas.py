from typing import List, Optional, Dict

from pydantic import BaseModel, Field


class MealAssistantRequest(BaseModel):
    query: str = Field(..., description="Câu hỏi tự nhiên của người dùng")
    available_products: List[str] = Field(
        default_factory=list,
        description="Danh sách referenceId sản phẩm người dùng đang có",
    )
    servings: Optional[int] = Field(default=None, description="Số khẩu phần mong muốn")
    diet_tags: List[str] = Field(default_factory=list, description="Ưu tiên chế độ ăn")
    allergies: List[str] = Field(default_factory=list, description="Thành phần cần tránh")
    preferred_categories: List[str] = Field(default_factory=list, description="Ngành hàng quan tâm")
    budget: Optional[float] = Field(default=None, description="Ngân sách tạm tính (VND)")
    language: Optional[str] = Field(default=None, description="Ngôn ngữ phản hồi mong muốn")
    temperature: Optional[float] = Field(default=None, ge=0.0, le=1.0)


class MealAssistantProduct(BaseModel):
    referenceId: str
    name: Optional[str] = None
    reason: Optional[str] = None
    quantity: Optional[str] = None


class MealAssistantSuggestion(BaseModel):
    dishId: str
    dishName: str
    description: Optional[str] = None
    prepTime: Optional[int] = None
    estimatedBudget: Optional[float] = None
    products: List[MealAssistantProduct] = Field(default_factory=list)
    score: float


class MealAssistantResponse(BaseModel):
    success: bool = True
    suggestions: List[MealAssistantSuggestion] = Field(default_factory=list)
    llmResponse: Optional[str] = None
    prompt: str
    nlu: Dict[str, Optional[str]] = Field(default_factory=dict)
    retrievalDebug: Dict[str, List[Dict]] = Field(default_factory=dict)
    error: Optional[str] = None


class MealAssistantFeedback(BaseModel):
    query: str
    chosen_recipe_id: str
    rating: int = Field(ge=0, le=5)
    note: Optional[str] = None
