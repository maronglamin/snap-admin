import { useState, useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';

interface Permission {
  entityType: string;
  permission: string;
}

export const usePermissions = () => {
  const { user } = useAuthStore();
  const [permissions, setPermissions] = useState<Record<string, Record<string, boolean>>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.permissions) {
      setPermissions(user.permissions);
      setLoading(false);
    }
  }, [user]);

  const hasPermission = (entityType: string, permission: string): boolean => {
    if (!permissions[entityType]) {
      return false;
    }
    return permissions[entityType][permission] === true;
  };

  const hasAnyPermission = (requiredPermissions: Permission[]): boolean => {
    return requiredPermissions.some(({ entityType, permission }) =>
      hasPermission(entityType, permission)
    );
  };

  const hasAllPermissions = (requiredPermissions: Permission[]): boolean => {
    return requiredPermissions.every(({ entityType, permission }) =>
      hasPermission(entityType, permission)
    );
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
    hasAnyPermission,
    hasAllPermissions,
    canView,
    canAdd,
    canEdit,
    canDelete,
    canExport,
  };
}; 