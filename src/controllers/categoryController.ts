import { Request, Response } from 'express';
import { prisma } from '../config/client';

export const createCategory = async (req: Request, res: Response) => {
    try {
        const { name, description } = req.body;
        const category = await prisma.category.create({
            data: {
                name,
                description,
            },
        });
        res.status(201).json(category);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create category' });
    }
};

export const getCategories = async (req: Request, res: Response) => {
    try {
        const categories = await prisma.category.findMany({
            where: {
                isActive: true,
            },
        });
        res.json(categories);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch categories' });
    }
};

export const getCategoryById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const category = await prisma.category.findUnique({
            where: { id },
            include: {
                products: true,
            },
        });
        if (!category) {
            return res.status(404).json({ error: 'Category not found' });
        }
        res.json(category);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch category' });
    }
};

export const updateCategory = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { name, description, isActive } = req.body;
        const category = await prisma.category.update({
            where: { id },
            data: {
                name,
                description,
                isActive,
            },
        });
        res.json(category);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update category' });
    }
};

export const deleteCategory = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        await prisma.category.update({
            where: { id },
            data: {
                isActive: false,
            },
        });
        res.json({ message: 'Category deactivated successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete category' });
    }
}; 