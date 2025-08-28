"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sanitizeString = sanitizeString;
function sanitizeString(str) {
    return str.replace(/\0/g, ""); // remove null bytes
}
