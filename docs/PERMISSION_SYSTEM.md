# Permission System Documentation

## Overview

The SNAP Admin Panel implements a comprehensive role-based access control (RBAC) system that ensures users can only access features and perform actions they have permission for. This system operates at multiple levels: navigation, page access, and feature-level permissions.

## Architecture

### Backend Permission Structure

The backend uses a hierarchical permission system with the following entities:

- **Admin**: Individual user accounts
- **OperatorEntity**: Container/group that admins belong to
- **Role**: Collection of permissions assigned to an entity
- **Permission**: Individual permission for a specific entity type and action

### Frontend Permission Structure

The frontend implements permission checking at three levels:

1. **Navigation Level**: Controls which menu items are visible
2. **Page Level**: Controls access to entire pages
3. **Feature Level**: Controls access to specific buttons and actions

## Implementation Details

### 1. Backend Permission System

#### Database Schema

```prisma
model Admin {
  id              String   @id @default(cuid())
  username        String   @unique
  email           String   @unique
  password        String
  name            String
  isActive        Boolean  @default(true)
  operatorEntityId String?
  operatorEntity  OperatorEntity? @relation(fields: [operatorEntityId], references: [id])
  // ... other fields
}

model OperatorEntity {
  id       String @id @default(cuid())
  name     String
  roleId   String
  role     Role   @relation(fields: [roleId], references: [id])
  admins   Admin[]
  // ... other fields
}

model Role {
  id          String @id @default(cuid())
  name        String
  description String?
  isActive    Boolean @default(true)
  permissions Permission[]
  entities    OperatorEntity[]
  // ... other fields
}

model Permission {
  id         String @id @default(cuid())
  roleId     String
  role       Role   @relation(fields: [roleId], references: [id])
  entityType String // e.g., "USERS", "PRODUCTS", "SYSTEM_CONFIG"
  permission String // e.g., "VIEW", "ADD", "EDIT", "DELETE", "EXPORT"
  isGranted  Boolean @default(false)
  // ... other fields
}
```

#### Permission Types

The system supports the following permission types:

- **VIEW**: Can view/list items
- **ADD**: Can create new items
- **EDIT**: Can modify existing items
- **DELETE**: Can remove items
- **EXPORT**: Can export data

#### Entity Types

The system defines these main entity types:

- **DASHBOARD**: Dashboard access
- **USERS**: User management
- **PRODUCTS**: Product management
- **ORDERS**: Order management
- **SETTLEMENTS**: Settlement management
- **SYSTEM_CONFIG**: System configuration
- **JOURNALS**: Journal/report access

### 2. Frontend Permission System

#### Core Components

##### Permission Hook (`usePermissions`)

```typescript
// src/hooks/usePermissions.ts
export const usePermissions = () => {
  const { user } = useAuthStore();
  const [permissions, setPermissions] = useState<Record<string, Record<string, boolean>>>({});
  
  const hasPermission = (entityType: string, permission: string): boolean => {
    if (!permissions[entityType]) {
      return false;
    }
    return permissions[entityType][permission] === true;
  };

  const canView = (entityType: string): boolean => {
    return hasPermission(entityType, 'VIEW');
  };

  const canAdd = (entityType: string): boolean => {
    return hasPermission(entityType, 'ADD');
  };

  const canEdit = (entityType: string): boolean => {
    return hasPermission(entityType, 'EDIT');
  };

  const canDelete = (entityType: string): boolean => {
    return hasPermission(entityType, 'DELETE');
  };

  const canExport = (entityType: string): boolean => {
    return hasPermission(entityType, 'EXPORT');
  };

  return {
    permissions,
    loading,
    hasPermission,
    canView,
    canAdd,
    canEdit,
    canDelete,
    canExport,
  };
};
```

##### Feature Access Hook (`useFeatureAccess`)

```typescript
// src/hooks/useFeatureAccess.ts
export const useFeatureAccess = (entityType: string): FeatureAccess => {
  const { canView, canAdd, canEdit, canDelete, canExport } = usePermissions();

  return {
    canView: canView(entityType),
    canAdd: canAdd(entityType),
    canEdit: canEdit(entityType),
    canDelete: canDelete(entityType),
    canExport: canExport(entityType),
  };
};
```

##### Permission Guard Component

