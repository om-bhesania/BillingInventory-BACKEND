"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFileStats = exports.fileExists = exports.getFilePath = exports.deleteFile = exports.handleUploadError = exports.upload = void 0;
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const uuid_1 = require("uuid");
const logger_1 = require("../utils/logger");
// Ensure uploads directory exists
const uploadsDir = path_1.default.join(process.cwd(), 'uploads', 'receipts');
if (!fs_1.default.existsSync(uploadsDir)) {
    fs_1.default.mkdirSync(uploadsDir, { recursive: true });
}
// Configure multer for file uploads
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        const uniqueName = `${(0, uuid_1.v4)()}-${Date.now()}${path_1.default.extname(file.originalname)}`;
        cb(null, uniqueName);
    }
});
// File filter for allowed types
const fileFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    }
    else {
        cb(new Error('Invalid file type. Only JPG, PNG, and PDF files are allowed.'));
    }
};
exports.upload = (0, multer_1.default)({
    storage,
    fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
        files: 1 // Only one file at a time
    }
});
// Middleware for handling file upload errors
const handleUploadError = (error, req, res, next) => {
    if (error instanceof multer_1.default.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                error: 'File too large. Maximum size is 5MB.'
            });
        }
        if (error.code === 'LIMIT_FILE_COUNT') {
            return res.status(400).json({
                success: false,
                error: 'Too many files. Only one file allowed.'
            });
        }
    }
    if (error.message.includes('Invalid file type')) {
        return res.status(400).json({
            success: false,
            error: error.message
        });
    }
    logger_1.logger.error('File upload error:', error);
    res.status(500).json({
        success: false,
        error: 'File upload failed'
    });
};
exports.handleUploadError = handleUploadError;
// Function to delete file
const deleteFile = (filename) => {
    return new Promise((resolve) => {
        const filePath = path_1.default.join(uploadsDir, filename);
        fs_1.default.unlink(filePath, (err) => {
            if (err) {
                logger_1.logger.error('Error deleting file:', err);
                resolve(false);
            }
            else {
                logger_1.logger.info('File deleted successfully:', filename);
                resolve(true);
            }
        });
    });
};
exports.deleteFile = deleteFile;
// Function to get file path
const getFilePath = (filename) => {
    return path_1.default.join(uploadsDir, filename);
};
exports.getFilePath = getFilePath;
// Function to check if file exists
const fileExists = (filename) => {
    const filePath = path_1.default.join(uploadsDir, filename);
    return fs_1.default.existsSync(filePath);
};
exports.fileExists = fileExists;
// Function to get file stats
const getFileStats = (filename) => {
    const filePath = path_1.default.join(uploadsDir, filename);
    try {
        const stats = fs_1.default.statSync(filePath);
        return {
            size: stats.size,
            created: stats.birthtime,
            modified: stats.mtime
        };
    }
    catch (error) {
        logger_1.logger.error('Error getting file stats:', error);
        return null;
    }
};
exports.getFileStats = getFileStats;
