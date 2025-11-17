  //server/models/product.model.js
  import mongoose from "mongoose";

  const productSchema = new mongoose.Schema(
    {
      name: {
        type: String
      },
      recognitionId: {
        type: String,
        index: true,
        sparse: true,
        unique: true
      },
      image: {
        type: Array,
        default: []
      },
      category: [
        {
          type: mongoose.Schema.ObjectId,
          ref: "category"
        }
      ],
      subCategory: [
        {
          type: mongoose.Schema.ObjectId,
          ref: "subCategory"
        }
      ],
      unit: {
        type: String,
        default: ""
      },
      stock: {
        type: Number,
        default: null
      },
      price: {
        type: Number,
        defualt: null
      },
      discount: {
        type: Number,
        default: null
      },
      description: {
        type: String,
        default: ""
      },
      more_details: {
        type: Object,
        default: {}
      },
      autoCreated: {
        type: Boolean,
        default: false
      },
      publish: {
        type: Boolean,
        default: true
      }
    },
    {
      timestamps: true
    }
  )

  productSchema.index(
    {
      name: "text",
      description: "text"
    },
    {
      name: 10,
      description: 5
    }
  )

  const ProductModel = mongoose.model("product", productSchema)

  export default ProductModel