```typescript
// src/components/auth/PermissionGuard.tsx
export function PermissionGuard({ 
  children, 
  requiredPermission, 
  fallback 
}: PermissionGuardProps) {
  const { hasPermission, loading } = usePermissions();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !hasPermission(requiredPermission.entityType, requiredPermission.permission)) {
      router.push('/dashboard');
    }
  }, [hasPermission, requiredPermission, loading, router]);

  if (loading) {
    return <div>Checking permissions...</div>;
  }

  if (!hasPermission(requiredPermission.entityType, requiredPermission.permission)) {
    if (fallback) {
      return <>{fallback}</>;
    }
    return (
      <div className="text-center">
        <div className="text-2xl font-bold text-red-600 mb-2">Access Denied</div>
        <div className="text-gray-600">You don't have permission to access this page.</div>
      </div>
    );
  }

  return <>{children}</>;
}
```

#### Navigation Permission System

##### Sidebar Implementation

```typescript
// src/components/layout/Sidebar.tsx
const navigation = [
  { 
    name: 'Dashboard', 
    href: '/dashboard', 
    icon: LayoutDashboard,
    permission: { entityType: 'DASHBOARD', permission: 'VIEW' }
  },
  { 
    name: 'Users', 
    icon: Users,
    permission: { entityType: 'USERS', permission: 'VIEW' },
    submenu: [
      { 
        name: 'SNAP Users', 
        href: '/users/snap-users', 
        icon: UserCheck,
        permission: { entityType: 'USERS_SNAP_USERS', permission: 'VIEW' }
      },
      // ... more submenu items
    ]
  },
  // ... more navigation items
];

export function Sidebar() {
  const { hasPermission } = usePermissions();
  
  // Filter navigation items based on permissions
  const filterNavigationByPermissions = (items: any[]) => {
    return items.filter(item => {
      if (item.permission) {
        const hasAccess = hasPermission(item.permission.entityType, item.permission.permission);
        if (!hasAccess) return false;
      }

      if (item.submenu) {
        const hasSubmenuAccess = item.submenu.some((subItem: any) => {
          if (subItem.permission) {
            return hasPermission(subItem.permission.entityType, subItem.permission.permission);
          }
          return true;
        });
        if (!hasSubmenuAccess) return false;
      }

      return true;
    });
  };

  const filteredNavigation = filterNavigationByPermissions(navigation);
  
  return (
    <nav>
      {filteredNavigation.map((item) => (
        // Render navigation items
      ))}
    </nav>
  );
}
```

## How It Works Now

### 1. User Login:
- **Backend returns user permissions** in the correct format
- **Frontend stores permissions** in auth store
- **Permissions are available** throughout the app

### 2. Navigation:
- **Sidebar only shows menu items** user has permission to view
- **Submenus are filtered** based on permissions
- **Users can't see pages** they don't have access to

### 3. Page Access:
- **PermissionGuard blocks access** to pages user doesn't have permission for
- **Shows "Access Denied" message** or redirects to dashboard
- **Prevents direct URL access** to restricted pages

### 4. Feature Access:
- **Buttons and actions are hidden** based on permissions
- **Users can only perform actions** they have permission for
- **UI adapts to user's permission level**

## Usage Examples

### 1. Protecting Pages

```typescript
// src/app/system-config/roles/page.tsx
export default function RolesPage() {
  return (
    <AuthGuard>
      <PermissionGuard requiredPermission={{ entityType: 'SYSTEM_CONFIG_ROLES', permission: 'VIEW' }}>
        <AdminLayout>
          <RolesContent />
        </AdminLayout>
      </PermissionGuard>
    </AuthGuard>
  );
}
```

### 2. Feature-Level Permissions

```typescript
// Inside a component
function RolesContent() {
  const featureAccess = useFeatureAccess('SYSTEM_CONFIG_ROLES');
  
  return (
    <div>
      {featureAccess.canAdd && (
        <Button onClick={() => router.push('/system-config/roles/create')}>
          Create Role
        </Button>
      )}
      
      {roles.map(role => (
        <div key={role.id}>
          {featureAccess.canEdit && (
            <Button onClick={() => handleEditRole(role)}>
              Edit
            </Button>
          )}
          {featureAccess.canDelete && (
            <Button onClick={() => handleDeleteRole(role)}>
              Delete
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}
```

### 3. Conditional Rendering

```typescript
// Using the permission hook directly
function SomeComponent() {
  const { hasPermission } = usePermissions();
  
  return (
    <div>
      {hasPermission('USERS', 'VIEW') && (
        <div>User management content</div>
      )}
      
      {hasPermission('PRODUCTS', 'ADD') && (
        <Button>Add Product</Button>
      )}
    </div>
  );
}
```

## Permission Mapping

### Navigation Permissions

