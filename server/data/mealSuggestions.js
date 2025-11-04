// server/data/mealSuggestions.js
const mealSuggestions = [
  {
    id: "pho-bo-tai",
    name: "Phở bò tái",
    mealTypes: ["breakfast", "lunch"],
    tags: ["comfort", "northern", "broth"],
    diet: ["regular"],
    cookingTime: 35,
    difficulty: "medium",
    description:
      "Nước dùng thơm thanh từ xương bò, ăn kèm bánh phở mềm và thịt bò thái lát.",
    ingredients: [
      "Bánh phở",
      "Xương bò",
      "Thịt bò tái",
      "Gừng nướng",
      "Hành lá",
      "Ngò gai"
    ],
    tips:
      "Hầm xương ít nhất 40 phút và thêm một chút quế, thảo quả để dậy mùi vị.",
    nutrition: { calories: 480, protein: 32, carbs: 58 },
    pairing: "Ăn kèm quẩy nóng và tách trà gừng nóng."
  },
  {
    id: "banh-mi-op-la",
    name: "Bánh mì ốp la",
    mealTypes: ["breakfast"],
    tags: ["quick", "street-food"],
    diet: ["regular"],
    cookingTime: 10,
    difficulty: "easy",
    description:
      "Ổ bánh mì giòn, trứng ốp la lòng đào và ít pate, dưa leo, đồ chua.",
    ingredients: [
      "Bánh mì",
      "Trứng gà",
      "Pate",
      "Dưa leo",
      "Đồ chua",
      "Ngò rí"
    ],
    tips: "Chiên trứng với lửa vừa để lòng đỏ còn hơi sệt, ăn sẽ béo hơn.",
    nutrition: { calories: 420, protein: 16, carbs: 48 },
    pairing: "Dùng thêm ly cà phê sữa đá."
  },
  {
    id: "bun-cha-ha-noi",
    name: "Bún chả Hà Nội",
    mealTypes: ["lunch", "dinner"],
    tags: ["grill", "northern"],
    diet: ["regular"],
    cookingTime: 40,
    difficulty: "medium",
    description:
      "Thịt heo nướng thơm, ăn với bún, nước chấm chua ngọt và nhiều rau sống.",
    ingredients: [
      "Thịt ba chỉ",
      "Thịt nạc vai",
      "Bún tươi",
      "Đu đủ xanh",
      "Cà rốt",
      "Rau sống"
    ],
    tips:
      "Ướp thịt với mật ong hoặc đường thốt nốt để màu nướng đẹp và thơm hơn.",
    nutrition: { calories: 520, protein: 28, carbs: 55 },
    pairing: "Nên chuẩn bị thêm chả giò ram nhỏ để đa dạng bữa ăn."
  },
  {
    id: "goi-cuon-tom-thit",
    name: "Gỏi cuốn tôm thịt",
    mealTypes: ["lunch", "snack"],
    tags: ["fresh", "light", "healthy"],
    diet: ["regular"],
    cookingTime: 25,
    difficulty: "easy",
    description:
      "Cuốn bánh tráng với tôm, thịt, bún và rau thơm, chấm sốt đậu phộng.",
    ingredients: [
      "Bánh tráng",
      "Tôm luộc",
      "Thịt ba chỉ",
      "Bún",
      "Rau sống",
      "Đậu phộng rang"
    ],
    tips:
      "Chọn bánh tráng loại dẻo, nhúng nhanh tay trong nước ấm để không bị rách.",
    nutrition: { calories: 220, protein: 14, carbs: 26 },
    pairing: "Phù hợp với người muốn ăn nhẹ, giảm dầu mỡ."
  },
  {
    id: "com-ga-hoi-an",
    name: "Cơm gà Hội An",
    mealTypes: ["lunch", "dinner"],
    tags: ["central", "comfort"],
    diet: ["regular"],
    cookingTime: 45,
    difficulty: "medium",
    description:
      "Cơm vàng nấu từ nước luộc gà, gà xé trộn hành tây, rau răm và nước mắm chua ngọt.",
    ingredients: [
      "Gà ta",
      "Gạo dẻo",
      "Hành tây",
      "Rau răm",
      "Nước mắm ngon"
    ],
    tips:
      "Xào gạo với nghệ và mỡ gà trước khi nấu để hạt cơm vàng, thơm hơn.",
    nutrition: { calories: 560, protein: 32, carbs: 62 },
    pairing: "Ăn kèm nước luộc gà và ít ớt xanh giã nhuyễn."
  },
  {
    id: "mien-tron-chay",
    name: "Miến trộn chay",
    mealTypes: ["lunch", "dinner"],
    tags: ["vegetarian", "light", "healthy"],
    diet: ["vegetarian"],
    cookingTime: 20,
    difficulty: "easy",
    description:
      "Miến dong trộn cùng nấm, đậu hũ chiên, dưa leo và nước mắm chay.",
    ingredients: [
      "Miến dong",
      "Đậu hũ",
      "Nấm hương",
      "Cà rốt",
      "Dưa leo",
      "Rau thơm"
    ],
    tips:
      "Rưới thêm mè rang cùng ít dầu hào chay để món ăn thơm và đậm đà hơn.",
    nutrition: { calories: 320, protein: 12, carbs: 46 },
    pairing: "Thích hợp cho ngày ăn chay hoặc muốn ăn thanh đạm."
  },
  {
    id: "ca-hoi-ap-chao",
    name: "Cá hồi áp chảo",
    mealTypes: ["lunch", "dinner"],
    tags: ["omega", "healthy"],
    diet: ["regular"],
    cookingTime: 25,
    difficulty: "easy",
    description:
      "Cá hồi áp chảo vàng rụm, ăn với khoai nghiền và sốt bơ chanh.",
    ingredients: [
      "Phi lê cá hồi",
      "Khoai tây",
      "Bơ lạt",
      "Chanh vàng",
      "Măng tây"
    ],
    tips: "Áp chảo cá hồi bằng chảo chống dính, không lật quá nhiều lần.",
    nutrition: { calories: 480, protein: 30, carbs: 32 },
    pairing: "Phù hợp thực đơn giàu omega-3, tăng sức đề kháng."
  },
  {
    id: "salad-yen-mach",
    name: "Salad yến mạch sữa chua",
    mealTypes: ["breakfast", "snack"],
    tags: ["light", "healthy", "quick"],
    diet: ["vegetarian"],
    cookingTime: 10,
    difficulty: "easy",
    description:
      "Yến mạch trộn sữa chua, trái cây theo mùa và topping hạt dinh dưỡng.",
    ingredients: [
      "Yến mạch",
      "Sữa chua",
      "Trái cây tươi",
      "Hạt óc chó",
      "Mật ong"
    ],
    tips: "Ướp yến mạch với sữa chua qua đêm để mềm và thấm vị hơn.",
    nutrition: { calories: 320, protein: 11, carbs: 48 },
    pairing: "Giải pháp bữa sáng nhanh mà vẫn đủ chất."
  },
  {
    id: "sup-bi-do-chay",
    name: "Súp bí đỏ chay",
    mealTypes: ["dinner", "snack"],
    tags: ["vegetarian", "comfort", "warm"],
    diet: ["vegetarian"],
    cookingTime: 30,
    difficulty: "easy",
    description:
      "Bí đỏ, khoai tây nghiền mịn với sữa hạt, vị ngọt béo tự nhiên.",
    ingredients: [
      "Bí đỏ",
      "Khoai tây",
      "Sữa hạt",
      "Hành tây",
      "Hạt điều rang"
    ],
    tips: "Xào sơ bí đỏ với bơ thực vật giúp soup thơm và đậm vị.",
    nutrition: { calories: 260, protein: 8, carbs: 38 },
    pairing: "Ăn kèm bánh mì nướng bơ tỏi hoặc salad xanh."
  },
  {
    id: "bun-ca-loc",
    name: "Bún cá lóc miền Tây",
    mealTypes: ["breakfast", "lunch"],
    tags: ["southern", "broth"],
    diet: ["regular"],
    cookingTime: 40,
    difficulty: "medium",
    description:
      "Nước dùng ngọt xương cá, ăn cùng cá lóc chiên, rau đắng và bông súng.",
    ingredients: [
      "Cá lóc",
      "Bún tươi",
      "Rau đắng",
      "Bông súng",
      "Me chua"
    ],
    tips: "Chiên cá trước khi cho vào nồi để giữ độ ngọt và chắc thịt.",
    nutrition: { calories: 430, protein: 34, carbs: 52 },
    pairing: "Thêm ít ớt satế và nước mắm me để đúng vị miền Tây."
  },
  {
    id: "com-chien-ca-man",
    name: "Cơm chiên cá mặn",
    mealTypes: ["dinner"],
    tags: ["quick", "comfort"],
    diet: ["regular"],
    cookingTime: 20,
    difficulty: "easy",
    description:
      "Cơm nguội chiên cùng trứng, cá mặn xé, dưa leo và hành lá.",
    ingredients: [
      "Cơm nguội",
      "Trứng gà",
      "Cá mặn",
      "Dưa leo",
      "Hành lá",
      "Tiêu xay"
    ],
    tips: "Dùng cơm nguội mới để hạt rời, chiên lửa lớn và đảo nhanh tay.",
    nutrition: { calories: 520, protein: 22, carbs: 62 },
    pairing: "Hợp với những ngày bận rộn cần món ăn nhanh mà no lâu."
  },
  {
    id: "tra-sua-matcha",
    name: "Matcha latte ít đường",
    mealTypes: ["snack"],
    tags: ["drink", "refresh"],
    diet: ["vegetarian"],
    cookingTime: 5,
    difficulty: "easy",
    description:
      "Bột matcha khuấy với sữa hạnh nhân, thêm đá và mật ong nhẹ.",
    ingredients: [
      "Matcha",
      "Sữa hạnh nhân",
      "Mật ong",
      "Đá viên"
    ],
    tips: "Đánh matcha với ít nước ấm để bột tan đều, không vón cục.",
    nutrition: { calories: 120, protein: 3, carbs: 18 },
    pairing: "Giúp tỉnh táo buổi chiều nhưng không quá nhiều caffeine."
  }
]

export default mealSuggestions
