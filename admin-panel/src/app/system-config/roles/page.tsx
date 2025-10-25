'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Plus, 
  Search, 
  MoreVertical, 
  Edit, 
  Trash2, 
  Eye,
  Key,
  Save,
  X,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  ChevronUp
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { rolesApi } from '@/services/api';
import { useAuthStore } from '@/stores/authStore';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { PermissionGuard } from '@/components/auth/PermissionGuard';
import { useFeatureAccess } from '@/hooks/useFeatureAccess';

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

interface Role {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  permissions: Record<string, Record<string, boolean>>;
  assignedUsers: number;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

function RolesContent() {
  const router = useRouter();
  const { isAuthenticated, checkAuth } = useAuthStore();
  const featureAccess = useFeatureAccess('SYSTEM_CONFIG_ROLES');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [availablePermissions, setAvailablePermissions] = useState<AvailablePermissions | null>(null);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 10; // Show 10 records per page
  
  // Collapsible permission sections
  const [expandedPermissions, setExpandedPermissions] = useState<Set<string>>(new Set());
  
  // Confirmation dialog state
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ roleId: string; roleName: string } | null>(null);

  // Check authentication on mount and load data
  useEffect(() => {
    if (!isAuthenticated || !checkAuth()) {
      console.log('🔍 Debug - Not authenticated, redirecting to login');
      router.push('/');
      return;
    }
    loadRoles();
    loadAvailablePermissions();
  }, [isAuthenticated, router, checkAuth]);

  const loadAvailablePermissions = async () => {
    try {
      const response = await rolesApi.getAvailablePermissions();
      setAvailablePermissions(response.data);
    } catch (error) {
      console.error('Error loading available permissions:', error);
    }
  };

  const loadRoles = async () => {
    try {
      setLoading(true);
      console.log('🔍 Debug - Loading roles...');
      const response = await rolesApi.getAll();
      console.log('🔍 Debug - Roles loaded successfully:', response.data.length);
      setRoles(response.data);
      
      // Calculate pagination
      const total = response.data.length;
      setTotalPages(Math.ceil(total / itemsPerPage));
    } catch (error) {
      console.error('Error loading roles:', error);
      setError('Failed to load roles');
    } finally {
      setLoading(false);
    }
  };

