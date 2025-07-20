"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const express_validator_1 = require("express-validator");
const client_1 = require("@prisma/client");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
const prisma = new client_1.PrismaClient();
router.post('/login', [
    (0, express_validator_1.body)('username').notEmpty().withMessage('Username or email is required'),
    (0, express_validator_1.body)('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                error: errors.array()[0].msg,
            });
        }
        const { username, password } = req.body;
        const admin = await prisma.admin.findFirst({
            where: {
                OR: [
                    { username: username },
                    { email: username }
                ]
            },
            include: {
                operatorEntity: {
                    include: {
                        role: true
                    }
                }
            }
        });
        if (!admin) {
            return res.status(401).json({
                success: false,
                error: 'Invalid credentials',
            });
        }
        if (!admin.isActive) {
            return res.status(401).json({
                success: false,
                error: 'Account is deactivated',
            });
        }
        const isPasswordValid = await bcryptjs_1.default.compare(password, admin.password);
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                error: 'Invalid credentials',
            });
        }
        await prisma.admin.update({
            where: { id: admin.id },
            data: { lastLogin: new Date() },
        });
        if (!process.env.JWT_SECRET) {
            throw new Error('JWT_SECRET is not defined');
        }
        const token = jsonwebtoken_1.default.sign({
            id: admin.id,
            email: admin.email,
            username: admin.username,
            role: admin.operatorEntity.role.name,
            entityId: admin.operatorEntityId
        }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '24h' });
        res.json({
            success: true,
            data: {
                token,
                admin: {
                    id: admin.id,
                    email: admin.email,
                    username: admin.username,
                    name: admin.name,
                    role: admin.operatorEntity.role.name,
                    entityId: admin.operatorEntityId,
                    entityName: admin.operatorEntity.name,
                },
            },
            message: 'Login successful',
        });
    }
    catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error',
        });
    }
});
router.get('/me', auth_1.authenticate, async (req, res) => {
    try {
        const admin = await prisma.admin.findUnique({
            where: { id: req.user.id },
            include: {
                operatorEntity: {
                    include: {
                        role: true
                    }
                }
            }
        });
        if (!admin) {
            return res.status(404).json({
                success: false,
                error: 'Admin not found',
            });
        }
        res.json({
            success: true,
            data: {
                id: admin.id,
                email: admin.email,
                username: admin.username,
                name: admin.name,
                role: admin.operatorEntity.role.name,
                isActive: admin.isActive,
                lastLogin: admin.lastLogin,
                createdAt: admin.createdAt,
                entityId: admin.operatorEntityId,
                entityName: admin.operatorEntity.name,
            },
        });
    }
    catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error',
        });
    }
});
router.post('/logout', auth_1.authenticate, (req, res) => {
    res.json({
        success: true,
        message: 'Logout successful',
    });
});
exports.default = router;
//# sourceMappingURL=auth.js.map