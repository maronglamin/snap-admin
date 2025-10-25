"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAllPermissions = exports.requireAnyPermission = exports.requirePermission = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const requirePermission = (entityType, permission) => {
    return async (req, res, next) => {
        try {
            if (!req.user) {
                return res.status(401).json({
                    success: false,
                    error: 'Authentication required',
                });
            }
            const adminWithRole = await prisma.admin.findUnique({
                where: { id: req.user.id },
                include: {
                    operatorEntity: {
                        include: {
                            role: {
                                include: {
                                    permissions: true,
                                },
                            },
                        },
                    },
                },
            });
            if (!adminWithRole || !adminWithRole.operatorEntity || !adminWithRole.operatorEntity.role) {
                return res.status(403).json({
                    success: false,
                    error: 'No role assigned',
                });
            }
            const role = adminWithRole.operatorEntity.role;
            const hasPermission = role.permissions.some((perm) => perm.entityType === entityType &&
                perm.permission === permission &&
                perm.isGranted === true);
            if (!hasPermission) {
                return res.status(403).json({
                    success: false,
                    error: `Access denied. Required permission: ${permission} on ${entityType}`,
                });
            }
            next();
        }
        catch (error) {
            console.error('Permission check error:', error);
            res.status(500).json({
                success: false,
                error: 'Server error during permission check',
            });
        }
    };
};
exports.requirePermission = requirePermission;
const requireAnyPermission = (permissions) => {
    return async (req, res, next) => {
        try {
            if (!req.user) {
                return res.status(401).json({
                    success: false,
                    error: 'Authentication required',
                });
            }
            const adminWithRole = await prisma.admin.findUnique({
                where: { id: req.user.id },
                include: {
                    operatorEntity: {
                        include: {
                            role: {
                                include: {
                                    permissions: true,
                                },
                            },
                        },
                    },
                },
            });
            if (!adminWithRole || !adminWithRole.operatorEntity || !adminWithRole.operatorEntity.role) {
                return res.status(403).json({
                    success: false,
                    error: 'No role assigned',
                });
            }
            const role = adminWithRole.operatorEntity.role;
            const hasAnyPermission = permissions.some(({ entityType, permission }) => role.permissions.some((perm) => perm.entityType === entityType &&
                perm.permission === permission &&
                perm.isGranted === true));
            if (!hasAnyPermission) {
                const requiredPermissions = permissions.map(p => `${p.permission} on ${p.entityType}`).join(' or ');
                return res.status(403).json({
                    success: false,
                    error: `Access denied. Required permissions: ${requiredPermissions}`,
                });
            }
            next();
        }
        catch (error) {
            console.error('Permission check error:', error);
            res.status(500).json({
                success: false,
                error: 'Server error during permission check',
            });
        }
    };
};
exports.requireAnyPermission = requireAnyPermission;
const requireAllPermissions = (permissions) => {
    return async (req, res, next) => {
        try {
            if (!req.user) {
                return res.status(401).json({
                    success: false,
                    error: 'Authentication required',
                });
            }
            const adminWithRole = await prisma.admin.findUnique({
                where: { id: req.user.id },
                include: {
                    operatorEntity: {
                        include: {
                            role: {
                                include: {
                                    permissions: true,
                                },
                            },
                        },
                    },
                },
            });
            if (!adminWithRole || !adminWithRole.operatorEntity || !adminWithRole.operatorEntity.role) {
                return res.status(403).json({
                    success: false,
                    error: 'No role assigned',
                });
            }
            const role = adminWithRole.operatorEntity.role;
            const hasAllPermissions = permissions.every(({ entityType, permission }) => role.permissions.some((perm) => perm.entityType === entityType &&
                perm.permission === permission &&
                perm.isGranted === true));
            if (!hasAllPermissions) {
                const requiredPermissions = permissions.map(p => `${p.permission} on ${p.entityType}`).join(' and ');
                return res.status(403).json({
                    success: false,
                    error: `Access denied. Required permissions: ${requiredPermissions}`,
                });
            }
            next();
        }
        catch (error) {
            console.error('Permission check error:', error);
            res.status(500).json({
                success: false,
                error: 'Server error during permission check',
            });
        }
    };
};
exports.requireAllPermissions = requireAllPermissions;
//# sourceMappingURL=permissions.js.map