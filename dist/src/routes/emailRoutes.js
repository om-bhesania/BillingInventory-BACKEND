"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const emailController_1 = require("../controllers/emailController");
const auth_1 = require("../middlewares/auth");
const rateLimiter_1 = require("../middlewares/rateLimiter");
const emailRoutes = (0, express_1.Router)();
// Apply authentication and rate limiting to all email routes
emailRoutes.use(auth_1.authenticateToken);
emailRoutes.use(rateLimiter_1.userRateLimiter);
/**
 * @swagger
 * tags:
 *   name: Email
 *   description: Email notification endpoints (token required)
 */
/**
 * @swagger
 * /api/email/low-stock-alert:
 *   post:
 *     summary: Send low stock alert email
 *     description: Send email notification for low stock alerts
 *     tags: [Email]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - productId
 *               - shopId
 *               - currentStock
 *               - minStock
 *             properties:
 *               productId:
 *                 type: string
 *                 description: Product ID
 *               shopId:
 *                 type: string
 *                 description: Shop ID
 *               currentStock:
 *                 type: number
 *                 description: Current stock level
 *               minStock:
 *                 type: number
 *                 description: Minimum stock level
 *     responses:
 *       200:
 *         description: Low stock alert email sent successfully
 *       404:
 *         description: Product, shop, or manager not found
 *       500:
 *         description: Failed to send email
 */
emailRoutes.post("/low-stock-alert", emailController_1.sendLowStockAlert);
/**
 * @swagger
 * /api/email/employee-created:
 *   post:
 *     summary: Send employee created email
 *     description: Send welcome email to newly created employee
 *     tags: [Email]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - employeeId
 *               - password
 *             properties:
 *               employeeId:
 *                 type: string
 *                 description: Employee ID
 *               password:
 *                 type: string
 *                 description: Temporary password
 *     responses:
 *       200:
 *         description: Employee created email sent successfully
 *       404:
 *         description: Employee not found
 *       500:
 *         description: Failed to send email
 */
emailRoutes.post("/employee-created", emailController_1.sendEmployeeCreatedEmail);
/**
 * @swagger
 * /api/email/restock-request:
 *   post:
 *     summary: Send restock request email
 *     description: Send email notification for restock requests to admins
 *     tags: [Email]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - requestId
 *             properties:
 *               requestId:
 *                 type: string
 *                 description: Restock request ID
 *     responses:
 *       200:
 *         description: Restock request email sent successfully
 *       404:
 *         description: Request or admin not found
 *       500:
 *         description: Failed to send email
 */
emailRoutes.post("/restock-request", emailController_1.sendRestockRequestEmail);
/**
 * @swagger
 * /api/email/invoice-generated:
 *   post:
 *     summary: Send invoice generated email
 *     description: Send email notification when invoice is generated
 *     tags: [Email]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - invoiceId
 *               - customerEmail
 *             properties:
 *               invoiceId:
 *                 type: string
 *                 description: Invoice ID
 *               customerEmail:
 *                 type: string
 *                 format: email
 *                 description: Customer email address
 *     responses:
 *       200:
 *         description: Invoice generated email sent successfully
 *       404:
 *         description: Invoice not found
 *       500:
 *         description: Failed to send email
 */
emailRoutes.post("/invoice-generated", emailController_1.sendInvoiceGeneratedEmail);
/**
 * @swagger
 * /api/email/system-notification:
 *   post:
 *     summary: Send system notification email
 *     description: Send system notification email to specified recipients
 *     tags: [Email]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - message
 *               - recipients
 *             properties:
 *               title:
 *                 type: string
 *                 description: Notification title
 *               message:
 *                 type: string
 *                 description: Notification message
 *               recipients:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: email
 *                 description: List of recipient email addresses
 *               actionUrl:
 *                 type: string
 *                 description: Optional action URL
 *     responses:
 *       200:
 *         description: System notification email sent successfully
 *       400:
 *         description: Bad request - missing required fields
 *       500:
 *         description: Failed to send email
 */
emailRoutes.post("/system-notification", emailController_1.sendSystemNotificationEmail);
/**
 * @swagger
 * /api/email/test:
 *   post:
 *     summary: Test email configuration
 *     description: Send test email to verify email configuration
 *     tags: [Email]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - testEmail
 *             properties:
 *               testEmail:
 *                 type: string
 *                 format: email
 *                 description: Test email address
 *     responses:
 *       200:
 *         description: Test email sent successfully
 *       400:
 *         description: Bad request - test email required
 *       500:
 *         description: Failed to send test email
 */
emailRoutes.post("/test", emailController_1.testEmailConfiguration);
/**
 * @swagger
 * /api/email/templates:
 *   get:
 *     summary: Get email templates
 *     description: Get available email templates
 *     tags: [Email]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Email templates retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 lowStockAlert:
 *                   type: object
 *                   properties:
 *                     subject:
 *                       type: string
 *                     html:
 *                       type: string
 *                     text:
 *                       type: string
 *                 employeeCreated:
 *                   type: object
 *                   properties:
 *                     subject:
 *                       type: string
 *                     html:
 *                       type: string
 *                     text:
 *                       type: string
 *                 restockRequest:
 *                   type: object
 *                   properties:
 *                     subject:
 *                       type: string
 *                     html:
 *                       type: string
 *                     text:
 *                       type: string
 *                 invoiceGenerated:
 *                   type: object
 *                   properties:
 *                     subject:
 *                       type: string
 *                     html:
 *                       type: string
 *                     text:
 *                       type: string
 *                 systemNotification:
 *                   type: object
 *                   properties:
 *                     subject:
 *                       type: string
 *                     html:
 *                       type: string
 *                     text:
 *                       type: string
 *       500:
 *         description: Failed to get email templates
 */
emailRoutes.get("/templates", emailController_1.getEmailTemplates);
exports.default = emailRoutes;
