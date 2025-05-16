import express, { RequestHandler } from "express";
import {
  createProduct,
  deleteProduct,
  getLowStockProducts,
  getProductById,
  getProductBySku,
  getProducts,
  hardDeleteProduct,
  updateProduct,
  updateProductStock,
} from "../controllers/Products/ProductsController";

const productRoutes = express.Router();

/**
 * @swagger
 * tags:
 *   - name: Products
 *     description: API endpoints for managing products
 */

/**
 * Products Routes
 * @swagger
 * /api/products:
 *   get:
 *     summary: Get all products
 *     parameters:
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *     tags:
 *       - Products
 */
productRoutes.get("/get-products", getProducts as RequestHandler);

/**
 * @swagger
 * /api/products/{id}:
 *   get:
 *     summary: Get a product by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Product ID
 *     tags:
 *       - Products
 */
productRoutes.get("/:id", getProductById as RequestHandler);

/**
 * @swagger
 * /api/products/sku/{sku}:
 *   get:
 *     summary: Get a product by SKU
 *     parameters:
 *       - in: path
 *         name: sku
 *         required: true
 *         schema:
 *           type: string
 *         description: Product SKU
 *     tags:
 *       - Products
 */
productRoutes.get("/sku/:sku", getProductBySku as RequestHandler);

/**
 * @swagger
 * /api/products/low-stock:
 *   get:
 *     summary: Get products with stock below minimum level
 *     tags:
 *       - Products
 */
productRoutes.get("/low-stock", getLowStockProducts as RequestHandler);

// Protected routes that require authentication

/**
 * @swagger
 * /api/products:
 *   post:
 *     summary: Create a new product
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
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               categoryId:
 *                 type: string
 *               packagingType:
 *                 type: string
 *               quantityInLiters:
 *                 type: number
 *               unitSize:
 *                 type: number
 *               unitMeasurement:
 *                 type: string
 *               unitPrice:
 *                 type: number
 *               totalStock:
 *                 type: integer
 *               minStockLevel:
 *                 type: integer
 *               barcode:
 *                 type: string
 *               imageUrl:
 *                 type: string
 *               flavorId:
 *                 type: string
 *     tags:
 *       - Products
 */
productRoutes.post("/add-products", createProduct as RequestHandler);

/**
 * @swagger
 * /api/products/update-product/{id}:
 *   put:
 *     summary: Update a product
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Product ID
 *     tags:
 *       - Products
 */
productRoutes.put("/:id", updateProduct as RequestHandler);

/**
 * @swagger
 * /api/products/{id}/stock:
 *   patch:
 *     summary: Update product stock quantity
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
 *             required:
 *               - totalStock
 *             properties:
 *               totalStock:
 *                 type: integer
 *                 minimum: 0
 *     tags:
 *       - Products
 */
productRoutes.patch("/:id/stock", updateProductStock as RequestHandler);

/**
 * @swagger
 * /api/products/{id}:
 *   delete:
 *     summary: Deactivate a product (soft delete)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Product ID
 *     tags:
 *       - Products
 */
productRoutes.delete("/:id", deleteProduct as RequestHandler);

/**
 * @swagger
 * /api/products/{id}/permanent:
 *   delete:
 *     summary: Permanently delete a product
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Product ID
 *     tags:
 *       - Products
 */
// Add a leading slash here 👇
productRoutes.delete(
  "/delete/:id/permanent",
  hardDeleteProduct as RequestHandler
);

export default productRoutes;
