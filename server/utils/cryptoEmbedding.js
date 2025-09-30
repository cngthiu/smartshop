//server/utils/cryptoEmbedding.js
import crypto from "crypto";

function getKey() {
  const b64 = process.env.FACE_EMBEDDING_KEY_B64;
  if (!b64) {
    console.error("[cryptoEmbedding] FACE_EMBEDDING_KEY_B64 missing");
    throw new Error("FACE_EMBEDDING_KEY_B64 missing");
  }
  const key = Buffer.from(b64, "base64");
  if (key.length !== 32) {
    console.error("[cryptoEmbedding] Invalid key length:", key.length);
    throw new Error("FACE_EMBEDDING_KEY_B64 must decode to 32 bytes");
  }
  return key;
}

export function encryptEmbedding(floatArray) {
  const arr =
    floatArray instanceof Float32Array
      ? floatArray
      : new Float32Array(floatArray);
  const plain = Buffer.from(arr.buffer);
  const key = getKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(plain), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    embeddingEncB64: ciphertext.toString("base64"),
    ivB64: iv.toString("base64"),
    tagB64: tag.toString("base64"),
  };
}

export function decryptEmbedding(embeddingEncB64, ivB64, tagB64) {
  const key = getKey();
  const iv = Buffer.from(ivB64, "base64");
  const tag = Buffer.from(tagB64, "base64");
  const ciphertext = Buffer.from(embeddingEncB64, "base64");
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const plain = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  // Buffer -> Float32Array
  const u8 = new Uint8Array(plain.buffer, plain.byteOffset, plain.byteLength);
  return new Float32Array(
    u8.buffer,
    u8.byteOffset,
    Math.floor(u8.byteLength / 4)
  );
}
