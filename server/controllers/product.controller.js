//server/controllers/product.controller.js
import ProductModel from "../models/product.model.js";
import CategoryModel from "../models/category.model.js";
import SubCategoryModel from "../models/subCategory.model.js";
import { scanProductFrame } from "../utils/productScanClient.js";

export const createProductController = async (request, response) => {
  try {
    const {
      name,
      image,
      category,
      subCategory,
      unit,
      stock,
      price,
      discount,
      description,
      more_details
    } = request.body

    if (
      !name ||
      !image?.[0] ||
      !category?.[0] ||
      !subCategory?.[0] ||
      !unit ||
      !price ||
      !description
    ) {
      return response.status(400).json({
        message: "Enter required fields",
        error: true,
        success: false
      })
    }

    const product = new ProductModel({
      name,
      image,
      category,
      subCategory,
      unit,
      stock,
      price,
      discount,
      description,
      more_details,
      autoCreated: false
    })
    const saveProduct = await product.save()

    return response.json({
      message: "Product Created Successfully",
      data: saveProduct,
      error: false,
      success: true
    })
  } catch (error) {
    return response.status(500).json({
      message: error.message || error,
      error: true,
      success: false
    })
  }
}

export const autoCreateProductFromScan = async (request, response) => {
  try {
    const frame = request.file

    if (!frame) {
      return response.status(400).json({
        message: "Vui lòng gửi 1 ảnh từ camera (field: frame)",
        error: true,
        success: false
      })
    }

    const scanResult = await scanProductFrame(
      frame.buffer,
      frame.mimetype || "image/jpeg"
    )

    if (!scanResult?.success || !scanResult?.product) {
      return response.status(400).json({
        message:
          scanResult?.message || "Không nhận diện được sản phẩm từ ảnh",
        error: true,
        success: false,
        data: scanResult
      })
    }

    const productPayload = scanResult.product
    const categoryName = productPayload?.category?.trim()
    const subCategoryName = productPayload?.subCategory?.trim()

    if (!categoryName) {
      return response.status(400).json({
        message: "Thiếu thông tin category từ kết quả nhận diện",
        error: true,
        success: false,
        data: scanResult
      })
    }

    const recognitionId =
      productPayload?.referenceId || productPayload?.recognitionId

    if (!recognitionId) {
      return response.status(400).json({
        message: "Thiếu referenceId cho sản phẩm đã nhận diện",
        error: true,
        success: false,
        data: scanResult
      })
    }

    let categoryDoc = await CategoryModel.findOne({ name: categoryName })
    if (!categoryDoc) {
      categoryDoc = await CategoryModel.create({
        name: categoryName,
        image: Array.isArray(productPayload?.image)
          ? productPayload.image[0] || ""
          : ""
      })
    }

    let subCategoryDoc = null
    if (subCategoryName) {
      subCategoryDoc = await SubCategoryModel.findOne({
        name: subCategoryName
      })
      if (!subCategoryDoc) {
        subCategoryDoc = await SubCategoryModel.create({
          name: subCategoryName,
          image: Array.isArray(productPayload?.image)
            ? productPayload.image[0] || ""
            : "",
          category: [categoryDoc._id]
        })
      } else {
        if (!Array.isArray(subCategoryDoc.category)) {
          subCategoryDoc.category = []
        }
        if (!subCategoryDoc.category.some((id) => id.equals(categoryDoc._id))) {
          subCategoryDoc.category.push(categoryDoc._id)
          await subCategoryDoc.save()
        }
      }
    }

    const imageList = Array.isArray(productPayload?.image)
      ? productPayload.image
      : productPayload?.image
      ? [productPayload.image]
      : []

    const updatePayload = {
      name: productPayload?.name || recognitionId,
      image: imageList,
      category: [categoryDoc._id],
      subCategory: subCategoryDoc ? [subCategoryDoc._id] : [],
      unit: productPayload?.unit || "",
      stock:
        typeof productPayload?.stock === "number" ? productPayload.stock : 0,
      price:
        typeof productPayload?.price === "number" ? productPayload.price : 0,
      discount:
        typeof productPayload?.discount === "number"
          ? productPayload.discount
          : 0,
      description: productPayload?.description || "",
      more_details: productPayload?.more_details || {},
      recognitionId,
      autoCreated: true,
      publish: true
    }

    const product = await ProductModel.findOneAndUpdate(
      { recognitionId },
      { $set: updatePayload },
      {
        upsert: true,
        new: true,
        runValidators: true,
        setDefaultsOnInsert: true
      }
    ).populate("category subCategory")

    return response.json({
      message: "Nhận diện và tạo sản phẩm thành công",
      error: false,
      success: true,
      data: {
        product,
        category: categoryDoc,
        subCategory: subCategoryDoc,
        confidence: scanResult?.confidence
      }
    })
  } catch (error) {
    return response.status(500).json({
      message: error.message || error,
      error: true,
      success: false
    })
  }
}

