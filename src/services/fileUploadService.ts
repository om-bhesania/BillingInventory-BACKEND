import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), 'uploads', 'receipts');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req: any, file: any, cb: any) => {
    cb(null, uploadsDir);
  },
  filename: (req: any, file: any, cb: any) => {
    const uniqueName = `${uuidv4()}-${Date.now()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

// File filter for allowed types
const fileFilter = (req: any, file: any, cb: any) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
  const maxSize = 5 * 1024 * 1024; // 5MB

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPG, PNG, and PDF files are allowed.'));
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 1 // Only one file at a time
  }
});

// Middleware for handling file upload errors
export const handleUploadError = (error: any, req: any, res: any, next: any) => {
  if (error instanceof multer.MulterError) {
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

  logger.error('File upload error:', error);
  res.status(500).json({
    success: false,
    error: 'File upload failed'
  });
};

// Function to delete file
export const deleteFile = (filename: string): Promise<boolean> => {
  return new Promise((resolve) => {
    const filePath = path.join(uploadsDir, filename);
    fs.unlink(filePath, (err) => {
      if (err) {
        logger.error('Error deleting file:', err);
        resolve(false);
      } else {
        logger.info('File deleted successfully:', filename);
        resolve(true);
      }
    });
  });
};

// Function to get file path
export const getFilePath = (filename: string): string => {
  return path.join(uploadsDir, filename);
};

// Function to check if file exists
export const fileExists = (filename: string): boolean => {
  const filePath = path.join(uploadsDir, filename);
  return fs.existsSync(filePath);
};

// Function to get file stats
export const getFileStats = (filename: string) => {
  const filePath = path.join(uploadsDir, filename);
  try {
    const stats = fs.statSync(filePath);
    return {
      size: stats.size,
      created: stats.birthtime,
      modified: stats.mtime
    };
  } catch (error) {
    logger.error('Error getting file stats:', error);
    return null;
  }
};
