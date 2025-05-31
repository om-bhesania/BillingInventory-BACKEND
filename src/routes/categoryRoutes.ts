import express from 'express';
import {
    createCategory,
    getCategories,
    getCategoryById,
    updateCategory,
    deleteCategory,
} from '../controllers/categoryController'; 
import { authMiddleware } from '../middlewares/AuthMiddleware';
import { userDataFilter } from '../middlewares/filterDataHanlder';

const router = express.Router(); 
// Create a new category
router.post('/',authMiddleware, createCategory);

// Get all categories
router.get("/", userDataFilter, authMiddleware, getCategories);

// Get a single category by ID
// router.get('/:id', getCategoryById);

// Update a category
router.put("/:id", authMiddleware, updateCategory);

// Delete a category (soft delete)
router.delete("/:id", authMiddleware, deleteCategory);

export default router; 