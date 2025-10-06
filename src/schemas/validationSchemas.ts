import { z } from 'zod';

// Common validation patterns
const emailSchema = z.string().email('Invalid email address').min(1, 'Email is required');
const phoneSchema = z.string().min(10, 'Phone number must be at least 10 digits').max(15, 'Phone number too long');
const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password too long')
  .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, 
    'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character');

const positiveNumberSchema = z.number().positive('Value must be positive');
const nonNegativeNumberSchema = z.number().min(0, 'Value cannot be negative');
const uuidSchema = z.string().uuid('Invalid UUID format');

// User validation schemas
export const createUserSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name too long'),
  email: emailSchema,
  password: passwordSchema,
  phone: phoneSchema.optional(),
  role: z.enum(['Admin', 'Manager', 'Employee'], {
    errorMap: () => ({ message: 'Role must be Admin, Manager, or Employee' })
  }),
  shopIds: z.array(uuidSchema).optional(),
  isActive: z.boolean().optional().default(true),
  address: z.string().max(500, 'Address too long').optional(),
  publicId: z.string().min(1, 'Public ID is required').optional()
});

export const updateUserSchema = createUserSchema.partial().omit({ password: true });

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required')
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: passwordSchema,
  confirmPassword: z.string().min(1, 'Confirm password is required')
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
});

// Product validation schemas
export const createProductSchema = z.object({
  name: z.string().min(2, 'Product name must be at least 2 characters').max(200, 'Product name too long'),
  sku: z.string().min(1, 'SKU is required').max(50, 'SKU too long'),
  description: z.string().max(1000, 'Description too long').optional(),
  category: z.string().min(1, 'Category is required').max(100, 'Category name too long'),
  unitPrice: positiveNumberSchema,
  minStockLevel: nonNegativeNumberSchema.optional().default(0),
  maxStockLevel: positiveNumberSchema.optional(),
  reorderPoint: nonNegativeNumberSchema.optional().default(0),
  unitOfMeasurement: z.string().min(1, 'Unit of measurement is required').max(20, 'Unit too long'),
  isActive: z.boolean().optional().default(true),
  tags: z.array(z.string().max(50, 'Tag too long')).optional(),
  imageUrl: z.string().url('Invalid image URL').optional(),
  supplier: z.string().max(200, 'Supplier name too long').optional(),
  costPrice: positiveNumberSchema.optional()
}).refine((data) => {
  if (data.maxStockLevel && data.minStockLevel && data.maxStockLevel <= data.minStockLevel) {
    return false;
  }
  return true;
}, {
  message: "Maximum stock level must be greater than minimum stock level",
  path: ["maxStockLevel"]
});

export const updateProductSchema = z.object({
  name: z.string().min(2, 'Product name must be at least 2 characters').max(200, 'Product name too long').optional(),
  sku: z.string().min(1, 'SKU is required').max(50, 'SKU too long').optional(),
  description: z.string().max(1000, 'Description too long').optional(),
  category: z.string().min(1, 'Category is required').max(100, 'Category name too long').optional(),
  unitPrice: positiveNumberSchema.optional(),
  minStockLevel: nonNegativeNumberSchema.optional(),
  maxStockLevel: positiveNumberSchema.optional(),
  reorderPoint: nonNegativeNumberSchema.optional(),
  unitOfMeasurement: z.string().min(1, 'Unit of measurement is required').max(20, 'Unit too long').optional(),
  isActive: z.boolean().optional(),
  tags: z.array(z.string().max(50, 'Tag too long')).optional(),
  imageUrl: z.string().url('Invalid image URL').optional(),
  supplier: z.string().max(200, 'Supplier name too long').optional(),
  costPrice: positiveNumberSchema.optional()
});

// Shop validation schemas
export const createShopSchema = z.object({
  name: z.string().min(2, 'Shop name must be at least 2 characters').max(200, 'Shop name too long'),
  location: z.string().min(5, 'Location must be at least 5 characters').max(500, 'Location too long'),
  description: z.string().max(1000, 'Description too long').optional(),
  contactNumber: phoneSchema,
  email: emailSchema.optional(),
  address: z.string().max(500, 'Address too long').optional(),
  openingTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)').optional(),
  closingTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)').optional(),
  managerId: uuidSchema.optional(),
  isActive: z.boolean().optional().default(true),
  settings: z.record(z.any()).optional()
}).refine((data) => {
  if (data.openingTime && data.closingTime) {
    const opening = new Date(`2000-01-01T${data.openingTime}:00`);
    const closing = new Date(`2000-01-01T${data.closingTime}:00`);
    return opening < closing;
  }
  return true;
}, {
  message: "Opening time must be before closing time",
  path: ["closingTime"]
});

