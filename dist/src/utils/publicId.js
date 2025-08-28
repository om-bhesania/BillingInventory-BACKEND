"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = generatePublicId;
const crypto_1 = __importDefault(require("crypto"));
function generatePublicId() {
    return crypto_1.default.randomBytes(8).toString("hex"); // 8 bytes → 16 hex chars
}
