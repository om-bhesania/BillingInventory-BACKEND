"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = errorHandler;
exports.createError = createError;
exports.asyncHandler = asyncHandler;
const client_1 = require("@prisma/client");
const logger_1 = require("../../utils/logger");
function errorHandler(error, req, res, next) {
    logger_1.logger.error('API Error:', error);
    if (error instanceof client_1.Prisma.PrismaClientKnownRequestError) {
        // Handle Prisma errors
        switch (error.code) {
            case 'P2002':
                return res.status(409).json({
                    message: 'A record with this value already exists.',
                    code: error.code,
                    field: error.meta?.target?.[0]
                });
            case 'P2014':
                return res.status(404).json({
                    message: 'The required record was not found.',
                    code: error.code
                });
            case 'P2003':
                return res.status(400).json({
                    message: 'Invalid input data.',
                    code: error.code,
                    field: error.meta?.field_name
                });
            default:
                return res.status(500).json({
                    message: 'Database error occurred.',
                    code: error.code
                });
        }
    }
    if (error instanceof client_1.Prisma.PrismaClientValidationError) {
        return res.status(400).json({
            message: 'Invalid input data.',
            error: error.message
        });
    }
    if (error.status) {
        return res.status(error.status).json({
            message: error.message,
            code: error.code
        });
    }
    // Default error
    return res.status(500).json({
        message: 'Internal server error.',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
}
/**
 * Create a typed error with status code
 */
function createError(message, status, code) {
    const error = new Error(message);
    error.status = status;
    error.code = code;
    return error;
}
/**
 * Wrap async route handlers to catch errors
 */
function asyncHandler(handler) {
    return async (req, res, next) => {
        try {
            await handler(req, res, next);
        }
        catch (error) {
            next(error);
        }
    };
}