export const updateShopSchema = z.object({
  name: z.string().min(2, 'Shop name must be at least 2 characters').max(200, 'Shop name too long').optional(),
  location: z.string().min(5, 'Location must be at least 5 characters').max(500, 'Location too long').optional(),
  description: z.string().max(1000, 'Description too long').optional(),
  contactNumber: phoneSchema.optional(),
  email: emailSchema.optional(),
  address: z.string().max(500, 'Address too long').optional(),
  openingTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)').optional(),
  closingTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)').optional(),
  managerId: uuidSchema.optional(),
  isActive: z.boolean().optional(),
  settings: z.record(z.any()).optional()
});

// Shop Inventory validation schemas
export const createShopInventorySchema = z.object({
  shopId: uuidSchema,
  productId: uuidSchema,
  currentStock: nonNegativeNumberSchema.default(0),
  minStockPerItem: nonNegativeNumberSchema.optional(),
  lowStockAlertsEnabled: z.boolean().optional().default(true),
  items: z.array(z.object({
    productId: uuidSchema,
    quantity: nonNegativeNumberSchema,
    unitPrice: positiveNumberSchema.optional()
  })).optional()
});

export const updateShopInventorySchema = z.object({
  currentStock: nonNegativeNumberSchema.optional(),
  minStockPerItem: nonNegativeNumberSchema.optional(),
  lowStockAlertsEnabled: z.boolean().optional()
});

// Restock Request validation schemas
export const createRestockRequestSchema = z.object({
  shopId: uuidSchema,
  productId: uuidSchema,
  requestedAmount: positiveNumberSchema,
  priority: z.enum(['Low', 'Medium', 'High', 'Urgent']).optional().default('Medium'),
  reason: z.string().max(500, 'Reason too long').optional(),
  expectedDeliveryDate: z.string().datetime('Invalid date format').optional(),
  notes: z.string().max(1000, 'Notes too long').optional()
});

export const updateRestockRequestSchema = z.object({
  status: z.enum(['Pending', 'Approved', 'Rejected', 'InTransit', 'Delivered', 'Cancelled']),
  approvedAmount: positiveNumberSchema.optional(),
  rejectionReason: z.string().max(500, 'Rejection reason too long').optional(),
  notes: z.string().max(1000, 'Notes too long').optional()
});

// Billing validation schemas
export const createBillingSchema = z.object({
  shopId: uuidSchema,
  customerName: z.string().min(2, 'Customer name must be at least 2 characters').max(200, 'Customer name too long'),
  customerEmail: emailSchema.optional(),
  customerPhone: phoneSchema.optional(),
  items: z.array(z.object({
    productId: uuidSchema,
    productName: z.string().min(1, 'Product name is required'),
    quantity: positiveNumberSchema,
    unitPrice: positiveNumberSchema,
    totalPrice: positiveNumberSchema
  })).min(1, 'At least one item is required'),
  subtotal: positiveNumberSchema,
  taxRate: nonNegativeNumberSchema.max(100, 'Tax rate cannot exceed 100%').optional().default(0),
  taxAmount: nonNegativeNumberSchema.optional().default(0),
  discount: nonNegativeNumberSchema.optional().default(0),
  total: positiveNumberSchema,
  paymentMethod: z.enum(['Cash', 'Card', 'Bank Transfer', 'Other']).optional(),
  paymentStatus: z.enum(['Pending', 'Paid', 'Partially Paid', 'Refunded']).optional().default('Pending'),
  notes: z.string().max(1000, 'Notes too long').optional()
}).refine((data) => {
  const calculatedTotal = data.items.reduce((sum, item) => sum + item.totalPrice, 0);
  const taxAmount = calculatedTotal * (data.taxRate || 0) / 100;
  const finalTotal = calculatedTotal + taxAmount - (data.discount || 0);
  return Math.abs(finalTotal - data.total) < 0.01; // Allow for small floating point differences
}, {
  message: "Total amount calculation is incorrect",
  path: ["total"]
});

export const updateBillingSchema = z.object({
  paymentStatus: z.enum(['Pending', 'Paid', 'Partially Paid', 'Refunded']).optional(),
  paymentMethod: z.enum(['Cash', 'Card', 'Bank Transfer', 'Other']).optional(),
  notes: z.string().max(1000, 'Notes too long').optional()
});

