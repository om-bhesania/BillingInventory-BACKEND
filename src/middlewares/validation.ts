import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

// Validation middleware factory
export const validateRequest = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedData = schema.parse(req.body);
      req.body = validatedData;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Validation failed',
          details: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
            code: err.code
          }))
        });
      }
      return res.status(500).json({ error: 'Internal server error' });
    }
  };
};

// Query validation middleware
export const validateQuery = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedData = schema.parse(req.query);
      req.query = validatedData;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Query validation failed',
          details: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
            code: err.code
          }))
        });
      }
      return res.status(500).json({ error: 'Internal server error' });
    }
  };
};

// Params validation middleware
export const validateParams = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedData = schema.parse(req.params);
      req.params = validatedData;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Parameter validation failed',
          details: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
            code: err.code
          }))
        });
      }
      return res.status(500).json({ error: 'Internal server error' });
    }
  };
};

// File upload validation middleware
export const validateFileUpload = (options: {
  maxSize?: number;
  allowedTypes?: string[];
  required?: boolean;
}) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { maxSize = 10 * 1024 * 1024, allowedTypes = [], required = false } = options;
    
    // Type assertion for multer file properties
    const multerReq = req as any;
    
    if (required && (!multerReq.file && !multerReq.files)) {
      return res.status(400).json({
        error: 'File upload required',
        details: [{ field: 'file', message: 'File is required', code: 'required' }]
      });
    }

    if (multerReq.file) {
      const file = multerReq.file;
      
      if (file.size > maxSize) {
        return res.status(400).json({
          error: 'File too large',
          details: [{ field: 'file', message: `File size cannot exceed ${maxSize / 1024 / 1024}MB`, code: 'too_large' }]
        });
      }

      if (allowedTypes.length > 0 && !allowedTypes.includes(file.mimetype)) {
        return res.status(400).json({
          error: 'Invalid file type',
          details: [{ field: 'file', message: `File type must be one of: ${allowedTypes.join(', ')}`, code: 'invalid_type' }]
        });
      }
    }

    if (multerReq.files && Array.isArray(multerReq.files)) {
      for (const file of multerReq.files) {
        if (file.size > maxSize) {
          return res.status(400).json({
            error: 'File too large',
            details: [{ field: 'files', message: `File ${file.originalname} size cannot exceed ${maxSize / 1024 / 1024}MB`, code: 'too_large' }]
          });
        }

        if (allowedTypes.length > 0 && !allowedTypes.includes(file.mimetype)) {
          return res.status(400).json({
            error: 'Invalid file type',
            details: [{ field: 'files', message: `File ${file.originalname} type must be one of: ${allowedTypes.join(', ')}`, code: 'invalid_type' }]
          });
        }
      }
    }

    next();
  };
};

// Sanitization middleware
export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
  const sanitizeString = (str: string): string => {
    return str
      .trim()
      .replace(/[<>]/g, '') // Remove potential HTML tags
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+=/gi, ''); // Remove event handlers
  };

  const sanitizeObject = (obj: any): any => {
    if (typeof obj === 'string') {
      return sanitizeString(obj);
    }
    if (typeof obj === 'object' && obj !== null) {
      if (Array.isArray(obj)) {
        return obj.map(sanitizeObject);
      }
      const sanitized: any = {};
      for (const key in obj) {
        sanitized[key] = sanitizeObject(obj[key]);
      }
      return sanitized;
    }
    return obj;
  };

  if (req.body) {
    req.body = sanitizeObject(req.body);
  }

  if (req.query) {
    req.query = sanitizeObject(req.query);
  }

  if (req.params) {
    req.params = sanitizeObject(req.params);
  }

  next();
};

// Rate limiting validation
export const validateRateLimit = (req: Request, res: Response, next: NextFunction) => {
  const rateLimitInfo = (req as any).rateLimit;
  
  if (rateLimitInfo && rateLimitInfo.remaining === 0) {
    return res.status(429).json({
      error: 'Too many requests',
      details: [{
        field: 'rate_limit',
        message: `Rate limit exceeded. Try again in ${Math.ceil(rateLimitInfo.resetTime / 1000)} seconds`,
        code: 'rate_limit_exceeded'
      }]
    });
  }

  next();
};

// Content type validation
export const validateContentType = (allowedTypes: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const contentType = req.get('Content-Type');
    
    if (!contentType) {
      return res.status(400).json({
        error: 'Content-Type header required',
        details: [{ field: 'content_type', message: 'Content-Type header is required', code: 'missing' }]
      });
    }

    const isValidType = allowedTypes.some(type => contentType.includes(type));
    
    if (!isValidType) {
      return res.status(400).json({
        error: 'Invalid content type',
        details: [{ field: 'content_type', message: `Content-Type must be one of: ${allowedTypes.join(', ')}`, code: 'invalid' }]
      });
    }

    next();
  };
};

// Request size validation
export const validateRequestSize = (maxSize: number) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const contentLength = parseInt(req.get('Content-Length') || '0');
    
    if (contentLength > maxSize) {
      return res.status(413).json({
        error: 'Request too large',
        details: [{ field: 'content_length', message: `Request size cannot exceed ${maxSize / 1024 / 1024}MB`, code: 'too_large' }]
      });
    }

    next();
  };
};