  const filteredRoles = roles.filter(role =>
    role.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    role.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Get paginated roles
  const paginatedRoles = filteredRoles.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const togglePermissions = (roleId: string) => {
    setExpandedPermissions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(roleId)) {
        newSet.delete(roleId);
      } else {
        newSet.add(roleId);
      }
      return newSet;
    });
  };

  const isPermissionsExpanded = (roleId: string) => expandedPermissions.has(roleId);

  const handlePermissionChange = (roleId: string, entityType: string, permission: string, value: boolean) => {
    if (editingRole?.id === roleId) {
      setEditingRole(prev => {
        if (!prev) return null;
        
        const updatedPermissions = {
          ...prev.permissions,
          [entityType]: {
            ...prev.permissions[entityType],
            [permission]: value
          }
        };
        
        return {
          ...prev,
          permissions: updatedPermissions
        };
      });
    }
  };

  const handleSaveRole = async () => {
    if (!editingRole) return;
    
    try {
      const response = await rolesApi.update(editingRole.id, {
        name: editingRole.name,
        description: editingRole.description,
        permissions: editingRole.permissions
      });
      
      setRoles(prev => prev.map(role => 
        role.id === editingRole.id ? response.data : role
      ));
      setEditingRole(null);
      // Collapse permissions when exiting edit mode
      setExpandedPermissions(prev => {
        const newSet = new Set(prev);
        newSet.delete(editingRole.id);
        return newSet;
      });
    } catch (error) {
      console.error('Error updating role:', error);
      setError('Failed to update role');
    }
  };

  const handleDeleteRole = async (roleId: string) => {
    try {
      console.log('🔍 Attempting to delete role:', roleId);
      const response = await rolesApi.delete(roleId);
      console.log('🔍 Delete response:', response);
      setRoles(prev => prev.filter(role => role.id !== roleId));
      setError(''); // Clear any previous errors
      setDeleteConfirmation(null); // Close confirmation dialog
    } catch (error: unknown) {
      console.error('Error deleting role:', error);
      if (error instanceof Error) {
        console.log('🔍 Error message:', error.message);
        setError(error.message);
      } else {
        console.log('🔍 Unknown error type:', typeof error);
        setError('Failed to delete role');
      }
    }
  };

  const confirmDeleteRole = (role: Role) => {
    setDeleteConfirmation({ roleId: role.id, roleName: role.name });
  };

  const handleEditRole = (role: Role) => {
    // Initialize the role with all available permissions to ensure proper editing
    if (availablePermissions) {
      const initializedPermissions: Record<string, Record<string, boolean>> = {};
      
      // Initialize all entity types with all permissions
      availablePermissions.entityTypes.forEach((entity: EntityType) => {
        initializedPermissions[entity.value] = {};
        availablePermissions.permissions.forEach((permission: Permission) => {
          // Use existing permission value or default to false
          initializedPermissions[entity.value][permission.value] = 
            role.permissions[entity.value]?.[permission.value] || false;
        });
      });
      
      const initializedRole = {
        ...role,
        permissions: initializedPermissions
      };
      
      setEditingRole(initializedRole);
    } else {
      setEditingRole(role);
    }
    
    // Automatically expand permissions when entering edit mode
    setExpandedPermissions(prev => {
      const newSet = new Set(prev);
      newSet.add(role.id);
      return newSet;
    });
  };

  const handleCancelEdit = () => {
    setEditingRole(null);
    // Collapse permissions when canceling edit
    if (editingRole) {
      setExpandedPermissions(prev => {
        const newSet = new Set(prev);
        newSet.delete(editingRole.id);
        return newSet;
      });
    }
  };

  const handleSelectAll = (roleId: string, entityType: string, value: boolean) => {
    if (!editingRole || editingRole.id !== roleId || !availablePermissions) return;
    
    setEditingRole(prev => {
      if (!prev) return null;
      
      const updatedPermissions = { ...prev.permissions };
      updatedPermissions[entityType] = {};
      
      availablePermissions.permissions.forEach((permission: Permission) => {
        updatedPermissions[entityType][permission.value] = value;
      });
      
      return {
        ...prev,
        permissions: updatedPermissions
      };
    });
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-gray-600">Loading roles...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-100 text-red-700 rounded-md">
          {error}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Roles</CardTitle>
            <Key className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{roles.length}</div>
            <p className="text-xs text-muted-foreground">
              System roles
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Roles</CardTitle>
            <Key className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {roles.filter(role => role.isActive).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Currently active
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Permission Sets</CardTitle>
            <Key className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
                            <div className="text-2xl font-bold">{availablePermissions?.entityTypes.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              Entity types
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Roles Management</CardTitle>
              <CardDescription>
                Configure roles and their permissions for different system entities
              </CardDescription>
            </div>
            {featureAccess.canAdd && (
              <Button 
                className="bg-blue-600 hover:bg-blue-700"
                onClick={() => router.push('/system-config/roles/create')}
              >
                <Plus className="mr-2 h-4 w-4" />
                Create Role
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search roles..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Roles List */}
          <div className="space-y-6">
            {paginatedRoles.map((role) => (
              <Card key={role.id} className="border-l-4 border-l-blue-500">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <Key className="h-5 w-5 text-blue-600" />
                          {role.name}
                          {!role.isActive && (
                            <Badge variant="outline">Inactive</Badge>
                          )}
                        </CardTitle>
                        <CardDescription>
                          {role.description}
                          {role.createdBy && (
                            <span className="block text-xs text-gray-500 mt-1">
                              Created by: {role.createdBy}
                            </span>
                          )}
                        </CardDescription>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => togglePermissions(role.id)}
                        className="ml-2"
                      >
                        {isPermissionsExpanded(role.id) ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    <div className="flex items-center gap-2">
                      {editingRole?.id === role.id ? (
                        <>
                          <Button size="sm" onClick={handleSaveRole}>
                            <Save className="mr-2 h-4 w-4" />
                            Save
                          </Button>
                          <Button size="sm" variant="outline" onClick={handleCancelEdit}>
                            <X className="mr-2 h-4 w-4" />
                            Cancel
                          </Button>
                        </>
                      ) : (
                        <>
                          {featureAccess.canEdit && (
                            <Button size="sm" variant="outline" onClick={() => handleEditRole(role)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </Button>
                          )}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => togglePermissions(role.id)}>
                                <Eye className="mr-2 h-4 w-4" />
                                {isPermissionsExpanded(role.id) ? 'Hide' : 'Show'} Permissions
                              </DropdownMenuItem>
                              {featureAccess.canEdit && (
                                <DropdownMenuItem onClick={() => handleEditRole(role)}>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Edit Role
                                </DropdownMenuItem>
                              )}
                              {featureAccess.canDelete && (
                                <DropdownMenuItem 
                                  className="text-red-600"
                                  onClick={() => confirmDeleteRole(role)}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete Role
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </>
                      )}
                    </div>
                  </div>
                </CardHeader>
                
                {/* Collapsible Permissions Section */}
                {isPermissionsExpanded(role.id) && (
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-sm text-gray-700">Permissions</h4>
                        {editingRole?.id === role.id && (
                          <Badge variant="secondary" className="text-xs">
                            Editing Mode
                          </Badge>
                        )}
                      </div>
                      <div className="space-y-6">
                        {/* Group by main menus */}
                        {availablePermissions?.entityTypes
                          .filter((entity: EntityType) => entity.type === 'main')
                          .map((mainEntity: EntityType) => {
                            const submenus = availablePermissions.entityTypes.filter((entity: EntityType) => 
                              entity.type === 'submenu' && entity.parent === mainEntity.value
                            );
                            
                            return (
                              <div key={mainEntity.value} className="border rounded-lg p-4">
                                <h5 className="font-semibold text-sm mb-4 text-gray-800 border-b pb-2">
                                  {mainEntity.label}
                                </h5>
                                
                                {/* Main menu permissions */}
                                <div className="mb-4">
                                  <div className="flex items-center justify-between mb-2">
                                    <h6 className="font-medium text-xs text-gray-600 uppercase tracking-wide">
                                      Main Menu
                                    </h6>
                                    {editingRole?.id === role.id && (
                                      <div className="flex space-x-2">
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => handleSelectAll(role.id, mainEntity.value, true)}
                                          className="text-xs"
                                        >
                                          Select All
                                        </Button>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => handleSelectAll(role.id, mainEntity.value, false)}
                                          className="text-xs"
                                        >
                                          Clear All
                                        </Button>
                                      </div>
                                    )}
                                  </div>
                                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
                                    {availablePermissions?.permissions.map((permission: Permission) => (
                                      <div key={permission.value} className="flex items-center space-x-2">
                                        <Checkbox
                                          id={`${role.id}-${mainEntity.value}-${permission.value}`}
                                          checked={
                                            editingRole?.id === role.id 
                                              ? editingRole.permissions[mainEntity.value]?.[permission.value] || false
                                              : role.permissions[mainEntity.value]?.[permission.value] || false
                                          }
                                          onCheckedChange={(checked) => 
                                            handlePermissionChange(role.id, mainEntity.value, permission.value, checked as boolean)
                                          }
                                          disabled={editingRole?.id !== role.id}
                                        />
                                        <Label 
                                          htmlFor={`${role.id}-${mainEntity.value}-${permission.value}`}
                                          className="text-xs"
                                        >
                                          {permission.label}
                                        </Label>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                                
                                {/* Submenu permissions */}
                                {submenus.length > 0 && (
                                  <div className="space-y-3">
                                    <h6 className="font-medium text-xs text-gray-600 uppercase tracking-wide">
                                      Submenus
                                    </h6>
                                    {submenus.map((submenu: EntityType) => (
                                      <div key={submenu.value} className="ml-4 border-l-2 border-gray-200 pl-4">
                                        <div className="flex items-center justify-between mb-2">
                                          <div className="font-medium text-sm text-gray-700">
                                            {submenu.label}
                                          </div>
                                          {editingRole?.id === role.id && (
                                            <div className="flex space-x-2">
                                              <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleSelectAll(role.id, submenu.value, true)}
                                                className="text-xs"
                                              >
                                                Select All
                                              </Button>
                                              <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleSelectAll(role.id, submenu.value, false)}
                                                className="text-xs"
                                              >
                                                Clear All
                                              </Button>
                                            </div>
                                          )}
                                        </div>
                                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
                                          {availablePermissions?.permissions.map((permission: Permission) => (
                                            <div key={permission.value} className="flex items-center space-x-2">
                                              <Checkbox
                                                id={`${role.id}-${submenu.value}-${permission.value}`}
                                                checked={
                                                  editingRole?.id === role.id 
                                                    ? editingRole.permissions[submenu.value]?.[permission.value] || false
                                                    : role.permissions[submenu.value]?.[permission.value] || false
                                                }
                                                onCheckedChange={(checked) => 
                                                  handlePermissionChange(role.id, submenu.value, permission.value, checked as boolean)
                                                }
                                                disabled={editingRole?.id !== role.id}
                                              />
                                              <Label 
                                                htmlFor={`${role.id}-${submenu.value}-${permission.value}`}
                                                className="text-xs"
                                              >
                                                {permission.label}
                                              </Label>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <div className="text-sm text-gray-700">
                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredRoles.length)} of {filteredRoles.length} results
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <div className="text-sm">
                  Page {currentPage} of {totalPages}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {paginatedRoles.length === 0 && (
            <div className="text-center py-8">
              <Key className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No roles found</h3>
              <p className="mt-1 text-sm text-gray-500">
                Try adjusting your search criteria or create a new role.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      {deleteConfirmation && (
        <div className="fixed inset-0 bg-gray-900/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-gray-200 max-w-md w-full mx-4 transform transition-all duration-200 ease-out">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                    <Trash2 className="h-5 w-5 text-red-600" />
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Delete Role</h3>
                  <p className="text-sm text-gray-500">This action cannot be undone</p>
                </div>
              </div>
              
              <div className="mb-6">
                <p className="text-sm text-gray-700 leading-relaxed">
                  Are you sure you want to delete the role <span className="font-medium text-gray-900">&quot;{deleteConfirmation.roleName}&quot;</span>?
                </p>
                <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <div className="flex-shrink-0 mt-0.5">
                      <div className="w-4 h-4 bg-amber-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs font-bold">!</span>
                      </div>
                    </div>
                    <div className="text-xs text-amber-800">
                      <p className="font-medium mb-1">Important:</p>
                      <ul className="space-y-1 text-amber-700">
                        <li>• All permissions associated with this role will be removed</li>
                        <li>• Empty operator entities will be automatically deleted</li>
                        <li>• Users assigned to this role will need to be reassigned</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-3 justify-end">
                <Button 
                  variant="outline" 
                  onClick={() => setDeleteConfirmation(null)}
                  className="px-4 py-2"
                >
                  Cancel
                </Button>
                <Button 
                  variant="destructive" 
                  onClick={() => handleDeleteRole(deleteConfirmation.roleId)}
                  className="px-4 py-2"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Role
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function RolesPage() {
  return (
    <AuthGuard>
      <PermissionGuard requiredPermission={{ entityType: 'SYSTEM_CONFIG_ROLES', permission: 'VIEW' }}>
        <RolesContent />
      </PermissionGuard>
    </AuthGuard>
  );
} 