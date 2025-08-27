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
        const roles = await prisma.role.findMany({
            include: {
                permissions: true,
                operatorEntities: {
                    include: {
                        admins: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                                username: true,
                            }
                        }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        const transformedRoles = roles.map(role => {
            const permissions = {};
            role.permissions.forEach(perm => {
                if (!permissions[perm.entityType]) {
                    permissions[perm.entityType] = {};
                }
                permissions[perm.entityType][perm.permission] = perm.isGranted;
            });
            return {
                id: role.id,
                name: role.name,
                description: role.description,
                isActive: role.isActive,
                createdAt: role.createdAt,
                updatedAt: role.updatedAt,
                createdBy: role.createdBy,
                permissions,
                assignedUsers: role.operatorEntities.reduce((sum, entity) => sum + entity.admins.length, 0)
            };
        });
        res.json({
            success: true,
            data: transformedRoles,
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
router.post('/', [
    auth_1.authenticate,
    (0, express_validator_1.body)('name').notEmpty().withMessage('Role name is required'),
    (0, express_validator_1.body)('description').optional(),
    (0, express_validator_1.body)('permissions').isObject().withMessage('Permissions must be an object'),
], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                error: errors.array()[0].msg,
            });
        }
        const { name, description, permissions } = req.body;
        const existingRole = await prisma.role.findUnique({
            where: { name }
        });
        if (existingRole) {
            return res.status(400).json({
                success: false,
                error: 'Role name already exists',
            });
        }
        const role = await prisma.role.create({
            data: {
                name,
                description,
                isActive: true,
                createdBy: req.user.username,
            }
        });
        const permissionData = [];
        for (const [entityType, entityPermissions] of Object.entries(permissions)) {
            for (const [permission, isGranted] of Object.entries(entityPermissions)) {
                permissionData.push({
                    roleId: role.id,
                    entityType: entityType,
                    permission: permission,
                    isGranted: Boolean(isGranted),
                });
            }
        }
        if (permissionData.length > 0) {
            await prisma.rolePermission.createMany({
                data: permissionData
            });
        }
        const createdRole = await prisma.role.findUnique({
            where: { id: role.id },
            include: { permissions: true }
        });
        const permissionsObj = {};
        createdRole.permissions.forEach(perm => {
            if (!permissionsObj[perm.entityType]) {
                permissionsObj[perm.entityType] = {};
            }
            permissionsObj[perm.entityType][perm.permission] = perm.isGranted;
        });
        res.status(201).json({
            success: true,
            data: {
                id: createdRole.id,
                name: createdRole.name,
                description: createdRole.description,
                isActive: createdRole.isActive,
                permissions: permissionsObj,
                createdAt: createdRole.createdAt,
                updatedAt: createdRole.updatedAt,
                createdBy: createdRole.createdBy,
            },
            message: 'Role created successfully',
        });
    }
    catch (error) {
        console.error('Create role error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error',
        });
    }
});
router.put('/:id', [
    auth_1.authenticate,
    (0, express_validator_1.body)('name').notEmpty().withMessage('Role name is required'),
    (0, express_validator_1.body)('description').optional(),
    (0, express_validator_1.body)('permissions').isObject().withMessage('Permissions must be an object'),
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
        const { name, description, permissions } = req.body;
        const existingRole = await prisma.role.findUnique({
            where: { id }
        });
        if (!existingRole) {
            return res.status(404).json({
                success: false,
                error: 'Role not found',
            });
        }
        if (name !== existingRole.name) {
            const nameConflict = await prisma.role.findUnique({
                where: { name }
            });
            if (nameConflict) {
                return res.status(400).json({
                    success: false,
                    error: 'Role name already exists',
                });
            }
        }
        const updatedRole = await prisma.role.update({
            where: { id },
            data: {
                name,
                description,
            }
        });
        await prisma.rolePermission.deleteMany({
            where: { roleId: id }
        });
        const permissionData = [];
        for (const [entityType, entityPermissions] of Object.entries(permissions)) {
            for (const [permission, isGranted] of Object.entries(entityPermissions)) {
                permissionData.push({
                    roleId: id,
                    entityType: entityType,
                    permission: permission,
                    isGranted: Boolean(isGranted),
                });
            }
        }
        if (permissionData.length > 0) {
            await prisma.rolePermission.createMany({
                data: permissionData
            });
        }
        const finalRole = await prisma.role.findUnique({
            where: { id },
            include: { permissions: true }
        });
        const permissionsObj = {};
        finalRole.permissions.forEach(perm => {
            if (!permissionsObj[perm.entityType]) {
                permissionsObj[perm.entityType] = {};
            }
            permissionsObj[perm.entityType][perm.permission] = perm.isGranted;
        });
        res.json({
            success: true,
            data: {
                id: finalRole.id,
                name: finalRole.name,
                description: finalRole.description,
                isActive: finalRole.isActive,
                permissions: permissionsObj,
                createdAt: finalRole.createdAt,
                updatedAt: finalRole.updatedAt,
                createdBy: finalRole.createdBy,
            },
            message: 'Role updated successfully',
        });
    }
    catch (error) {
        console.error('Update role error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error',
        });
    }
});
router.delete('/:id', auth_1.authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const role = await prisma.role.findUnique({
            where: { id },
            include: {
                operatorEntities: {
                    include: {
                        admins: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                                username: true,
                            }
                        }
                    }
                }
            }
        });
        if (!role) {
            return res.status(404).json({
                success: false,
                error: 'Role not found',
            });
        }
        const entitiesWithUsers = role.operatorEntities.filter(entity => entity.admins.length > 0);
        if (entitiesWithUsers.length > 0) {
            const entityNames = entitiesWithUsers.map(entity => entity.name).join(', ');
            const totalUsers = entitiesWithUsers.reduce((sum, entity) => sum + entity.admins.length, 0);
            return res.status(400).json({
                success: false,
                error: `Cannot delete role "${role.name}" because it is assigned to ${totalUsers} user(s) in the following entities: ${entityNames}. Please reassign or remove these users first.`,
            });
        }
        if (role.operatorEntities.length > 0) {
            const entityNames = role.operatorEntities.map(entity => entity.name).join(', ');
            await prisma.operatorEntity.deleteMany({
                where: { roleId: id }
            });
            console.log(`Deleted ${role.operatorEntities.length} empty operator entities for role "${role.name}"`);
        }
        await prisma.role.delete({
            where: { id }
        });
        res.json({
            success: true,
            message: `Role "${role.name}" deleted successfully`,
        });
    }
    catch (error) {
        console.error('Delete role error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error while deleting role',
        });
    }
});
router.get('/available-permissions', auth_1.authenticate, async (req, res) => {
    try {
        const entityTypes = [
            { value: 'DASHBOARD', label: 'Dashboard', type: 'main' },
            { value: 'USERS', label: 'Users', type: 'main' },
            { value: 'PRODUCTS', label: 'Products', type: 'main' },
            { value: 'ORDERS', label: 'Orders', type: 'main' },
            { value: 'SETTLEMENTS', label: 'Settlements', type: 'main' },
            { value: 'JOURNALS', label: 'Journals', type: 'main' },
            { value: 'SYSTEM_CONFIG', label: 'System Configuration', type: 'main' },
            { value: 'SNAP_RIDE', label: 'SNAP Ride', type: 'main' },
            { value: 'SNAP_RENTAL', label: 'SNAP Rental', type: 'main' },
            { value: 'USERS_SNAP_USERS', label: 'SNAP Users', type: 'submenu', parent: 'USERS' },
            { value: 'USERS_KYC_APPROVAL', label: 'KYC Approval', type: 'submenu', parent: 'USERS' },
            { value: 'PRODUCTS_CATEGORIES', label: 'Categories', type: 'submenu', parent: 'PRODUCTS' },
            { value: 'SETTLEMENTS_REQUESTS', label: 'Settlement Request', type: 'submenu', parent: 'SETTLEMENTS' },
            { value: 'SETTLEMENTS_SHEET', label: 'Settlement Sheet', type: 'submenu', parent: 'SETTLEMENTS' },
            { value: 'SETTLEMENTS_CUMULATIVE_ENTRIES', label: 'Cumulative Entries', type: 'submenu', parent: 'SETTLEMENTS' },
            { value: 'JOURNALS_STRIPE_PAYMENT_REPORT', label: 'Stripe Payment Report', type: 'submenu', parent: 'JOURNALS' },
            { value: 'JOURNALS_SNAP_FEE_REPORT', label: 'Snap Fee Report', type: 'submenu', parent: 'JOURNALS' },
            { value: 'JOURNALS_AUDIT_REPORT', label: 'Transaction Logs', type: 'submenu', parent: 'JOURNALS' },
            { value: 'SYSTEM_CONFIG_ROLES', label: 'Roles', type: 'submenu', parent: 'SYSTEM_CONFIG' },
            { value: 'SYSTEM_CONFIG_OPERATOR_ENTITY', label: 'User Container', type: 'submenu', parent: 'SYSTEM_CONFIG' },
            { value: 'SYSTEM_CONFIG_SYSTEM_OPERATOR', label: 'Admin Container', type: 'submenu', parent: 'SYSTEM_CONFIG' },
            { value: 'SYSTEM_CONFIG_SETTLEMENT_GROUP', label: 'Settlement Group', type: 'submenu', parent: 'SYSTEM_CONFIG' },
            { value: 'SYSTEM_CONFIG_PAYMENT_GATEWAYS', label: 'Payment Gateways', type: 'submenu', parent: 'SYSTEM_CONFIG' },
            { value: 'SNAP_RIDE_RIDER_APPLICATIONS', label: 'Ride Applications', type: 'submenu', parent: 'SNAP_RIDE' },
            { value: 'SNAP_RIDE_DRIVER_MANAGEMENT', label: 'Driver Management', type: 'submenu', parent: 'SNAP_RIDE' },
            { value: 'SNAP_RIDE_RIDE_MANAGEMENT', label: 'Ride Management', type: 'submenu', parent: 'SNAP_RIDE' },
            { value: 'SNAP_RIDE_ANALYTICS', label: 'Analytics', type: 'submenu', parent: 'SNAP_RIDE' },
            { value: 'SNAP_RIDE_RIDE_SERVICE', label: 'Ride Service', type: 'submenu', parent: 'SNAP_RIDE' },
            { value: 'SNAP_RIDE_RIDE_SERVICE_TIERS', label: 'Ride Service Tiers', type: 'submenu', parent: 'SNAP_RIDE' },
            { value: 'SNAP_RENTAL_REQUEST', label: 'Request', type: 'submenu', parent: 'SNAP_RENTAL' },
            { value: 'ANALYTICS', label: 'Analytics', type: 'main' },
            { value: 'ANALYTICS_REVENUE', label: 'Revenue Analysis', type: 'submenu', parent: 'ANALYTICS' },
        ];
        const permissions = [
            { value: 'VIEW', label: 'View' },
            { value: 'ADD', label: 'Add' },
            { value: 'EDIT', label: 'Edit' },
            { value: 'DELETE', label: 'Delete' },
            { value: 'EXPORT', label: 'Export' },
        ];
        res.json({
            success: true,
            data: {
                entityTypes,
                permissions,
            },
        });
    }
    catch (error) {
        console.error('Get available permissions error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error',
        });
    }
});
exports.default = router;
//# sourceMappingURL=roles.js.map