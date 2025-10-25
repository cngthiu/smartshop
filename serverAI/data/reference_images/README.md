# Reference Images

Đặt ảnh mẫu (JPEG/PNG) cho từng sản phẩm vào thư mục này. Tên file phải khớp với trường `reference_image` trong `serverAI/data/product_catalog.json`. Ảnh nên:
- Chỉ chứa sản phẩm cần nhận diện, nền gọn gàng.
- Độ phân giải tối thiểu ~256px ở cạnh nhỏ.
- Canh thẳng, tránh chụp nghiêng quá mức.

Ví dụ:
```
serverAI/data/reference_images/
├── vinamilk-fresh-milk-1l.jpg
├── chinsu-chili-sauce-270g.jpg
└── orion-chocopie-original-12p.jpg
```

Sau khi bổ sung ảnh mới, hãy khởi động lại dịch vụ `serverAI` để tái nạp embeddings.