export const getProductsByReferenceId = async (request, response) => {
  try {
    const { referenceIds } = request.body || {}

    if (!Array.isArray(referenceIds) || referenceIds.length === 0) {
      return response.status(400).json({
        message: "referenceIds phải là một mảng chứa ít nhất 1 phần tử",
        error: true,
        success: false
      })
    }

    const products = await ProductModel.find({
      recognitionId: { $in: referenceIds }
    })
      .populate("category")
      .populate("subCategory")

    return response.json({
      message: "Lấy thông tin sản phẩm theo referenceId thành công",
      data: products,
      error: false,
      success: true
    })
  } catch (error) {
    return response.status(500).json({
      message: error.message || error,
      error: true,
      success: false
    })
  }
}

export const getProductController = async(request,response)=>{
    try {
        
        let { page, limit, search } = request.body 

        if(!page){
            page = 1
        }

        if(!limit){
            limit = 10
        }

        const query = search ? {
            $text : {
                $search : search
            }
        } : {}

        const skip = (page - 1) * limit

        const [data,totalCount] = await Promise.all([
            ProductModel.find(query).sort({createdAt : -1 }).skip(skip).limit(limit).populate('category subCategory'),
            ProductModel.countDocuments(query)
        ])

        return response.json({
            message : "Product data",
            error : false,
            success : true,
            totalCount : totalCount,
            totalNoPage : Math.ceil( totalCount / limit),
            data : data
        })
    } catch (error) {
        return response.status(500).json({
            message : error.message || error,
            error : true,
            success : false
        })
    }
}

export const getProductByCategory = async(request,response)=>{
    try {
        const { id } = request.body 

        if(!id){
            return response.status(400).json({
                message : "provide category id",
                error : true,
                success : false
            })
        }

        const product = await ProductModel.find({ 
            category : { $in : id }
        }).limit(15)

        return response.json({
            message : "category product list",
            data : product,
            error : false,
            success : true
        })
    } catch (error) {
        return response.status(500).json({
            message : error.message || error,
            error : true,
            success : false
        })
    }
}

export const getProductByCategoryAndSubCategory  = async(request,response)=>{
    try {
        const { categoryId,subCategoryId,page,limit } = request.body

        if(!categoryId || !subCategoryId){
            return response.status(400).json({
                message : "Provide categoryId and subCategoryId",
                error : true,
                success : false
            })
        }

        if(!page){
            page = 1
        }

        if(!limit){
            limit = 10
        }

        const query = {
            category : { $in :categoryId  },
            subCategory : { $in : subCategoryId }
        }

        const skip = (page - 1) * limit

        const [data,dataCount] = await Promise.all([
            ProductModel.find(query).sort({createdAt : -1 }).skip(skip).limit(limit),
            ProductModel.countDocuments(query)
        ])

        return response.json({
            message : "Product list",
            data : data,
            totalCount : dataCount,
            page : page,
            limit : limit,
            success : true,
            error : false
        })

    } catch (error) {
        return response.status(500).json({
            message : error.message || error,
            error : true,
            success : false
        })
    }
}

export const getProductDetails = async(request,response)=>{
    try {
        const { productId } = request.body 

        const product = await ProductModel.findOne({ _id : productId })


        return response.json({
            message : "product details",
            data : product,
            error : false,
            success : true
        })

    } catch (error) {
        return response.status(500).json({
            message : error.message || error,
            error : true,
            success : false
        })
    }
}

//update product
export const updateProductDetails = async(request,response)=>{
    try {
        const { _id } = request.body 

        if(!_id){
            return response.status(400).json({
                message : "provide product _id",
                error : true,
                success : false
            })
        }

        const updateProduct = await ProductModel.updateOne({ _id : _id },{
            ...request.body
        })

        return response.json({
            message : "updated successfully",
            data : updateProduct,
            error : false,
            success : true
        })

    } catch (error) {
        return response.status(500).json({
            message : error.message || error,
            error : true,
            success : false
        })
    }
}

//delete product
export const deleteProductDetails = async(request,response)=>{
    try {
        const { _id } = request.body 

        if(!_id){
            return response.status(400).json({
                message : "provide _id ",
                error : true,
                success : false
            })
        }

        const deleteProduct = await ProductModel.deleteOne({_id : _id })

        return response.json({
            message : "Delete successfully",
            error : false,
            success : true,
            data : deleteProduct
        })
    } catch (error) {
        return response.status(500).json({
            message : error.message || error,
            error : true,
            success : false
        })
    }
}

//search product
export const searchProduct = async(request,response)=>{
    try {
        let { search, page , limit } = request.body 

        if(!page){
            page = 1
        }
        if(!limit){
            limit  = 10
        }

        const query = search ? {
            $text : {
                $search : search
            }
        } : {}

        const skip = ( page - 1) * limit

        const [data,dataCount] = await Promise.all([
            ProductModel.find(query).sort({ createdAt  : -1 }).skip(skip).limit(limit).populate('category subCategory'),
            ProductModel.countDocuments(query)
        ])

        return response.json({
            message : "Product data",
            error : false,
            success : true,
            data : data,
            totalCount :dataCount,
            totalPage : Math.ceil(dataCount/limit),
            page : page,
            limit : limit 
        })


    } catch (error) {
        return response.status(500).json({
            message : error.message || error,
            error : true,
            success : false
        })
    }
}
