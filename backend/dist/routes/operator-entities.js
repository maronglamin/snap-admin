"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const express_validator_1 = require("express-validator");
const client_1 = require("@prisma/client");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
const prisma = new client_1.PrismaClient();
router.get('/', auth_1.authenticate, async (req, res) => {
    try {
        const entities = await prisma.operatorEntity.findMany({
            include: {
                role: {
                    select: {
                        id: true,
                        name: true,
                        description: true,
                    }
                },
                admins: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        username: true,
                        isActive: true,
                        lastLogin: true,
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        const transformedEntities = entities.map(entity => ({
            id: entity.id,
            name: entity.name,
            description: entity.description,
            roleId: entity.roleId,
            roleName: entity.role.name,
            isActive: entity.isActive,
            createdAt: entity.createdAt,
            updatedAt: entity.updatedAt,
            assignedUsers: entity.admins.length,
            users: entity.admins,
        }));
        res.json({
            success: true,
            data: transformedEntities,
        });
    }
    catch (error) {
        console.error('Get operator entities error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error',
        });
    }
});
router.post('/', [
    auth_1.authenticate,
    (0, express_validator_1.body)('name').notEmpty().withMessage('Entity name is required'),
    (0, express_validator_1.body)('description').optional(),
    (0, express_validator_1.body)('roleId').notEmpty().withMessage('Role ID is required'),
], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                error: errors.array()[0].msg,
            });
        }
        const { name, description, roleId } = req.body;
        const role = await prisma.role.findUnique({
            where: { id: roleId }
        });
        if (!role) {
            return res.status(400).json({
                success: false,
                error: 'Role not found',
            });
        }
        const entity = await prisma.operatorEntity.create({
            data: {
                name,
                description,
                roleId,
                isActive: true,
            },
            include: {
                role: {
                    select: {
                        id: true,
                        name: true,
                        description: true,
                    }
                }
            }
        });
        res.status(201).json({
            success: true,
            data: {
                id: entity.id,
                name: entity.name,
                description: entity.description,
                roleId: entity.roleId,
                roleName: entity.role.name,
                isActive: entity.isActive,
                createdAt: entity.createdAt,
                updatedAt: entity.updatedAt,
                assignedUsers: 0,
                users: [],
            },
            message: 'Operator entity created successfully',
        });
    }
    catch (error) {
        console.error('Create operator entity error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error',
        });
    }
});
router.put('/:id', [
    auth_1.authenticate,
    (0, express_validator_1.body)('name').notEmpty().withMessage('Entity name is required'),
    (0, express_validator_1.body)('description').optional(),
    (0, express_validator_1.body)('roleId').notEmpty().withMessage('Role ID is required'),
], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                error: errors.array()[0].msg,
            });
        }
        const { id } = req.params;
        const { name, description, roleId } = req.body;
        const existingEntity = await prisma.operatorEntity.findUnique({
            where: { id }
        });
        if (!existingEntity) {
            return res.status(404).json({
                success: false,
                error: 'Operator entity not found',
            });
        }
        const role = await prisma.role.findUnique({
            where: { id: roleId }
        });
        if (!role) {
            return res.status(400).json({
                success: false,
                error: 'Role not found',
            });
        }
        const updatedEntity = await prisma.operatorEntity.update({
            where: { id },
            data: {
                name,
                description,
                roleId,
            },
            include: {
                role: {
                    select: {
                        id: true,
                        name: true,
                        description: true,
                    }
                },
                admins: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        username: true,
                        isActive: true,
                        lastLogin: true,
                    }
                }
            }
        });
        res.json({
            success: true,
            data: {
                id: updatedEntity.id,
                name: updatedEntity.name,
                description: updatedEntity.description,
                roleId: updatedEntity.roleId,
                roleName: updatedEntity.role.name,
                isActive: updatedEntity.isActive,
                createdAt: updatedEntity.createdAt,
                updatedAt: updatedEntity.updatedAt,
                assignedUsers: updatedEntity.admins.length,
                users: updatedEntity.admins,
            },
            message: 'Operator entity updated successfully',
        });
    }
    catch (error) {
        console.error('Update operator entity error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error',
        });
    }
});
router.delete('/:id', auth_1.authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const entity = await prisma.operatorEntity.findUnique({
            where: { id },
            include: {
                admins: true
            }
        });
        if (!entity) {
            return res.status(404).json({
                success: false,
                error: 'Operator entity not found',
            });
        }
        if (entity.admins.length > 0) {
            return res.status(400).json({
                success: false,
                error: 'Cannot delete entity that has assigned users',
            });
        }
        await prisma.operatorEntity.delete({
            where: { id }
        });
        res.json({
            success: true,
            message: 'Operator entity deleted successfully',
        });
    }
    catch (error) {
        console.error('Delete operator entity error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error',
        });
    }
});
router.get('/roles', auth_1.authenticate, async (req, res) => {
    try {
        const roles = await prisma.role.findMany({
            where: { isActive: true },
            select: {
                id: true,
                name: true,
                description: true,
            },
            orderBy: { name: 'asc' }
        });
        res.json({
            success: true,
            data: roles,
        });
    }
    catch (error) {
        console.error('Get roles error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error',
        });
    }
});
exports.default = router;
//# sourceMappingURL=operator-entities.js.map