// Category validation schemas
export const createCategorySchema = z.object({
  name: z.string().min(2, 'Category name must be at least 2 characters').max(100, 'Category name too long'),
  description: z.string().max(500, 'Description too long').optional(),
  parentCategoryId: uuidSchema.optional(),
  isActive: z.boolean().optional().default(true),
  sortOrder: nonNegativeNumberSchema.optional().default(0)
});

export const updateCategorySchema = createCategorySchema.partial();

// Employee validation schemas
export const createEmployeeSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name too long'),
  email: emailSchema,
  phone: phoneSchema,
  position: z.string().min(2, 'Position must be at least 2 characters').max(100, 'Position too long'),
  shopId: uuidSchema,
  joinDate: z.string().datetime('Invalid date format').optional(),
  address: z.string().max(500, 'Address too long').optional(),
  salary: positiveNumberSchema.optional(),
  isActive: z.boolean().optional().default(true),
  emergencyContact: z.object({
    name: z.string().min(2, 'Emergency contact name required'),
    phone: phoneSchema,
    relationship: z.string().min(2, 'Relationship required')
  }).optional()
});

export const updateEmployeeSchema = createEmployeeSchema.partial();

// Notification validation schemas
export const createNotificationSchema = z.object({
  userId: uuidSchema,
  type: z.enum(['info', 'warning', 'error', 'success', 'restock', 'low_stock', 'billing', 'system']),
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  message: z.string().min(1, 'Message is required').max(1000, 'Message too long'),
  data: z.record(z.any()).optional(),
  priority: z.enum(['Low', 'Medium', 'High', 'Urgent']).optional().default('Medium'),
  expiresAt: z.string().datetime('Invalid date format').optional()
});

// Search validation schemas
export const searchSchema = z.object({
  query: z.string().min(1, 'Search query is required').max(200, 'Search query too long'),
  type: z.enum(['all', 'products', 'shops', 'employees', 'billings', 'inventory']).optional().default('all'),
  limit: z.number().min(1).max(100).optional().default(20),
  offset: z.number().min(0).optional().default(0)
});

// Pagination validation schemas
export const paginationSchema = z.object({
  page: z.number().min(1).optional().default(1),
  limit: z.number().min(1).max(100).optional().default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc')
});

// File upload validation schemas
export const fileUploadSchema = z.object({
  fieldname: z.string(),
  originalname: z.string(),
  encoding: z.string(),
  mimetype: z.string(),
  size: z.number().max(10 * 1024 * 1024, 'File size cannot exceed 10MB'), // 10MB limit
  destination: z.string().optional(),
  filename: z.string().optional(),
  path: z.string().optional()
});

// Email validation schemas
export const sendEmailSchema = z.object({
  to: z.union([emailSchema, z.array(emailSchema)]),
  subject: z.string().min(1, 'Subject is required').max(200, 'Subject too long'),
  text: z.string().min(1, 'Text content is required'),
  html: z.string().optional(),
  attachments: z.array(z.object({
    filename: z.string(),
    content: z.string(),
    contentType: z.string().optional()
  })).optional()
});

// Audit log validation schemas
export const auditLogQuerySchema = z.object({
  userId: uuidSchema.optional(),
  action: z.string().optional(),
  resource: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  ...paginationSchema.shape
});

// Database backup validation schemas
export const backupSchema = z.object({
  includeData: z.boolean().optional().default(true),
  includeSchema: z.boolean().optional().default(true),
  compression: z.boolean().optional().default(true),
  tables: z.array(z.string()).optional()
});

// Cache management validation schemas
export const cacheOperationSchema = z.object({
  key: z.string().min(1, 'Cache key is required'),
  value: z.any().optional(),
  ttl: z.number().min(0).optional(), // Time to live in seconds
  operation: z.enum(['get', 'set', 'delete', 'exists', 'expire']).optional().default('get')
});

// System health validation schemas
export const systemHealthQuerySchema = z.object({
  includeMetrics: z.boolean().optional().default(true),
  includeDatabase: z.boolean().optional().default(true),
  includeCache: z.boolean().optional().default(true),
  includeSystem: z.boolean().optional().default(true)
});

// Export validation middleware
export const validateRequest = (schema: z.ZodSchema) => {
  return (req: any, res: any, next: any) => {
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

// Export query validation middleware
export const validateQuery = (schema: z.ZodSchema) => {
  return (req: any, res: any, next: any) => {
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

// Export params validation middleware
export const validateParams = (schema: z.ZodSchema) => {
  return (req: any, res: any, next: any) => {
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