| Menu Item | Entity Type | Permission | Description |
|-----------|-------------|------------|-------------|
| Dashboard | `DASHBOARD` | `VIEW` | Access to dashboard |
| Users | `USERS` | `VIEW` | Access to user management |
| SNAP Users | `USERS_SNAP_USERS` | `VIEW` | Access to SNAP users |
| KYC Approval | `USERS_KYC_APPROVAL` | `VIEW` | Access to KYC approval |
| Products | `PRODUCTS` | `VIEW` | Access to product management |
| Categories | `PRODUCTS_CATEGORIES` | `VIEW` | Access to product categories |
| Orders | `ORDERS` | `VIEW` | Access to order management |
| Settlements | `SETTLEMENTS` | `VIEW` | Access to settlement management |
| System Config | `SYSTEM_CONFIG` | `VIEW` | Access to system configuration |
| Roles | `SYSTEM_CONFIG_ROLES` | `VIEW` | Access to role management |
| Journals | `JOURNALS` | `VIEW` | Access to journals/reports |

### Feature Permissions

| Feature | Entity Type | Permission | Description |
|---------|-------------|------------|-------------|
| View List | `*` | `VIEW` | Can view/list items |
| Create New | `*` | `ADD` | Can create new items |
| Edit Existing | `*` | `EDIT` | Can modify existing items |
| Delete Items | `*` | `DELETE` | Can remove items |
| Export Data | `*` | `EXPORT` | Can export data |

## Security Considerations

### 1. Backend Validation

- All API endpoints should validate permissions server-side
- JWT tokens contain user role information
- Database queries filter data based on user permissions

### 2. Frontend Security

- Permission checks are implemented at multiple levels
- Direct URL access is prevented by PermissionGuard
- UI elements are conditionally rendered based on permissions

### 3. Token Management

- JWT tokens expire after 24 hours (configurable)
- Tokens contain minimal user information
- Logout clears all stored authentication data

## Testing Permissions

### 1. Create Test Users

```sql
-- Create a role with limited permissions
INSERT INTO roles (name, description) VALUES ('Limited User', 'User with limited access');

-- Create permissions for the role
INSERT INTO permissions (roleId, entityType, permission, isGranted) VALUES
('role_id', 'USERS', 'VIEW', true),
('role_id', 'USERS', 'ADD', false),
('role_id', 'USERS', 'EDIT', false),
('role_id', 'USERS', 'DELETE', false);

-- Create an operator entity with the role
INSERT INTO operator_entities (name, roleId) VALUES ('Test Entity', 'role_id');

-- Create an admin user
INSERT INTO admins (username, email, password, name, operatorEntityId) VALUES
('testuser', 'test@example.com', 'hashed_password', 'Test User', 'entity_id');
```

### 2. Test Scenarios

1. **Login with limited user**: Should only see permitted menu items
2. **Try accessing restricted pages**: Should get "Access Denied"
3. **Check button visibility**: Should only see permitted action buttons
4. **Test direct URL access**: Should be redirected or blocked

## Troubleshooting

### Common Issues

1. **User sees all menu items**: Check if permissions are being loaded correctly from backend
2. **Buttons not showing**: Verify feature access permissions are correct
3. **Access denied on valid pages**: Check permission mapping in navigation array
4. **Permissions not updating**: Clear browser cache and localStorage

### Debug Commands

```typescript
// Check current user permissions
console.log('User permissions:', useAuthStore.getState().user?.permissions);

// Check specific permission
const { hasPermission } = usePermissions();
console.log('Can view users:', hasPermission('USERS', 'VIEW'));

// Check feature access
const featureAccess = useFeatureAccess('USERS');
console.log('Feature access:', featureAccess);
```

## Future Enhancements

1. **Permission Groups**: Group related permissions for easier management
2. **Dynamic Permissions**: Allow runtime permission changes
3. **Audit Logging**: Track permission usage and changes
4. **Permission Inheritance**: Implement hierarchical permission inheritance
5. **Time-based Permissions**: Add expiration to specific permissions

## API Endpoints

### Authentication

- `POST /api/auth/login` - Login with username/password
- `GET /api/auth/me` - Get current user profile
- `POST /api/auth/logout` - Logout user

### Roles & Permissions

- `GET /api/roles` - Get all roles
- `POST /api/roles` - Create new role
- `PUT /api/roles/:id` - Update role
- `DELETE /api/roles/:id` - Delete role
- `GET /api/roles/available-permissions` - Get available permissions

### Users

- `GET /api/users` - Get all users
- `POST /api/users` - Create new user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

## Conclusion

The permission system provides comprehensive access control at multiple levels, ensuring security while maintaining a good user experience. The implementation is modular, scalable, and follows best practices for RBAC systems.

For questions or issues, refer to the troubleshooting section or contact the development team. 