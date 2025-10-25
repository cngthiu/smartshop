//server/route/product.route.js

import { Router } from 'express'
import auth from '../middleware/auth.js'
import { createProductController, deleteProductDetails, getProductByCategory, getProductByCategoryAndSubCategory, getProductController, getProductDetails, searchProduct, updateProductDetails, autoCreateProductFromScan } from '../controllers/product.controller.js'
import { admin } from '../middleware/Admin.js'
import upload from '../middleware/multer.js'

const productRouter = Router()

productRouter.post("/create",auth,admin,createProductController)
productRouter.post("/auto-create-from-scan",auth,admin,upload.single("frame"),autoCreateProductFromScan)
productRouter.post('/get',getProductController)
productRouter.post("/get-product-by-category",getProductByCategory)
productRouter.post('/get-pruduct-by-category-and-subcategory',getProductByCategoryAndSubCategory)
productRouter.post('/get-product-details',getProductDetails)

//update product
productRouter.put('/update-product-details',auth,admin,updateProductDetails)

//delete product
productRouter.delete('/delete-product',auth,admin,deleteProductDetails)

//search product 
productRouter.post('/search-product',searchProduct)

export default productRouter
