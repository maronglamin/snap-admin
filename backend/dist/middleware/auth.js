"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorize = exports.authenticate = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const authenticate = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                error: 'Access denied. No token provided.',
            });
        }
        const token = authHeader.substring(7);
        if (!process.env.JWT_SECRET) {
            throw new Error('JWT_SECRET is not defined');
        }
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        const admin = await prisma.admin.findUnique({
            where: { id: decoded.id },
            include: {
                operatorEntity: {
                    include: {
                        role: true
                    }
                }
            }
        });
        if (!admin || !admin.isActive) {
            return res.status(401).json({
                success: false,
                error: 'Invalid token or admin account is inactive.',
            });
        }
        const adminData = {
            id: admin.id,
            email: admin.email,
            password: admin.password,
            name: admin.name,
            username: admin.username,
            isActive: admin.isActive,
            lastLogin: admin.lastLogin,
            createdAt: admin.createdAt,
            updatedAt: admin.updatedAt,
            operatorEntityId: admin.operatorEntityId,
            operatorEntityName: admin.operatorEntity.name,
            roleName: admin.operatorEntity.role.name,
        };
        req.user = adminData;
        next();
    }
    catch (error) {
        return res.status(401).json({
            success: false,
            error: 'Invalid token.',
        });
    }
};
exports.authenticate = authenticate;
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: 'Access denied. No token provided.',
            });
        }
        if (!req.user.roleName || !roles.includes(req.user.roleName)) {
            return res.status(403).json({
                success: false,
                error: 'Access denied. Insufficient permissions.',
            });
        }
        next();
    };
};
exports.authorize = authorize;
//# sourceMappingURL=auth.js.map