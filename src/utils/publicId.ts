import crypto from "crypto";

export default function generatePublicId() {
  return crypto.randomBytes(8).toString("hex"); // 8 bytes → 16 hex chars
}
