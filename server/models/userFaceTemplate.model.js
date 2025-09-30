//server/models/userFaceTemplate.model.js
import mongoose from "mongoose";

const userFaceTemplateSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
      required: true,
      unique: true,
    },
    // AES-GCM fields
    embeddingEncB64: { type: String, required: true }, // ciphertext (base64)
    ivB64: { type: String, required: true }, // iv (base64)
    tagB64: { type: String, required: true }, // auth tag (base64)
    modelVersion: { type: String, default: "arcface_r100_onnx_v1" },
    qualityScore: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const UserFaceTemplateModel = mongoose.model(
  "UserFaceTemplate",
  userFaceTemplateSchema
);
export default UserFaceTemplateModel;
