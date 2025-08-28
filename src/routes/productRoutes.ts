import express, { RequestHandler } from "express";
import { authenticateToken } from "../middlewares/auth";
import { userRateLimiter } from "../middlewares/rateLimiter";
import {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  getProductsByFlavor,
  getLowStockProducts,
  getProductBySku,
} from "../controllers/Products/ProductsController";

const productRoutes = express.Router();

// Apply authentication middleware to all product routes
productRoutes.use(authenticateToken as any);

// Apply rate limiting to all product routes
productRoutes.use(userRateLimiter);

/**
 * @swagger
 * tags:
 *   name: Products
 *   description: Product inventory management endpoints (token required)
 */

/**
 * @swagger
 * /api/products/get-products:
 *   get:
 *     summary: Get all products
 *     description: Retrieve list of all products with category and flavour information
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *     responses:
 *       200:
 *         description: List of products retrieved successfully
 *       401:
 *         description: Unauthorized
 */
productRoutes.get("/get-products", getProducts as RequestHandler);

/**
 * @swagger
 * /api/products/{id}:
 *   get:
 *     summary: Get product by ID
 *     description: Retrieve a specific product by its ID with category and flavour details
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Product ID
 *     responses:
 *       200:
 *         description: Product retrieved successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Product not found
 */
productRoutes.get("/:id", getProductById as RequestHandler);

/**
 * @swagger
 * /api/products/sku/{sku}:
 *   get:
 *     summary: Get product by SKU
 *     description: Retrieve a specific product by its SKU with category and flavour details
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sku
 *         required: true
 *         schema:
 *           type: string
 *         description: Product SKU
 *     responses:
 *       200:
 *         description: Product retrieved successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Product not found
 */
productRoutes.get("/sku/:sku", getProductBySku as RequestHandler);

// Protected routes that require authentication

/**
 * @swagger
 * /api/products/add-products:
 *   post:
 *     summary: Create a new product
 *     description: Create a new product in the inventory (Admin only)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - sku
 *               - name
 *               - categoryId
 *               - quantityInLiters
 *               - unitSize
 *               - unitMeasurement
 *               - unitPrice
 *               - totalStock
 *               - flavorId
 *             properties:
 *               sku:
 *                 type: string
 *                 description: Product SKU (unique identifier)
 *               name:
 *                 type: string
 *                 description: Product name
 *               description:
 *                 type: string
 *                 description: Product description
 *               categoryId:
 *                 type: string
 *                 description: Category ID
 *               packagingType:
 *                 type: string
 *                 description: Type of packaging
 *               quantityInLiters:
 *                 type: number
 *                 description: Quantity in liters
 *               unitSize:
 *                 type: number
 *                 description: Size of individual unit
 *               unitMeasurement:
 *                 type: string
 *                 description: Unit of measurement
 *               unitPrice:
 *                 type: number
 *                 description: Price per unit
 *               totalStock:
 *                 type: integer
 *                 description: Total available stock
 *               minStockLevel:
 *                 type: integer
 *                 description: Minimum stock level for alerts
 *               barcode:
 *                 type: string
 *                 description: Product barcode
 *               imageUrl:
 *                 type: string
 *                 description: URL to product image
 *               flavorId:
 *                 type: string
 *                 description: Flavour ID
 *     responses:
 *       201:
 *         description: Product created successfully
 *       400:
 *         description: Bad request - validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       409:
 *         description: SKU already exists
 */
productRoutes.post("/add-products", createProduct as RequestHandler);

/**
 * @swagger
 * /api/products/{id}:
 *   put:
 *     summary: Update product by ID
 *     description: Update an existing product's details (Admin only)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Product ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               sku:
 *                 type: string
 *                 description: Product SKU
 *               name:
 *                 type: string
 *                 description: Product name
 *               description:
 *                 type: string
 *                 description: Product description
 *               categoryId:
 *                 type: string
 *                 description: Category ID
 *               packagingType:
 *                 type: string
 *                 description: Type of packaging
 *               quantityInLiters:
 *                 type: number
 *                 description: Quantity in liters
 *               unitSize:
 *                 type: number
 *                 description: Size of individual unit
 *               unitMeasurement:
 *                 type: string
 *                 description: Unit of measurement
 *               unitPrice:
 *                 type: number
 *                 description: Price per unit
 *               totalStock:
 *                 type: integer
 *                 description: Total available stock
 *               minStockLevel:
 *                 type: integer
 *                 description: Minimum stock level for alerts
 *               barcode:
 *                 type: string
 *                 description: Product barcode
 *               imageUrl:
 *                 type: string
 *                 description: URL to product image
 *               flavorId:
 *                 type: string
 *                 description: Flavour ID
 *               isActive:
 *                 type: boolean
 *                 description: Whether the product is active
 *     responses:
 *       200:
 *         description: Product updated successfully
 *       400:
 *         description: Bad request - validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       404:
 *         description: Product not found
 */
productRoutes.put("/:id", updateProduct as RequestHandler);

/**
 * @swagger
 * /api/products/{id}:
 *   delete:
 *     summary: Delete product by ID
 *     description: Soft delete a product (Admin only)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Product ID
 *     responses:
 *       200:
 *         description: Product deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       404:
 *         description: Product not found
 */
productRoutes.delete("/:id", deleteProduct as RequestHandler);

/**
 * @swagger
 * /api/products/flavor/{flavorId}:
 *   get:
 *     summary: Get products by flavor
 *     description: Retrieve all products for a specific flavor
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: flavorId
 *         required: true
 *         schema:
 *           type: string
 *         description: Flavor ID
 *     responses:
 *       200:
 *         description: Products retrieved successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Flavor not found
 */
productRoutes.get("/flavor/:flavorId", getProductsByFlavor as RequestHandler);

/**
 * @swagger
 * /api/products/low-stock:
 *   get:
 *     summary: Get low stock products
 *     description: Retrieve all products that are below their minimum stock level
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Low stock products retrieved successfully
 *       401:
 *         description: Unauthorized
 */
productRoutes.get("/low-stock", getLowStockProducts as RequestHandler);

export default productRoutes;
