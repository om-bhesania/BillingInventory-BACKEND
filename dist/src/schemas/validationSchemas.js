"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateParams = exports.validateQuery = exports.validateRequest = exports.systemHealthQuerySchema = exports.cacheOperationSchema = exports.backupSchema = exports.auditLogQuerySchema = exports.sendEmailSchema = exports.fileUploadSchema = exports.paginationSchema = exports.searchSchema = exports.createNotificationSchema = exports.updateEmployeeSchema = exports.createEmployeeSchema = exports.updateCategorySchema = exports.createCategorySchema = exports.updateBillingSchema = exports.createBillingSchema = exports.updateRestockRequestSchema = exports.createRestockRequestSchema = exports.updateShopInventorySchema = exports.createShopInventorySchema = exports.updateShopSchema = exports.createShopSchema = exports.updateProductSchema = exports.createProductSchema = exports.changePasswordSchema = exports.loginSchema = exports.updateUserSchema = exports.createUserSchema = void 0;
const zod_1 = require("zod");
// Common validation patterns
const emailSchema = zod_1.z.string().email('Invalid email address').min(1, 'Email is required');
const phoneSchema = zod_1.z.string().min(10, 'Phone number must be at least 10 digits').max(15, 'Phone number too long');
const passwordSchema = zod_1.z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password too long')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character');
const positiveNumberSchema = zod_1.z.number().positive('Value must be positive');
const nonNegativeNumberSchema = zod_1.z.number().min(0, 'Value cannot be negative');
const uuidSchema = zod_1.z.string().uuid('Invalid UUID format');
// User validation schemas
exports.createUserSchema = zod_1.z.object({
    name: zod_1.z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name too long'),
    email: emailSchema,
    password: passwordSchema,
    phone: phoneSchema.optional(),
    role: zod_1.z.enum(['Admin', 'Manager', 'Employee'], {
        errorMap: () => ({ message: 'Role must be Admin, Manager, or Employee' })
    }),
    shopIds: zod_1.z.array(uuidSchema).optional(),
    isActive: zod_1.z.boolean().optional().default(true),
    address: zod_1.z.string().max(500, 'Address too long').optional(),
    publicId: zod_1.z.string().min(1, 'Public ID is required').optional()
});
exports.updateUserSchema = exports.createUserSchema.partial().omit({ password: true });
exports.loginSchema = zod_1.z.object({
    email: emailSchema,
    password: zod_1.z.string().min(1, 'Password is required')
});
exports.changePasswordSchema = zod_1.z.object({
    currentPassword: zod_1.z.string().min(1, 'Current password is required'),
    newPassword: passwordSchema,
    confirmPassword: zod_1.z.string().min(1, 'Confirm password is required')
}).refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"]
});
// Product validation schemas
exports.createProductSchema = zod_1.z.object({
    name: zod_1.z.string().min(2, 'Product name must be at least 2 characters').max(200, 'Product name too long'),
    sku: zod_1.z.string().min(1, 'SKU is required').max(50, 'SKU too long'),
    description: zod_1.z.string().max(1000, 'Description too long').optional(),
    category: zod_1.z.string().min(1, 'Category is required').max(100, 'Category name too long'),
    unitPrice: positiveNumberSchema,
    minStockLevel: nonNegativeNumberSchema.optional().default(0),
    maxStockLevel: positiveNumberSchema.optional(),
    reorderPoint: nonNegativeNumberSchema.optional().default(0),
    unitOfMeasurement: zod_1.z.string().min(1, 'Unit of measurement is required').max(20, 'Unit too long'),
    isActive: zod_1.z.boolean().optional().default(true),
    tags: zod_1.z.array(zod_1.z.string().max(50, 'Tag too long')).optional(),
    imageUrl: zod_1.z.string().url('Invalid image URL').optional(),
    supplier: zod_1.z.string().max(200, 'Supplier name too long').optional(),
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
exports.updateProductSchema = zod_1.z.object({
    name: zod_1.z.string().min(2, 'Product name must be at least 2 characters').max(200, 'Product name too long').optional(),
    sku: zod_1.z.string().min(1, 'SKU is required').max(50, 'SKU too long').optional(),
    description: zod_1.z.string().max(1000, 'Description too long').optional(),
    category: zod_1.z.string().min(1, 'Category is required').max(100, 'Category name too long').optional(),
    unitPrice: positiveNumberSchema.optional(),
    minStockLevel: nonNegativeNumberSchema.optional(),
    maxStockLevel: positiveNumberSchema.optional(),
    reorderPoint: nonNegativeNumberSchema.optional(),
    unitOfMeasurement: zod_1.z.string().min(1, 'Unit of measurement is required').max(20, 'Unit too long').optional(),
    isActive: zod_1.z.boolean().optional(),
    tags: zod_1.z.array(zod_1.z.string().max(50, 'Tag too long')).optional(),
    imageUrl: zod_1.z.string().url('Invalid image URL').optional(),
    supplier: zod_1.z.string().max(200, 'Supplier name too long').optional(),
    costPrice: positiveNumberSchema.optional()
});
// Shop validation schemas
exports.createShopSchema = zod_1.z.object({
    name: zod_1.z.string().min(2, 'Shop name must be at least 2 characters').max(200, 'Shop name too long'),
    location: zod_1.z.string().min(5, 'Location must be at least 5 characters').max(500, 'Location too long'),
    description: zod_1.z.string().max(1000, 'Description too long').optional(),
    contactNumber: phoneSchema,
    email: emailSchema.optional(),
    address: zod_1.z.string().max(500, 'Address too long').optional(),
    openingTime: zod_1.z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)').optional(),
    closingTime: zod_1.z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)').optional(),
    managerId: uuidSchema.optional(),
    isActive: zod_1.z.boolean().optional().default(true),
    settings: zod_1.z.record(zod_1.z.any()).optional()
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
exports.updateShopSchema = zod_1.z.object({
    name: zod_1.z.string().min(2, 'Shop name must be at least 2 characters').max(200, 'Shop name too long').optional(),
    location: zod_1.z.string().min(5, 'Location must be at least 5 characters').max(500, 'Location too long').optional(),
    description: zod_1.z.string().max(1000, 'Description too long').optional(),
    contactNumber: phoneSchema.optional(),
    email: emailSchema.optional(),
    address: zod_1.z.string().max(500, 'Address too long').optional(),
    openingTime: zod_1.z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)').optional(),
    closingTime: zod_1.z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)').optional(),
    managerId: uuidSchema.optional(),
    isActive: zod_1.z.boolean().optional(),
    settings: zod_1.z.record(zod_1.z.any()).optional()
});
// Shop Inventory validation schemas
exports.createShopInventorySchema = zod_1.z.object({
    shopId: uuidSchema,
    productId: uuidSchema,
    currentStock: nonNegativeNumberSchema.default(0),
    minStockPerItem: nonNegativeNumberSchema.optional(),
    lowStockAlertsEnabled: zod_1.z.boolean().optional().default(true),
    items: zod_1.z.array(zod_1.z.object({
        productId: uuidSchema,
        quantity: nonNegativeNumberSchema,
        unitPrice: positiveNumberSchema.optional()
    })).optional()
});
exports.updateShopInventorySchema = zod_1.z.object({
    currentStock: nonNegativeNumberSchema.optional(),
    minStockPerItem: nonNegativeNumberSchema.optional(),
    lowStockAlertsEnabled: zod_1.z.boolean().optional()
});
// Restock Request validation schemas
exports.createRestockRequestSchema = zod_1.z.object({
    shopId: uuidSchema,
    productId: uuidSchema,
    requestedAmount: positiveNumberSchema,
    priority: zod_1.z.enum(['Low', 'Medium', 'High', 'Urgent']).optional().default('Medium'),
    reason: zod_1.z.string().max(500, 'Reason too long').optional(),
    expectedDeliveryDate: zod_1.z.string().datetime('Invalid date format').optional(),
    notes: zod_1.z.string().max(1000, 'Notes too long').optional()
});
exports.updateRestockRequestSchema = zod_1.z.object({
    status: zod_1.z.enum(['Pending', 'Approved', 'Rejected', 'InTransit', 'Delivered', 'Cancelled']),
    approvedAmount: positiveNumberSchema.optional(),
    rejectionReason: zod_1.z.string().max(500, 'Rejection reason too long').optional(),
    notes: zod_1.z.string().max(1000, 'Notes too long').optional()
});
// Billing validation schemas
exports.createBillingSchema = zod_1.z.object({
    shopId: uuidSchema,
    customerName: zod_1.z.string().min(2, 'Customer name must be at least 2 characters').max(200, 'Customer name too long'),
    customerEmail: emailSchema.optional(),
    customerPhone: phoneSchema.optional(),
    items: zod_1.z.array(zod_1.z.object({
        productId: uuidSchema,
        productName: zod_1.z.string().min(1, 'Product name is required'),
        quantity: positiveNumberSchema,
        unitPrice: positiveNumberSchema,
        totalPrice: positiveNumberSchema
    })).min(1, 'At least one item is required'),
    subtotal: positiveNumberSchema,
    taxRate: nonNegativeNumberSchema.max(100, 'Tax rate cannot exceed 100%').optional().default(0),
    taxAmount: nonNegativeNumberSchema.optional().default(0),
    discount: nonNegativeNumberSchema.optional().default(0),
    total: positiveNumberSchema,
    paymentMethod: zod_1.z.enum(['Cash', 'Card', 'Bank Transfer', 'Other']).optional(),
    paymentStatus: zod_1.z.enum(['Pending', 'Paid', 'Partially Paid', 'Refunded']).optional().default('Pending'),
    notes: zod_1.z.string().max(1000, 'Notes too long').optional()
}).refine((data) => {
    const calculatedTotal = data.items.reduce((sum, item) => sum + item.totalPrice, 0);
    const taxAmount = calculatedTotal * (data.taxRate || 0) / 100;
    const finalTotal = calculatedTotal + taxAmount - (data.discount || 0);
    return Math.abs(finalTotal - data.total) < 0.01; // Allow for small floating point differences
}, {
    message: "Total amount calculation is incorrect",
    path: ["total"]
});
exports.updateBillingSchema = zod_1.z.object({
    paymentStatus: zod_1.z.enum(['Pending', 'Paid', 'Partially Paid', 'Refunded']).optional(),
    paymentMethod: zod_1.z.enum(['Cash', 'Card', 'Bank Transfer', 'Other']).optional(),
    notes: zod_1.z.string().max(1000, 'Notes too long').optional()
});
// Category validation schemas
exports.createCategorySchema = zod_1.z.object({
    name: zod_1.z.string().min(2, 'Category name must be at least 2 characters').max(100, 'Category name too long'),
    description: zod_1.z.string().max(500, 'Description too long').optional(),
    parentCategoryId: uuidSchema.optional(),
    isActive: zod_1.z.boolean().optional().default(true),
    sortOrder: nonNegativeNumberSchema.optional().default(0)
});
exports.updateCategorySchema = exports.createCategorySchema.partial();
// Employee validation schemas
exports.createEmployeeSchema = zod_1.z.object({
    name: zod_1.z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name too long'),
    email: emailSchema,
    phone: phoneSchema,
    position: zod_1.z.string().min(2, 'Position must be at least 2 characters').max(100, 'Position too long'),
    shopId: uuidSchema,
    joinDate: zod_1.z.string().datetime('Invalid date format').optional(),
    address: zod_1.z.string().max(500, 'Address too long').optional(),
    salary: positiveNumberSchema.optional(),
    isActive: zod_1.z.boolean().optional().default(true),
    emergencyContact: zod_1.z.object({
        name: zod_1.z.string().min(2, 'Emergency contact name required'),
        phone: phoneSchema,
        relationship: zod_1.z.string().min(2, 'Relationship required')
    }).optional()
});
exports.updateEmployeeSchema = exports.createEmployeeSchema.partial();
// Notification validation schemas
exports.createNotificationSchema = zod_1.z.object({
    userId: uuidSchema,
    type: zod_1.z.enum(['info', 'warning', 'error', 'success', 'restock', 'low_stock', 'billing', 'system']),
    title: zod_1.z.string().min(1, 'Title is required').max(200, 'Title too long'),
    message: zod_1.z.string().min(1, 'Message is required').max(1000, 'Message too long'),
    data: zod_1.z.record(zod_1.z.any()).optional(),
    priority: zod_1.z.enum(['Low', 'Medium', 'High', 'Urgent']).optional().default('Medium'),
    expiresAt: zod_1.z.string().datetime('Invalid date format').optional()
});
// Search validation schemas
exports.searchSchema = zod_1.z.object({
    query: zod_1.z.string().min(1, 'Search query is required').max(200, 'Search query too long'),
    type: zod_1.z.enum(['all', 'products', 'shops', 'employees', 'billings', 'inventory']).optional().default('all'),
    limit: zod_1.z.number().min(1).max(100).optional().default(20),
    offset: zod_1.z.number().min(0).optional().default(0)
});
// Pagination validation schemas
exports.paginationSchema = zod_1.z.object({
    page: zod_1.z.number().min(1).optional().default(1),
    limit: zod_1.z.number().min(1).max(100).optional().default(20),
    sortBy: zod_1.z.string().optional(),
    sortOrder: zod_1.z.enum(['asc', 'desc']).optional().default('desc')
});
// File upload validation schemas
exports.fileUploadSchema = zod_1.z.object({
    fieldname: zod_1.z.string(),
    originalname: zod_1.z.string(),
    encoding: zod_1.z.string(),
    mimetype: zod_1.z.string(),
    size: zod_1.z.number().max(10 * 1024 * 1024, 'File size cannot exceed 10MB'), // 10MB limit
    destination: zod_1.z.string().optional(),
    filename: zod_1.z.string().optional(),
    path: zod_1.z.string().optional()
});
// Email validation schemas
exports.sendEmailSchema = zod_1.z.object({
    to: zod_1.z.union([emailSchema, zod_1.z.array(emailSchema)]),
    subject: zod_1.z.string().min(1, 'Subject is required').max(200, 'Subject too long'),
    text: zod_1.z.string().min(1, 'Text content is required'),
    html: zod_1.z.string().optional(),
    attachments: zod_1.z.array(zod_1.z.object({
        filename: zod_1.z.string(),
        content: zod_1.z.string(),
        contentType: zod_1.z.string().optional()
    })).optional()
});
// Audit log validation schemas
exports.auditLogQuerySchema = zod_1.z.object({
    userId: uuidSchema.optional(),
    action: zod_1.z.string().optional(),
    resource: zod_1.z.string().optional(),
    startDate: zod_1.z.string().datetime().optional(),
    endDate: zod_1.z.string().datetime().optional(),
    ...exports.paginationSchema.shape
});
// Database backup validation schemas
exports.backupSchema = zod_1.z.object({
    includeData: zod_1.z.boolean().optional().default(true),
    includeSchema: zod_1.z.boolean().optional().default(true),
    compression: zod_1.z.boolean().optional().default(true),
    tables: zod_1.z.array(zod_1.z.string()).optional()
});
// Cache management validation schemas
exports.cacheOperationSchema = zod_1.z.object({
    key: zod_1.z.string().min(1, 'Cache key is required'),
    value: zod_1.z.any().optional(),
    ttl: zod_1.z.number().min(0).optional(), // Time to live in seconds
    operation: zod_1.z.enum(['get', 'set', 'delete', 'exists', 'expire']).optional().default('get')
});
// System health validation schemas
exports.systemHealthQuerySchema = zod_1.z.object({
    includeMetrics: zod_1.z.boolean().optional().default(true),
    includeDatabase: zod_1.z.boolean().optional().default(true),
    includeCache: zod_1.z.boolean().optional().default(true),
    includeSystem: zod_1.z.boolean().optional().default(true)
});
// Export validation middleware
const validateRequest = (schema) => {
    return (req, res, next) => {
        try {
            const validatedData = schema.parse(req.body);
            req.body = validatedData;
            next();
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
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
exports.validateRequest = validateRequest;
// Export query validation middleware
const validateQuery = (schema) => {
    return (req, res, next) => {
        try {
            const validatedData = schema.parse(req.query);
            req.query = validatedData;
            next();
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
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
exports.validateQuery = validateQuery;
// Export params validation middleware
const validateParams = (schema) => {
    return (req, res, next) => {
        try {
            const validatedData = schema.parse(req.params);
            req.params = validatedData;
            next();
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
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
exports.validateParams = validateParams;
