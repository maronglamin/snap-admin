# Permission System Quick Reference

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

## Quick Start

### 1. Protect a Page

```typescript
import { PermissionGuard } from '@/components/auth/PermissionGuard';

export default function MyPage() {
  return (
    <AuthGuard>
      <PermissionGuard requiredPermission={{ entityType: 'USERS', permission: 'VIEW' }}>
        <MyPageContent />
      </PermissionGuard>
    </AuthGuard>
  );
}
```

### 2. Check Feature Access

```typescript
import { useFeatureAccess } from '@/hooks/useFeatureAccess';

function MyComponent() {
  const featureAccess = useFeatureAccess('USERS');
  
  return (
    <div>
      {featureAccess.canAdd && <Button>Add User</Button>}
      {featureAccess.canEdit && <Button>Edit User</Button>}
      {featureAccess.canDelete && <Button>Delete User</Button>}
    </div>
  );
}
```

### 3. Check Specific Permission

```typescript
import { usePermissions } from '@/hooks/usePermissions';

function MyComponent() {
  const { hasPermission } = usePermissions();
  
  return (
    <div>
      {hasPermission('USERS', 'VIEW') && <UserList />}
      {hasPermission('USERS', 'ADD') && <AddUserForm />}
    </div>
  );
}
```

## Permission Types

| Permission | Description | Usage |
|------------|-------------|-------|
| `VIEW` | Can view/list items | `hasPermission('USERS', 'VIEW')` |
| `ADD` | Can create new items | `hasPermission('USERS', 'ADD')` |
| `EDIT` | Can modify existing items | `hasPermission('USERS', 'EDIT')` |
| `DELETE` | Can remove items | `hasPermission('USERS', 'DELETE')` |
| `EXPORT` | Can export data | `hasPermission('USERS', 'EXPORT')` |

## Entity Types

| Entity | Description | Example Usage |
|--------|-------------|---------------|
| `DASHBOARD` | Dashboard access | `useFeatureAccess('DASHBOARD')` |
| `USERS` | User management | `useFeatureAccess('USERS')` |
| `PRODUCTS` | Product management | `useFeatureAccess('PRODUCTS')` |
| `ORDERS` | Order management | `useFeatureAccess('ORDERS')` |
| `SETTLEMENTS` | Settlement management | `useFeatureAccess('SETTLEMENTS')` |
| `SYSTEM_CONFIG` | System configuration | `useFeatureAccess('SYSTEM_CONFIG')` |
| `JOURNALS` | Journal/report access | `useFeatureAccess('JOURNALS')` |

## Common Patterns

### 1. Conditional Button Rendering

```typescript
function ActionButtons({ item }) {
  const featureAccess = useFeatureAccess('USERS');
  
  return (
    <div className="flex gap-2">
      {featureAccess.canEdit && (
        <Button onClick={() => handleEdit(item)}>Edit</Button>
      )}
      {featureAccess.canDelete && (
        <Button onClick={() => handleDelete(item)} variant="destructive">
          Delete
        </Button>
      )}
    </div>
  );
}
```

### 2. Conditional Menu Items

```typescript
function NavigationMenu() {
  const { hasPermission } = usePermissions();
  
  return (
    <nav>
      {hasPermission('USERS', 'VIEW') && (
        <MenuItem href="/users">Users</MenuItem>
      )}
      {hasPermission('PRODUCTS', 'VIEW') && (
        <MenuItem href="/products">Products</MenuItem>
      )}
    </nav>
  );
}
```

### 3. Conditional Form Fields

```typescript
function UserForm({ user }) {
  const { hasPermission } = usePermissions();
  
  return (
    <form>
      <input name="name" defaultValue={user?.name} />
      <input name="email" defaultValue={user?.email} />
      
      {hasPermission('USERS', 'EDIT') && (
        <select name="role" defaultValue={user?.role}>
          <option value="user">User</option>
          <option value="admin">Admin</option>
        </select>
      )}
    </form>
  );
}
```

## Hooks Reference

### usePermissions()

```typescript
const {
  permissions,        // All user permissions
  loading,           // Loading state
  hasPermission,     // Check specific permission
  canView,           // Check VIEW permission
  canAdd,            // Check ADD permission
  canEdit,           // Check EDIT permission
  canDelete,         // Check DELETE permission
  canExport          // Check EXPORT permission
} = usePermissions();
```

### useFeatureAccess(entityType)

```typescript
const {
  canView,           // Boolean
  canAdd,            // Boolean
  canEdit,           // Boolean
  canDelete,         // Boolean
  canExport          // Boolean
} = useFeatureAccess('USERS');
```

## Components Reference

### PermissionGuard

```typescript
<PermissionGuard 
  requiredPermission={{ entityType: 'USERS', permission: 'VIEW' }}
  fallback={<CustomAccessDenied />} // Optional
>
  <ProtectedContent />
</PermissionGuard>
```

### AuthGuard

```typescript
<AuthGuard>
  <AuthenticatedContent />
</AuthGuard>
```

## Debugging

### Check Current Permissions

```typescript
// In browser console
console.log('User permissions:', useAuthStore.getState().user?.permissions);

// In component
const { permissions } = usePermissions();
console.log('Current permissions:', permissions);
```

### Test Permission Check

```typescript
const { hasPermission } = usePermissions();
console.log('Can view users:', hasPermission('USERS', 'VIEW'));
console.log('Can add users:', hasPermission('USERS', 'ADD'));
```

### Check Feature Access

```typescript
const featureAccess = useFeatureAccess('USERS');
console.log('Feature access:', featureAccess);
```

## Common Issues & Solutions

### Issue: User sees all menu items
**Solution**: Check if permissions are loaded correctly
```typescript
console.log('User permissions:', useAuthStore.getState().user?.permissions);
```

### Issue: Buttons not showing
**Solution**: Verify entity type and permission
```typescript
const featureAccess = useFeatureAccess('USERS'); // Check entity type
console.log('Can add:', featureAccess.canAdd);
```

### Issue: Access denied on valid pages
**Solution**: Check permission mapping
```typescript
// Make sure entity type matches backend
<PermissionGuard requiredPermission={{ entityType: 'USERS', permission: 'VIEW' }}>
```

### Issue: Permissions not updating
**Solution**: Clear cache and re-login
```typescript
// Clear localStorage
localStorage.removeItem('auth-storage');
// Re-login
```

## Best Practices

1. **Always use PermissionGuard for page protection**
2. **Use useFeatureAccess for feature-level permissions**
3. **Check permissions before rendering sensitive UI elements**
4. **Provide fallback UI for users without permissions**
5. **Test with different permission levels**
6. **Keep permission checks consistent across the app**

## Testing Checklist

- [ ] Login with limited user
- [ ] Check menu visibility
- [ ] Test page access restrictions
- [ ] Verify button visibility
- [ ] Test direct URL access
- [ ] Check form field visibility
- [ ] Test action permissions
- [ ] Verify error messages 