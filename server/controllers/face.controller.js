//service/controller/face.controller.js
import UserModel from "../models/user.model.js";
import UserFaceTemplateModel from "../models/userFaceTemplate.model.js";
import {
  encryptEmbedding,
  decryptEmbedding,
} from "../utils/cryptoEmbedding.js";
import { encodeImageToEmbedding } from "../utils/faceAuthClient.js";
import { cosineSimilarity } from "../utils/cosine.js";
import generatedAccessToken from "../utils/generatedAccessToken.js";
import genertedRefreshToken from "../utils/generatedRefreshToken.js";

function l2norm(vec) {
  let s = 0;
  for (let i = 0; i < vec.length; i++) s += vec[i] * vec[i];
  const n = Math.sqrt(s) || 1;
  for (let i = 0; i < vec.length; i++) vec[i] /= n;
  return vec;
}

export async function faceEnrollController(req, res) {
  try {
    const userId = req.userId;
    if (!userId) {
      return res
        .status(401)
        .json({ message: "Unauthorized", error: true, success: false });
    }

    // LOG: kích thước request
    console.log("[Enroll] headers content-type:", req.headers["content-type"]);
    console.log("[Enroll] files length:", (req.files || []).length);

    const files = req.files || (req.file ? [req.file] : []);
    if (!files.length) {
      return res.status(400).json({
        message: "Vui lòng gửi ít nhất 1 ảnh (frames[])",
        error: true,
        success: false,
      });
    }

    const embeds = [];
    let bestQuality = 0;
    let modelVersion = "arcface_r100_onnx_v1";

    for (const file of files) {
      const mime = file.mimetype || "image/jpeg";
      console.log("[Enroll] calling /encode for", mime, "size:", file.size);
      const encResp = await encodeImageToEmbedding(file.buffer, mime);
      const { embedding, modelVersion: mv, quality, error } = encResp || {};
      if (error) console.error("[Enroll] /encode returned error:", error);

      if (embedding && embedding.length) {
        embeds.push(embedding);
        if (quality > bestQuality) bestQuality = quality;
        if (mv) modelVersion = mv;
      } else {
        console.warn("[Enroll] No face in one frame");
      }
    }

    console.log("[Enroll] got embeddings:", embeds.length);
    if (!embeds.length) {
      return res.status(400).json({
        message: "Không phát hiện khuôn mặt trong các ảnh đã gửi",
        error: true,
        success: false,
      });
    }

    // mean + L2
    const dim = embeds[0].length;
    const mean = new Float32Array(dim);
    for (const e of embeds) {
      for (let i = 0; i < dim; i++) mean[i] += e[i];
    }
    for (let i = 0; i < dim; i++) mean[i] /= embeds.length;
    l2norm(mean);

    // MÃ HÓA: dễ nổ nếu key sai
    let enc;
    try {
      enc = encryptEmbedding(mean);
      console.log(
        "[Enroll] encrypt ok; model:",
        modelVersion,
        "quality:",
        bestQuality
      );
    } catch (e) {
      console.error("[Enroll] encrypt error:", e.message);
      return res.status(500).json({
        message: "Encryption error: " + e.message,
        error: true,
        success: false,
      });
    }

    await UserFaceTemplateModel.updateOne(
      { userId },
      { ...enc, modelVersion, qualityScore: bestQuality },
      { upsert: true }
    );

    await UserModel.updateOne({ _id: userId }, { faceEnrolled: true });

    return res.json({
      message: `Đăng ký khuôn mặt thành công (${embeds.length} ảnh)`,
      error: false,
      success: true,
      data: { quality: bestQuality, modelVersion },
    });
  } catch (err) {
    console.error("[faceEnrollController] ERROR:", err);
    return res.status(500).json({
      message: err?.message || "Internal Server Error",
      error: true,
      success: false,
    });
  }
}
const cookiesOption = {
  httpOnly: true,
  secure: true,
  sameSite: "None",
  ...(process.env.COOKIE_DOMAIN ? { domain: process.env.COOKIE_DOMAIN } : {}),
};

export async function faceLoginController(req, res) {
  try {
    const file = req.file;
    if (!file) {
      return res
        .status(400)
        .json({ message: "No image provided", error: true, success: false });
    }

    // 1) Gọi Python: phải có đúng 1 mặt, nếu 0 hoặc >1 => báo lỗi
    const {
      embedding: probe,
      quality,
      faces_count,
      error,
    } = await encodeImageToEmbedding(
      file.buffer,
      file.mimetype || "image/jpeg"
    );

    if (error) {
      console.error("[faceLoginCamera] /encode error:", error);
    }

    if (faces_count !== 1) {
      const msg =
        faces_count === 0
          ? "Không phát hiện khuôn mặt. Vui lòng tiến gần camera hơn."
          : "Phát hiện nhiều hơn 1 gương mặt. Chỉ cho phép 1 gương mặt trong khung hình.";
      return res.status(400).json({
        message: msg,
        error: true,
        success: false,
        data: { faces_count },
      });
    }

    if (!probe || !probe.length) {
      return res
        .status(400)
        .json({ message: "No face embedding", error: true, success: false });
    }

    // 2) Tải tất cả template đã enroll (1:N)
    const templates = await UserFaceTemplateModel.find(
      {},
      { userId: 1, embeddingEncB64: 1, ivB64: 1, tagB64: 1 }
    );
    if (!templates.length) {
      return res.status(400).json({
        message: "Chưa có dữ liệu enroll nào",
        error: true,
        success: false,
      });
    }

    // 3) So khớp cosine với tất cả template, chọn score lớn nhất
    const probeVec = new Float32Array(probe);
    let best = { userId: null, score: -1 };

    for (const t of templates) {
      try {
        const vec = decryptEmbedding(t.embeddingEncB64, t.ivB64, t.tagB64);
        const s = cosineSimilarity(vec, probeVec);
        if (s > best.score) best = { userId: t.userId, score: s };
      } catch (e) {
        console.error(
          "[faceLoginCamera] decrypt or cosine failed for userId:",
          String(t.userId),
          e?.message
        );
      }
    }

    const threshold = Number(process.env.FACE_SIMILARITY_THRESHOLD || 0.65);
    if (!best.userId || best.score < threshold) {
      return res.status(401).json({
        message: "Không tìm thấy người dùng phù hợp",
        error: true,
        success: false,
        data: { score: best.score ?? 0, threshold, quality },
      });
    }

    // 4) Kiểm tra trạng thái user
    const user = await UserModel.findById(best.userId);
    if (!user) {
      return res.status(401).json({
        message: "Tài khoản không tồn tại",
        error: true,
        success: false,
      });
    }
    if (user.status !== "Active") {
      return res.status(401).json({
        message: "Tài khoản chưa sẵn sàng. Liên hệ Admin.",
        error: true,
        success: false,
      });
    }

    // 5) Cấp JWT + cookie
    const accesstoken = await generatedAccessToken(user._id);
    const refreshToken = await genertedRefreshToken(user._id);
    await UserModel.updateOne(
      { _id: user._id },
      { last_login_date: new Date() }
    );

    res.cookie("accessToken", accesstoken, cookiesOption);
    res.cookie("refreshToken", refreshToken, cookiesOption);

    return res.json({
      message: "Face login successfully",
      error: false,
      success: true,
      data: {
        accesstoken,
        refreshToken,
        score: best.score,
        userId: String(user._id),
      },
    });
  } catch (err) {
    console.error("[faceLoginCameraController] ERROR:", err);
    return res.status(500).json({
      message: err?.message || "Internal Server Error",
      error: true,
      success: false,
    });
  }
}
