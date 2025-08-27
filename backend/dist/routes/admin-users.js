"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const express_validator_1 = require("express-validator");
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
const prisma = new client_1.PrismaClient();
router.get('/', auth_1.authenticate, async (req, res) => {
    try {
        const admins = await prisma.admin.findMany({
            include: {
                operatorEntity: {
                    include: {
                        role: {
                            select: {
                                id: true,
                                name: true,
                                description: true,
                            }
                        }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        const transformedAdmins = admins.map(admin => ({
            id: admin.id,
            email: admin.email,
            username: admin.username,
            name: admin.name,
            isActive: admin.isActive,
            lastLogin: admin.lastLogin,
            createdAt: admin.createdAt,
            updatedAt: admin.updatedAt,
            createdBy: admin.createdBy,
            operatorEntityId: admin.operatorEntityId,
            operatorEntityName: admin.operatorEntity.name,
            roleName: admin.operatorEntity.role.name,
        }));
        res.json({
            success: true,
            data: transformedAdmins,
        });
    }
    catch (error) {
        console.error('Get admin users error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error',
        });
    }
});
router.post('/', [
    auth_1.authenticate,
    (0, express_validator_1.body)('email').isEmail().withMessage('Please provide a valid email'),
    (0, express_validator_1.body)('username').notEmpty().withMessage('Username is required'),
    (0, express_validator_1.body)('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    (0, express_validator_1.body)('name').notEmpty().withMessage('Name is required'),
    (0, express_validator_1.body)('operatorEntityId').notEmpty().withMessage('Operator entity is required'),
], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                error: errors.array()[0].msg,
            });
        }
        const { email, username, password, name, operatorEntityId } = req.body;
        const existingEmail = await prisma.admin.findUnique({
            where: { email }
        });
        if (existingEmail) {
            return res.status(400).json({
                success: false,
                error: 'Email already exists',
            });
        }
        const existingUsername = await prisma.admin.findUnique({
            where: { username }
        });
        if (existingUsername) {
            return res.status(400).json({
                success: false,
                error: 'Username already exists',
            });
        }
        const entity = await prisma.operatorEntity.findUnique({
            where: { id: operatorEntityId },
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
        if (!entity) {
            return res.status(400).json({
                success: false,
                error: 'Operator entity not found',
            });
        }
        const hashedPassword = await bcryptjs_1.default.hash(password, 12);
        const admin = await prisma.admin.create({
            data: {
                email,
                username,
                password: hashedPassword,
                name,
                isActive: true,
                operatorEntityId,
                createdBy: req.user.username,
            },
            include: {
                operatorEntity: {
                    include: {
                        role: {
                            select: {
                                id: true,
                                name: true,
                                description: true,
                            }
                        }
                    }
                }
            }
        });
        res.status(201).json({
            success: true,
            data: {
                id: admin.id,
                email: admin.email,
                username: admin.username,
                name: admin.name,
                isActive: admin.isActive,
                lastLogin: admin.lastLogin,
                createdAt: admin.createdAt,
                updatedAt: admin.updatedAt,
                createdBy: admin.createdBy,
                operatorEntityId: admin.operatorEntityId,
                operatorEntityName: admin.operatorEntity.name,
                roleName: admin.operatorEntity.role.name,
            },
            message: 'Admin user created successfully',
        });
    }
    catch (error) {
        console.error('Create admin user error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error',
        });
    }
});
router.put('/:id', [
    auth_1.authenticate,
    (0, express_validator_1.body)('email').isEmail().withMessage('Please provide a valid email'),
    (0, express_validator_1.body)('username').notEmpty().withMessage('Username is required'),
    (0, express_validator_1.body)('name').notEmpty().withMessage('Name is required'),
    (0, express_validator_1.body)('operatorEntityId').notEmpty().withMessage('Operator entity is required'),
    (0, express_validator_1.body)('isActive').isBoolean().withMessage('isActive must be a boolean'),
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
        const { email, username, name, operatorEntityId, isActive } = req.body;
        const existingAdmin = await prisma.admin.findUnique({
            where: { id }
        });
        if (!existingAdmin) {
            return res.status(404).json({
                success: false,
                error: 'Admin user not found',
            });
        }
        if (email !== existingAdmin.email) {
            const emailConflict = await prisma.admin.findUnique({
                where: { email }
            });
            if (emailConflict) {
                return res.status(400).json({
                    success: false,
                    error: 'Email already exists',
                });
            }
        }
        if (username !== existingAdmin.username) {
            const usernameConflict = await prisma.admin.findUnique({
                where: { username }
            });
            if (usernameConflict) {
                return res.status(400).json({
                    success: false,
                    error: 'Username already exists',
                });
            }
        }
        const entity = await prisma.operatorEntity.findUnique({
            where: { id: operatorEntityId },
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
        if (!entity) {
            return res.status(400).json({
                success: false,
                error: 'Operator entity not found',
            });
        }
        const updatedAdmin = await prisma.admin.update({
            where: { id },
            data: {
                email,
                username,
                name,
                isActive,
                operatorEntityId,
            },
            include: {
                operatorEntity: {
                    include: {
                        role: {
                            select: {
                                id: true,
                                name: true,
                                description: true,
                            }
                        }
                    }
                }
            }
        });
        res.json({
            success: true,
            data: {
                id: updatedAdmin.id,
                email: updatedAdmin.email,
                username: updatedAdmin.username,
                name: updatedAdmin.name,
                isActive: updatedAdmin.isActive,
                lastLogin: updatedAdmin.lastLogin,
                createdAt: updatedAdmin.createdAt,
                updatedAt: updatedAdmin.updatedAt,
                operatorEntityId: updatedAdmin.operatorEntityId,
                operatorEntityName: updatedAdmin.operatorEntity.name,
                roleName: updatedAdmin.operatorEntity.role.name,
            },
            message: 'Admin user updated successfully',
        });
    }
    catch (error) {
        console.error('Update admin user error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error',
        });
    }
});
router.delete('/:id', auth_1.authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const admin = await prisma.admin.findUnique({
            where: { id }
        });
        if (!admin) {
            return res.status(404).json({
                success: false,
                error: 'Admin user not found',
            });
        }
        const adminCount = await prisma.admin.count();
        if (adminCount <= 1) {
            return res.status(400).json({
                success: false,
                error: 'Cannot delete the last admin user',
            });
        }
        await prisma.admin.delete({
            where: { id }
        });
        res.json({
            success: true,
            message: 'Admin user deleted successfully',
        });
    }
    catch (error) {
        console.error('Delete admin user error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error',
        });
    }
});
router.get('/operator-entities', auth_1.authenticate, async (req, res) => {
    try {
        const entities = await prisma.operatorEntity.findMany({
            where: { isActive: true },
            include: {
                role: {
                    select: {
                        id: true,
                        name: true,
                        description: true,
                    }
                }
            },
            orderBy: { name: 'asc' }
        });
        const transformedEntities = entities.map(entity => ({
            id: entity.id,
            name: entity.name,
            description: entity.description,
            roleId: entity.roleId,
            roleName: entity.role.name,
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
exports.default = router;
//# sourceMappingURL=admin-users.js.map