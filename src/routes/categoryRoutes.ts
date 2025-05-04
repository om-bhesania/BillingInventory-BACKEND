import express from 'express';
import {
    createCategory,
    getCategories,
    getCategoryById,
    updateCategory,
    deleteCategory,
} from '../controllers/categoryController';

const router = express.Router();

// Create a new category
router.post('/', createCategory);

// Get all categories
router.get('/', getCategories);

// Get a single category by ID
// router.get('/:id', getCategoryById);

// Update a category
router.put('/:id', updateCategory);

// Delete a category (soft delete)
router.delete('/:id', deleteCategory);

export default router; 