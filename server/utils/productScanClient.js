//server/utils/productScanClient.js
import axios from "axios"

const baseURL =
  process.env.PRODUCT_SCANNER_BASE_URL || process.env.FACE_AUTH_BASE_URL

if (!baseURL) {
  throw new Error(
    "PRODUCT_SCANNER_BASE_URL or FACE_AUTH_BASE_URL is required for product scanning"
  )
}

const SCAN_ENDPOINT =
  process.env.PRODUCT_SCANNER_ENDPOINT || "/api/v1/product/recognize"

export const scanProductFrame = async (fileBuffer, mime = "image/jpeg") => {
  try {
    const image_b64 = fileBuffer.toString("base64")

    const url = new URL(
      SCAN_ENDPOINT.startsWith("http")
        ? SCAN_ENDPOINT
        : SCAN_ENDPOINT.startsWith("/")
        ? SCAN_ENDPOINT
        : `/${SCAN_ENDPOINT}`,
      baseURL
    ).toString()

    const { data } = await axios.post(
      url,
      {
        image_b64,
        mime
      },
      { timeout: 20000 }
    )

    return data
  } catch (error) {
    console.error(
      "[productScanClient] /product/scan failed:",
      error?.response?.data || error?.message
    )
    throw error
  }
}

export default scanProductFrame
