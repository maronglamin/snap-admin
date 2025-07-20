"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
router.get('/', auth_1.authenticate, async (req, res) => {
    try {
        const { page = 1, limit = 10, search = '', serviceType = 'all', isActive = 'all' } = req.query;
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;
        const where = {};
        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
            ];
        }
        if (serviceType !== 'all') {
            where.serviceType = serviceType;
        }
        if (isActive !== 'all') {
            where.isActive = isActive === 'true';
        }
        const total = await prisma.uCP.count({ where });
        const totalPages = Math.ceil(total / limitNum);
        const ucpGroups = await prisma.uCP.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip,
            take: limitNum,
        });
        res.json({
            success: true,
            data: ucpGroups,
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
        console.error('Get UCP groups error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error',
        });
    }
});
router.post('/', auth_1.authenticate, async (req, res) => {
    try {
        const { name, value, description, serviceType, isActive, metadata } = req.body;
        if (!name || value === undefined) {
            return res.status(400).json({
                success: false,
                error: 'Name and value are required',
            });
        }
        if (metadata && typeof metadata === 'object') {
            const allowedFields = ['feeType', 'gateway', 'currency', 'minAmount', 'maxAmount'];
            const metadataFields = Object.keys(metadata);
            const invalidFields = metadataFields.filter(field => !allowedFields.includes(field));
            if (invalidFields.length > 0) {
                return res.status(400).json({
                    success: false,
                    error: `Invalid metadata fields: ${invalidFields.join(', ')}. Allowed fields: ${allowedFields.join(', ')}`,
                });
            }
        }
        const existingUcp = await prisma.uCP.findUnique({
            where: { name },
        });
        if (existingUcp) {
            return res.status(400).json({
                success: false,
                error: 'A settlement group with this name already exists',
            });
        }
        const newUcp = await prisma.uCP.create({
            data: {
                name,
                value: parseFloat(value),
                description,
                serviceType,
                isActive: isActive !== undefined ? isActive : true,
                metadata: metadata || null,
            },
        });
        res.status(201).json({
            success: true,
            data: newUcp,
            message: 'Settlement group created successfully',
        });
    }
    catch (error) {
        console.error('Create UCP error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error',
        });
    }
});
router.put('/:id', auth_1.authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, value, description, serviceType, isActive, metadata } = req.body;
        const existingUcp = await prisma.uCP.findUnique({
            where: { id },
        });
        if (!existingUcp) {
            return res.status(404).json({
                success: false,
                error: 'Settlement group not found',
            });
        }
        if (name && name !== existingUcp.name) {
            const nameExists = await prisma.uCP.findUnique({
                where: { name },
            });
            if (nameExists) {
                return res.status(400).json({
                    success: false,
                    error: 'A settlement group with this name already exists',
                });
            }
        }
        if (metadata && typeof metadata === 'object') {
            const allowedFields = ['feeType', 'gateway', 'currency', 'minAmount', 'maxAmount'];
            const metadataFields = Object.keys(metadata);
            const invalidFields = metadataFields.filter(field => !allowedFields.includes(field));
            if (invalidFields.length > 0) {
                return res.status(400).json({
                    success: false,
                    error: `Invalid metadata fields: ${invalidFields.join(', ')}. Allowed fields: ${allowedFields.join(', ')}`,
                });
            }
        }
        const updateData = {};
        if (name !== undefined)
            updateData.name = name;
        if (value !== undefined)
            updateData.value = parseFloat(value);
        if (description !== undefined)
            updateData.description = description;
        if (serviceType !== undefined)
            updateData.serviceType = serviceType;
        if (isActive !== undefined)
            updateData.isActive = isActive;
        if (metadata !== undefined)
            updateData.metadata = metadata || null;
        const updatedUcp = await prisma.uCP.update({
            where: { id },
            data: updateData,
        });
        res.json({
            success: true,
            data: updatedUcp,
            message: 'Settlement group updated successfully',
        });
    }
    catch (error) {
        console.error('Update UCP error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error',
        });
    }
});
router.delete('/:id', auth_1.authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const existingUcp = await prisma.uCP.findUnique({
            where: { id },
        });
        if (!existingUcp) {
            return res.status(404).json({
                success: false,
                error: 'Settlement group not found',
            });
        }
        await prisma.uCP.delete({
            where: { id },
        });
        res.json({
            success: true,
            message: 'Settlement group deleted successfully',
        });
    }
    catch (error) {
        console.error('Delete UCP error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error',
        });
    }
});
router.get('/:id', auth_1.authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const ucp = await prisma.uCP.findUnique({
            where: { id },
        });
        if (!ucp) {
            return res.status(404).json({
                success: false,
                error: 'Settlement group not found',
            });
        }
        res.json({
            success: true,
            data: ucp,
        });
    }
    catch (error) {
        console.error('Get UCP by ID error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error',
        });
    }
});
exports.default = router;
//# sourceMappingURL=ucp.js.map