//service/models/facLoginAudit.model.js
import mongoose from "mongoose";

const faceLoginAuditSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    success: { type: Boolean, default: false },
    score: { type: Number, default: 0 },
    liveness: { type: Boolean, default: false },
    reason: { type: String, default: "" },
    ip: { type: String, default: "" },
    deviceMeta: { type: Object, default: {} },
  },
  { timestamps: { createdAt: "ts", updatedAt: false } }
);

const FaceLoginAuditModel = mongoose.model(
  "FaceLoginAudit",
  faceLoginAuditSchema
);
export default FaceLoginAuditModel;
