'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usePermissions } from '@/hooks/usePermissions';

interface PermissionGuardProps {
  children: React.ReactNode;
  requiredPermission: {
    entityType: string;
    permission: string;
  };
  fallback?: React.ReactNode;
}

export function PermissionGuard({ 
  children, 
  requiredPermission, 
  fallback 
}: PermissionGuardProps) {
  const { hasPermission, loading } = usePermissions();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !hasPermission(requiredPermission.entityType, requiredPermission.permission)) {
      console.log('🔍 PermissionGuard: Access denied for', requiredPermission);
      router.push('/dashboard'); // Redirect to dashboard if no permission
    }
  }, [hasPermission, requiredPermission, loading, router]);

  // Show loading while checking permissions
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-lg text-gray-600">Checking permissions...</div>
      </div>
    );
  }

  // Show fallback or redirect if no permission
  if (!hasPermission(requiredPermission.entityType, requiredPermission.permission)) {
    if (fallback) {
      return <>{fallback}</>;
    }
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl font-bold text-red-600 mb-2">Access Denied</div>
          <div className="text-gray-600">You don't have permission to access this page.</div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
} 