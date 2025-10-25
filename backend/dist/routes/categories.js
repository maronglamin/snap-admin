"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
router.get('/', auth_1.authenticate, async (req, res) => {
    try {
        const { page = 1, limit = 10, search = '', isActive = 'all', parentId = 'all', } = req.query;
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;
        const where = {};
        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { slug: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
            ];
        }
        if (isActive && isActive !== 'all') {
            where.isActive = isActive === 'true';
        }
        if (parentId && parentId !== 'all') {
            if (parentId === 'null') {
                where.parentId = null;
            }
            else {
                where.parentId = parentId;
            }
        }
        const total = await prisma.category.count({ where });
        const totalPages = Math.ceil(total / limitNum);
        const categories = await prisma.category.findMany({
            where,
            include: {
                parent: {
                    select: {
                        id: true,
                        name: true,
                        slug: true,
                    }
                },
                children: {
                    select: {
                        id: true,
                        name: true,
                        slug: true,
                        isActive: true,
                    }
                },
                _count: {
                    select: {
                        products: true,
                        children: true,
                    }
                }
            },
            orderBy: [
                { order: 'asc' },
                { name: 'asc' }
            ],
            skip,
            take: limitNum,
        });
        res.json({
            success: true,
            data: categories,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                totalPages,
                hasNext: pageNum < totalPages,
                hasPrev: pageNum > 1,
            },
        });
    }
    catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).json({
            success: false,
            error: 'Server error',
        });
    }
});
router.get('/:id', auth_1.authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const category = await prisma.category.findUnique({
            where: { id },
            include: {
                parent: {
                    select: {
                        id: true,
                        name: true,
                        slug: true,
                        description: true,
                    }
                },
                children: {
                    select: {
                        id: true,
                        name: true,
                        slug: true,
                        description: true,
                        isActive: true,
                        order: true,
                    },
                    orderBy: [
                        { order: 'asc' },
                        { name: 'asc' }
                    ]
                },
                products: {
                    select: {
                        id: true,
                        title: true,
                        status: true,
                        price: true,
                        currencyCode: true,
                    },
                    take: 10,
                    orderBy: { createdAt: 'desc' }
                },
                _count: {
                    select: {
                        products: true,
                        children: true,
                    }
                }
            },
        });
        if (!category) {
            return res.status(404).json({
                success: false,
                error: 'Category not found',
            });
        }
        res.json({
            success: true,
            data: category,
        });
    }
    catch (error) {
        console.error('Error fetching category:', error);
        res.status(500).json({
            success: false,
            error: 'Server error',
        });
    }
});
router.post('/', auth_1.authenticate, async (req, res) => {
    try {
        const { name, slug, description, imageUrl, order = 0, isActive = true, parentId, } = req.body;
        if (!name || !slug) {
            return res.status(400).json({
                success: false,
                error: 'Name and slug are required',
            });
        }
        const existingCategory = await prisma.category.findUnique({
            where: { slug },
        });
        if (existingCategory) {
            return res.status(400).json({
                success: false,
                error: 'Slug must be unique',
            });
        }
        if (parentId) {
            const parentCategory = await prisma.category.findUnique({
                where: { id: parentId },
            });
            if (!parentCategory) {
                return res.status(400).json({
                    success: false,
                    error: 'Parent category not found',
                });
            }
        }
        const category = await prisma.category.create({
            data: {
                name,
                slug,
                description,
                imageUrl,
                order: parseInt(order) || 0,
                isActive: Boolean(isActive),
                parentId: parentId || null,
                createdBy: req.user.username,
            },
            include: {
                parent: {
                    select: {
                        id: true,
                        name: true,
                        slug: true,
                    }
                },
                children: {
                    select: {
                        id: true,
                        name: true,
                        slug: true,
                    }
                },
                _count: {
                    select: {
                        products: true,
                        children: true,
                    }
                }
            },
        });
        res.status(201).json({
            success: true,
            data: category,
            message: 'Category created successfully',
        });
    }
    catch (error) {
        console.error('Error creating category:', error);
        res.status(500).json({
            success: false,
            error: 'Server error',
        });
    }
});
router.put('/:id', auth_1.authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, slug, description, imageUrl, order, isActive, parentId, } = req.body;
        const existingCategory = await prisma.category.findUnique({
            where: { id },
        });
        if (!existingCategory) {
            return res.status(404).json({
                success: false,
                error: 'Category not found',
            });
        }
        if (slug && slug !== existingCategory.slug) {
            const slugExists = await prisma.category.findUnique({
                where: { slug },
            });
            if (slugExists) {
                return res.status(400).json({
                    success: false,
                    error: 'Slug must be unique',
                });
            }
        }
        if (parentId && parentId !== existingCategory.parentId) {
            if (parentId === 'null') {
            }
            else {
                const parentCategory = await prisma.category.findUnique({
                    where: { id: parentId },
                });
                if (!parentCategory) {
                    return res.status(400).json({
                        success: false,
                        error: 'Parent category not found',
                    });
                }
                if (parentId === id) {
                    return res.status(400).json({
                        success: false,
                        error: 'Category cannot be its own parent',
                    });
                }
            }
        }
        const category = await prisma.category.update({
            where: { id },
            data: {
                ...(name && { name }),
                ...(slug && { slug }),
                ...(description !== undefined && { description }),
                ...(imageUrl !== undefined && { imageUrl }),
                ...(order !== undefined && { order: parseInt(order) || 0 }),
                ...(isActive !== undefined && { isActive: Boolean(isActive) }),
                ...(parentId !== undefined && { parentId: parentId === 'null' ? null : parentId }),
                updatedAt: new Date(),
            },
            include: {
                parent: {
                    select: {
                        id: true,
                        name: true,
                        slug: true,
                    }
                },
                children: {
                    select: {
                        id: true,
                        name: true,
                        slug: true,
                    }
                },
                _count: {
                    select: {
                        products: true,
                        children: true,
                    }
                }
            },
        });
        res.json({
            success: true,
            data: category,
            message: 'Category updated successfully',
        });
    }
    catch (error) {
        console.error('Error updating category:', error);
        res.status(500).json({
            success: false,
            error: 'Server error',
        });
    }
});
router.delete('/:id', auth_1.authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const category = await prisma.category.findUnique({
            where: { id },
            include: {
                _count: {
                    select: {
                        products: true,
                        children: true,
                    }
                }
            },
        });
        if (!category) {
            return res.status(404).json({
                success: false,
                error: 'Category not found',
            });
        }
        if (category._count.products > 0) {
            return res.status(400).json({
                success: false,
                error: 'Cannot delete category with associated products',
            });
        }
        if (category._count.children > 0) {
            return res.status(400).json({
                success: false,
                error: 'Cannot delete category with subcategories. Please move or delete subcategories first.',
            });
        }
        await prisma.category.delete({
            where: { id },
        });
        res.json({
            success: true,
            message: 'Category deleted successfully',
        });
    }
    catch (error) {
        console.error('Error deleting category:', error);
        res.status(500).json({
            success: false,
            error: 'Server error',
        });
    }
});
router.get('/tree', auth_1.authenticate, async (req, res) => {
    try {
        const categories = await prisma.category.findMany({
            where: {
                isActive: true,
            },
            include: {
                children: {
                    where: {
                        isActive: true,
                    },
                    include: {
                        children: {
                            where: {
                                isActive: true,
                            },
                        },
                    },
                    orderBy: [
                        { order: 'asc' },
                        { name: 'asc' }
                    ],
                },
                _count: {
                    select: {
                        products: true,
                    }
                }
            },
            orderBy: [
                { order: 'asc' },
                { name: 'asc' }
            ],
        });
        const rootCategories = categories.filter(category => !category.parentId);
        res.json({
            success: true,
            data: rootCategories,
        });
    }
    catch (error) {
        console.error('Error fetching category tree:', error);
        res.status(500).json({
            success: false,
            error: 'Server error',
        });
    }
});
exports.default = router;
//# sourceMappingURL=categories.js.map