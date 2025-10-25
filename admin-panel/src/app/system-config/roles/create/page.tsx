'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  ArrowLeft,
  Save,
  Key
} from 'lucide-react';
import { rolesApi } from '@/services/api';
import { useAuthStore } from '@/stores/authStore';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { PermissionGuard } from '@/components/auth/PermissionGuard';

interface EntityType {
  value: string;
  label: string;
  type: 'main' | 'submenu';
  parent?: string;
}

interface Permission {
  value: string;
  label: string;
}

interface AvailablePermissions {
  entityTypes: EntityType[];
  permissions: Permission[];
}

function CreateRoleContent() {
  const router = useRouter();
  const { isAuthenticated, checkAuth } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [availablePermissions, setAvailablePermissions] = useState<AvailablePermissions | null>(null);
  const [roleData, setRoleData] = useState({
    name: '',
    description: '',
    permissions: {} as Record<string, Record<string, boolean>>
  });

  // Check authentication on mount and load available permissions
  useEffect(() => {
    if (!isAuthenticated || !checkAuth()) {
      console.log('🔍 Debug - Not authenticated, redirecting to login');
      router.push('/');
      return;
    }
    loadAvailablePermissions();
  }, [isAuthenticated, router]);

  const loadAvailablePermissions = async () => {
    try {
      const response = await rolesApi.getAvailablePermissions();
      setAvailablePermissions(response.data);
      
      // Initialize default permissions
      const defaultPermissions: Record<string, Record<string, boolean>> = {};
      response.data.entityTypes.forEach((entity: EntityType) => {
        defaultPermissions[entity.value] = {};
        response.data.permissions.forEach((permission: Permission) => {
          defaultPermissions[entity.value][permission.value] = false;
        });
      });
      setRoleData(prev => ({ ...prev, permissions: defaultPermissions }));
    } catch (error) {
      console.error('Error loading available permissions:', error);
      setError('Failed to load available permissions');
    }
  };

  const handlePermissionChange = (entityType: string, permission: string, value: boolean) => {
    setRoleData(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [entityType]: {
          ...prev.permissions[entityType],
          [permission]: value
        }
      }
    }));
  };

  const handleSelectAll = (entityType: string, value: boolean) => {
    if (!availablePermissions) return;
    
    setRoleData(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [entityType]: availablePermissions.permissions.reduce((acc, permission) => {
          acc[permission.value] = value;
          return acc;
        }, {} as Record<string, boolean>)
      }
    }));
  };

  const handleCreateRole = async () => {
    if (!roleData.name.trim()) {
      setError('Role name is required');
      return;
    }

    try {
      setLoading(true);
      setError('');
      await rolesApi.create(roleData);
      router.push('/system-config/roles');
    } catch (error: any) {
      console.error('Error creating role:', error);
      setError(error.message || 'Failed to create role');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.back()}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Create New Role</h1>
            <p className="text-gray-600 mt-1">Define a new role with specific permissions</p>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-100 text-red-700 rounded-md">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Basic Information */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Key className="h-5 w-5 text-blue-600" />
                Basic Information
              </CardTitle>
              <CardDescription>
                Define the role name and description
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="roleName">Role Name *</Label>
                <Input
                  id="roleName"
                  placeholder="Enter role name"
                  value={roleData.name}
                  onChange={(e) => setRoleData(prev => ({ ...prev, name: e.target.value }))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="roleDescription">Description</Label>
                <Input
                  id="roleDescription"
                  placeholder="Enter role description"
                  value={roleData.description}
                  onChange={(e) => setRoleData(prev => ({ ...prev, description: e.target.value }))}
                  className="mt-1"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Permissions */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Permissions</CardTitle>
              <CardDescription>
                Configure permissions for different system entities
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : availablePermissions ? (
                <div className="space-y-6">
                  {availablePermissions.entityTypes.map((entity) => (
                    <div key={entity.value} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-medium text-lg">{entity.label}</h3>
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSelectAll(entity.value, true)}
                          >
                            Select All
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSelectAll(entity.value, false)}
                          >
                            Clear All
                          </Button>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {availablePermissions.permissions.map((permission) => (
                          <div key={permission.value} className="flex items-center space-x-3">
                            <Checkbox
                              id={`${entity.value}-${permission.value}`}
                              checked={roleData.permissions[entity.value]?.[permission.value] || false}
                              onCheckedChange={(checked) => 
                                handlePermissionChange(entity.value, permission.value, checked as boolean)
                              }
                            />
                            <Label 
                              htmlFor={`${entity.value}-${permission.value}`}
                              className="text-sm font-medium"
                            >
                              {permission.label}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  {error || 'Loading permissions...'}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end space-x-4">
        <Button
          variant="outline"
          onClick={() => router.back()}
          disabled={loading}
        >
          Cancel
        </Button>
        <Button
          onClick={handleCreateRole}
          disabled={loading || !roleData.name.trim()}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Creating...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Create Role
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

export default function CreateRolePage() {
  return (
    <AuthGuard>
      <PermissionGuard requiredPermission={{ entityType: 'SYSTEM_CONFIG_ROLES', permission: 'ADD' }}>
        <CreateRoleContent />
      </PermissionGuard>
    </AuthGuard>
  );
} 