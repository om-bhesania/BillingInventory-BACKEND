import { Router } from "express";
import { RequestHandler } from "express";
import {
  globalSearch,
  getSearchSuggestions,
  getSearchStats
} from "../controllers/searchController";
import { authenticateToken } from "../middlewares/auth";
import { userRateLimiter } from "../middlewares/rateLimiter";

const searchRoutes = Router();

// Apply authentication and rate limiting to all search routes
searchRoutes.use(authenticateToken as any);
searchRoutes.use(userRateLimiter);

/**
 * @swagger
 * tags:
 *   name: Search
 *   description: Global search endpoints (token required)
 */

/**
 * @swagger
 * /api/search:
 *   get:
 *     summary: Global search across all modules
 *     description: Search across products, shops, employees, inventory, billing, and more
 *     tags: [Search]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: query
 *         required: true
 *         schema:
 *           type: string
 *         description: Search query (minimum 2 characters)
 *       - in: query
 *         name: modules
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *             enum: [products, shops, employees, inventory, billing, restock, categories, flavors]
 *         description: Specific modules to search in (optional)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Maximum number of results to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Number of results to skip for pagination
 *       - in: query
 *         name: includeInactive
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Include inactive/inactive items in search
 *     responses:
 *       200:
 *         description: Search results retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 query:
 *                   type: string
 *                 totalResults:
 *                   type: integer
 *                 results:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       type:
 *                         type: string
 *                       id:
 *                         type: string
 *                       title:
 *                         type: string
 *                       description:
 *                         type: string
 *                       url:
 *                         type: string
 *                       relevanceScore:
 *                         type: number
 *                       metadata:
 *                         type: object
 *                 groupedResults:
 *                   type: object
 *                   additionalProperties:
 *                     type: array
 *                     items:
 *                       type: object
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     limit:
 *                       type: integer
 *                     offset:
 *                       type: integer
 *                     hasMore:
 *                       type: boolean
 *       400:
 *         description: Bad request - invalid query
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
searchRoutes.get("/", globalSearch as RequestHandler);

/**
 * @swagger
 * /api/search/suggestions:
 *   get:
 *     summary: Get search suggestions
 *     description: Get autocomplete suggestions based on partial query
 *     tags: [Search]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: query
 *         required: true
 *         schema:
 *           type: string
 *         description: Partial search query
 *     responses:
 *       200:
 *         description: Search suggestions retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 suggestions:
 *                   type: array
 *                   items:
 *                     type: string
 *       400:
 *         description: Bad request - query too short
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
searchRoutes.get("/suggestions", getSearchSuggestions as RequestHandler);

/**
 * @swagger
 * /api/search/stats:
 *   get:
 *     summary: Get search statistics
 *     description: Get counts of searchable items by module
 *     tags: [Search]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Search statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 products:
 *                   type: integer
 *                 shops:
 *                   type: integer
 *                 employees:
 *                   type: integer
 *                 inventory:
 *                   type: integer
 *                 billing:
 *                   type: integer
 *                 categories:
 *                   type: integer
 *                 flavors:
 *                   type: integer
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
searchRoutes.get("/stats", getSearchStats as RequestHandler);

export default searchRoutes;
