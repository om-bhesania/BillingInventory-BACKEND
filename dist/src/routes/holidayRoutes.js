"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const holidayController_1 = require("../controllers/holidayController");
const VerifyJWT_1 = __importDefault(require("../middlewares/VerifyJWT"));
const router = (0, express_1.Router)();
// Apply JWT verification to all routes
router.use(VerifyJWT_1.default);
/**
 * @swagger
 * tags:
 *   name: Holidays
 *   description: Holiday management endpoints
 */
/**
 * @swagger
 * /api/holidays:
 *   get:
 *     summary: Get holidays for a user/shop
 *     tags: [Holidays]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: year
 *         schema:
 *           type: integer
 *         description: Year to get holidays for (defaults to current year)
 *       - in: query
 *         name: shopId
 *         schema:
 *           type: string
 *         description: Shop ID to filter holidays (Admin only)
 *     responses:
 *       200:
 *         description: Holidays retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Internal server error
 */
router.get('/', holidayController_1.HolidayController.getHolidays);
/**
 * @swagger
 * /api/holidays:
 *   post:
 *     summary: Create a new holiday
 *     tags: [Holidays]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - date
 *             properties:
 *               name:
 *                 type: string
 *                 description: Name of the holiday
 *               date:
 *                 type: string
 *                 format: date
 *                 description: Date of the holiday
 *               type:
 *                 type: string
 *                 enum: [HOLIDAY, SPECIAL_EVENT, MAINTENANCE]
 *                 default: HOLIDAY
 *                 description: Type of holiday
 *               shopId:
 *                 type: string
 *                 description: Shop ID (optional, for shop-specific holidays)
 *               description:
 *                 type: string
 *                 description: Optional description
 *     responses:
 *       201:
 *         description: Holiday created successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Internal server error
 */
router.post('/', holidayController_1.HolidayController.createHoliday);
/**
 * @swagger
 * /api/holidays/{id}:
 *   put:
 *     summary: Update a holiday
 *     tags: [Holidays]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Holiday ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: Name of the holiday
 *               date:
 *                 type: string
 *                 format: date
 *                 description: Date of the holiday
 *               type:
 *                 type: string
 *                 enum: [HOLIDAY, SPECIAL_EVENT, MAINTENANCE]
 *                 description: Type of holiday
 *               description:
 *                 type: string
 *                 description: Optional description
 *     responses:
 *       200:
 *         description: Holiday updated successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Holiday not found
 *       500:
 *         description: Internal server error
 */
router.put('/:id', holidayController_1.HolidayController.updateHoliday);
/**
 * @swagger
 * /api/holidays/{id}:
 *   delete:
 *     summary: Delete a holiday
 *     tags: [Holidays]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Holiday ID
 *     responses:
 *       200:
 *         description: Holiday deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Holiday not found
 *       500:
 *         description: Internal server error
 */
router.delete('/:id', holidayController_1.HolidayController.deleteHoliday);
/**
 * @swagger
 * /api/holidays/stats:
 *   get:
 *     summary: Get holiday statistics
 *     tags: [Holidays]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: year
 *         schema:
 *           type: integer
 *         description: Year to get statistics for (defaults to current year)
 *     responses:
 *       200:
 *         description: Holiday statistics retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Internal server error
 */
router.get('/stats', holidayController_1.HolidayController.getHolidayStats);
exports.default = router;
