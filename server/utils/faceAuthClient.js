//server/utils/faceAuthClient.js
import axios from "axios";
const baseURL = process.env.FACE_AUTH_BASE_URL;
if (!baseURL) throw new Error("FACE_AUTH_BASE_URL missing");
const client = axios.create({ baseURL, timeout: 15000 });

export async function encodeImageToEmbedding(fileBuffer, mime = "image/jpeg") {
  try {
    const b64 = fileBuffer.toString("base64");
    const { data } = await client.post("/encode", { image_b64: b64, mime });
    return data;
  } catch (e) {
    console.error(
      "[faceAuthClient] /encode failed:",
      e?.response?.data || e?.message
    );
    throw e;
  }
}
