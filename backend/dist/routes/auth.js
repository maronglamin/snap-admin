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
const mfaService_1 = require("../services/mfaService");
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
                        role: {
                            include: {
                                permissions: true
                            }
                        }
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
        if (!admin.mfaEnabled) {
            const mfaData = await mfaService_1.MFAService.generateMFASecret(admin.id, admin.email);
            return res.json({
                success: true,
                requiresMFASetup: true,
                adminId: admin.id,
                mfaData,
                message: 'MFA setup required for first login'
            });
        }
        return res.json({
            success: true,
            requiresMFA: true,
            adminId: admin.id,
            message: 'MFA verification required'
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
router.post('/verify-mfa', [
    (0, express_validator_1.body)('adminId').notEmpty().withMessage('Admin ID is required'),
    (0, express_validator_1.body)('token').notEmpty().withMessage('MFA token is required'),
], async (req, res) => {
    try {
        const { adminId, token } = req.body;
        const admin = await prisma.admin.findUnique({
            where: { id: adminId },
            include: {
                operatorEntity: {
                    include: {
                        role: {
                            include: {
                                permissions: true
                            }
                        }
                    }
                }
            }
        });
        if (!admin || !admin.mfaEnabled || !admin.mfaSecret) {
            return res.status(400).json({
                success: false,
                error: 'Invalid MFA request'
            });
        }
        let isValid = mfaService_1.MFAService.verifyTOTP(token, admin.mfaSecret);
        if (!isValid) {
            console.log(`MFA Debug: Primary verification failed, trying alternative method`);
            isValid = mfaService_1.MFAService.verifyTOTPAlternative(token, admin.mfaSecret);
        }
        if (!isValid) {
            return res.status(401).json({
                success: false,
                error: 'Invalid MFA token. Please ensure you enter the 6-digit code from your authenticator app within 30 seconds of generation.'
            });
        }
        await prisma.admin.update({
            where: { id: adminId },
            data: { lastLogin: new Date() },
        });
        if (!process.env.JWT_SECRET) {
            throw new Error('JWT_SECRET is not defined');
        }
        const jwtToken = jsonwebtoken_1.default.sign({
            id: admin.id,
            email: admin.email,
            username: admin.username,
            role: admin.operatorEntity.role.name,
            entityId: admin.operatorEntityId
        }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '30m' });
        const permissions = {};
        admin.operatorEntity.role.permissions.forEach(perm => {
            if (!permissions[perm.entityType]) {
                permissions[perm.entityType] = {};
            }
            permissions[perm.entityType][perm.permission] = perm.isGranted;
        });
        res.json({
            success: true,
            data: {
                token: jwtToken,
                admin: {
                    id: admin.id,
                    email: admin.email,
                    username: admin.username,
                    name: admin.name,
                    role: admin.operatorEntity.role.name,
                    entityId: admin.operatorEntityId,
                    entityName: admin.operatorEntity.name,
                    permissions,
                },
            },
            message: 'Login successful',
        });
    }
    catch (error) {
        console.error('Verify MFA error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error',
        });
    }
});
router.post('/enable-mfa', [
    (0, express_validator_1.body)('adminId').notEmpty().withMessage('Admin ID is required'),
    (0, express_validator_1.body)('token').notEmpty().withMessage('MFA token is required'),
], async (req, res) => {
    try {
        const { adminId, token } = req.body;
        console.log(`MFA Debug: Attempting to enable MFA for admin ${adminId} with token: ${token}`);
        const admin = await prisma.admin.findUnique({
            where: { id: adminId },
            include: {
                operatorEntity: {
                    include: {
                        role: {
                            include: {
                                permissions: true
                            }
                        }
                    }
                }
            }
        });
        if (!admin || !admin.mfaSecret) {
            console.log(`MFA Debug: Admin not found or no MFA secret for ${adminId}`);
            return res.status(400).json({
                success: false,
                error: 'MFA not set up'
            });
        }
        console.log(`MFA Debug: Admin found, MFA secret exists: ${!!admin.mfaSecret}`);
        let isValid = mfaService_1.MFAService.verifyTOTP(token, admin.mfaSecret);
        if (!isValid) {
            console.log(`MFA Debug: Primary verification failed, trying alternative method`);
            isValid = mfaService_1.MFAService.verifyTOTPAlternative(token, admin.mfaSecret);
        }
        if (!isValid) {
            console.log(`MFA Debug: Both verification methods failed`);
            return res.status(401).json({
                success: false,
                error: 'Invalid MFA token. Please ensure you enter the 6-digit code from your authenticator app within 30 seconds of generation.'
            });
        }
        console.log(`MFA Debug: MFA verification successful, enabling MFA`);
        await prisma.admin.update({
            where: { id: adminId },
            data: {
                mfaEnabled: true,
                mfaVerified: true
            }
        });
        await prisma.admin.update({
            where: { id: adminId },
            data: { lastLogin: new Date() },
        });
        if (!process.env.JWT_SECRET) {
            throw new Error('JWT_SECRET is not defined');
        }
        const jwtToken = jsonwebtoken_1.default.sign({
            id: admin.id,
            email: admin.email,
            username: admin.username,
            role: admin.operatorEntity.role.name,
            entityId: admin.operatorEntityId
        }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '30m' });
        const permissions = {};
        admin.operatorEntity.role.permissions.forEach(perm => {
            if (!permissions[perm.entityType]) {
                permissions[perm.entityType] = {};
            }
            permissions[perm.entityType][perm.permission] = perm.isGranted;
        });
        res.json({
            success: true,
            data: {
                token: jwtToken,
                admin: {
                    id: admin.id,
                    email: admin.email,
                    username: admin.username,
                    name: admin.name,
                    role: admin.operatorEntity.role.name,
                    entityId: admin.operatorEntityId,
                    entityName: admin.operatorEntity.name,
                    permissions,
                },
            },
            message: 'MFA enabled successfully and user logged in'
        });
    }
    catch (error) {
        console.error('Enable MFA error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error',
        });
    }
});
router.post('/verify-backup-code', [
    (0, express_validator_1.body)('adminId').notEmpty().withMessage('Admin ID is required'),
    (0, express_validator_1.body)('backupCode').notEmpty().withMessage('Backup code is required'),
], async (req, res) => {
    try {
        const { adminId, backupCode } = req.body;
        const isValid = await mfaService_1.MFAService.verifyBackupCode(adminId, backupCode);
        if (!isValid) {
            return res.status(401).json({
                success: false,
                error: 'Invalid backup code'
            });
        }
        const admin = await prisma.admin.findUnique({
            where: { id: adminId },
            include: {
                operatorEntity: {
                    include: {
                        role: {
                            include: {
                                permissions: true
                            }
                        }
                    }
                }
            }
        });
        if (!admin) {
            return res.status(404).json({
                success: false,
                error: 'Admin not found'
            });
        }
        await prisma.admin.update({
            where: { id: adminId },
            data: { lastLogin: new Date() },
        });
        if (!process.env.JWT_SECRET) {
            throw new Error('JWT_SECRET is not defined');
        }
        const jwtToken = jsonwebtoken_1.default.sign({
            id: admin.id,
            email: admin.email,
            username: admin.username,
            role: admin.operatorEntity.role.name,
            entityId: admin.operatorEntityId
        }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '30m' });
        const permissions = {};
        admin.operatorEntity.role.permissions.forEach(perm => {
            if (!permissions[perm.entityType]) {
                permissions[perm.entityType] = {};
            }
            permissions[perm.entityType][perm.permission] = perm.isGranted;
        });
        res.json({
            success: true,
            data: {
                token: jwtToken,
                admin: {
                    id: admin.id,
                    email: admin.email,
                    username: admin.username,
                    name: admin.name,
                    role: admin.operatorEntity.role.name,
                    entityId: admin.operatorEntityId,
                    entityName: admin.operatorEntity.name,
                    permissions,
                },
            },
            message: 'Login successful with backup code',
        });
    }
    catch (error) {
        console.error('Verify Backup Code error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error',
        });
    }
});
router.get('/debug-mfa/:adminId', async (req, res) => {
    try {
        const { adminId } = req.params;
        const debugInfo = await mfaService_1.MFAService.debugMFASetup(adminId);
        if (debugInfo.error) {
            return res.status(404).json({
                success: false,
                error: debugInfo.error
            });
        }
        res.json({
            success: true,
            data: debugInfo
        });
    }
    catch (error) {
        console.error('Debug MFA error:', error);
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
                        role: {
                            include: {
                                permissions: true
                            }
                        }
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
        const permissions = {};
        admin.operatorEntity.role.permissions.forEach(perm => {
            if (!permissions[perm.entityType]) {
                permissions[perm.entityType] = {};
            }
            permissions[perm.entityType][perm.permission] = perm.isGranted;
        });
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
                permissions,
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
router.put('/change-password', [
    auth_1.authenticate,
    (0, express_validator_1.body)('oldPassword').notEmpty().withMessage('Current password is required'),
    (0, express_validator_1.body)('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                error: errors.array()[0].msg,
            });
        }
        const { oldPassword, newPassword } = req.body;
        const userId = req.user.id;
        const admin = await prisma.admin.findUnique({ where: { id: userId } });
        if (!admin) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }
        const isOldPasswordValid = await bcryptjs_1.default.compare(oldPassword, admin.password);
        if (!isOldPasswordValid) {
            return res.status(400).json({
                success: false,
                error: 'Current password does not match',
            });
        }
        const hashedNewPassword = await bcryptjs_1.default.hash(newPassword, 12);
        await prisma.admin.update({
            where: { id: userId },
            data: {
                password: hashedNewPassword,
                updatedAt: new Date(),
            },
        });
        return res.json({
            success: true,
            message: 'Password changed successfully',
        });
    }
    catch (error) {
        console.error('Change password error:', error);
        return res.status(500).json({ success: false, error: 'Server error' });
    }
});
exports.default = router;
//# sourceMappingURL=auth.js.map