'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Search, 
  Filter, 
  MoreVertical, 
  Edit, 
  Trash2, 
  Eye,
  Shield,
  UserPlus,
  Users,
  Loader2,
  X,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { adminUsersApi } from '@/services/api';
import { useAdminStore } from '@/stores/adminStore';

interface AdminUser {
  id: string;
  username: string;
  email: string;
  name: string;
  isActive: boolean;
  lastLogin: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  operatorEntityId: string;
  operatorEntityName: string;
  roleName: string;
  mfaEnabled?: boolean;
  mfaVerified?: boolean;
}

interface OperatorEntity {
  id: string;
  name: string;
  description: string;
  roleId: string;
  roleName: string;
}

export default function SystemOperatorPage() {
  const { addNotification } = useAdminStore();
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [operatorEntities, setOperatorEntities] = useState<OperatorEntity[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [isCreateSheetOpen, setIsCreateSheetOpen] = useState(false);
  const [isEditSheetOpen, setIsEditSheetOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [resetPassword, setResetPassword] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 10; // Show 10 records per page
  
  // Form state
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    name: '',
    password: '',
    operatorEntityId: '',
    mfaEnabled: false,
    mfaVerified: false,
  });

  // Get unique roles from operator entities
  const uniqueRoles = React.useMemo(() => {
    const roles = operatorEntities.map(entity => entity.roleName);
    return [...new Set(roles)].sort();
  }, [operatorEntities]);

  // Load data on component mount
  useEffect(() => {
    loadData();
  }, []);

  // Reset to first page when search or filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterRole]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError('');
      
      const [usersResponse, entitiesResponse] = await Promise.all([
        adminUsersApi.getAll(),
        adminUsersApi.getOperatorEntities()
      ]);
      
      setAdminUsers(usersResponse.data || []);
      setOperatorEntities(entitiesResponse.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
      setError('Failed to load admin users');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateUser = async () => {
    try {
      setError('');
      
      const response = await adminUsersApi.create(formData);
      setAdminUsers(prev => [response.data, ...prev]);
      setIsCreateSheetOpen(false);
      resetForm();
    } catch (error: any) {
      console.error('Error creating user:', error);
      setError(error.message || 'Failed to create user');
    }
  };

  const handleEditUser = async () => {
    if (!selectedUser) return;
    
    try {
      setError('');
      
      const updateData = {
        email: formData.email,
        username: formData.username,
        name: formData.name,
        operatorEntityId: formData.operatorEntityId,
        isActive: selectedUser.isActive,
        mfaEnabled: formData.mfaEnabled,
      };
      
      const response = await adminUsersApi.update(selectedUser.id, updateData);
      setAdminUsers(prev => prev.map(user => 
        user.id === selectedUser.id ? response.data : user
      ));
      setIsEditSheetOpen(false);
      resetForm();
      setSelectedUser(null);
    } catch (error: any) {
      console.error('Error updating user:', error);
      setError(error.message || 'Failed to update user');
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    
    try {
      await adminUsersApi.delete(selectedUser.id);
      setAdminUsers(prev => prev.filter(user => user.id !== selectedUser.id));
      setIsDeleteDialogOpen(false);
      setSelectedUser(null);
    } catch (error: any) {
      console.error('Error deleting user:', error);
      setError(error.message || 'Failed to delete user');
    }
  };

  const openResetPassword = (user: AdminUser) => {
    setSelectedUser(user);
    setResetPassword('');
    setIsResetDialogOpen(true);
  };

  const handleResetPassword = async () => {
    if (!selectedUser || !resetPassword) return;
    try {
      setIsResetting(true);
      setError('');
      const response = await adminUsersApi.resetPassword(selectedUser.id, resetPassword);
      setAdminUsers(prev => prev.map(u => u.id === selectedUser.id ? response.data : u));
      setIsResetDialogOpen(false);
      setSelectedUser(null);
      setResetPassword('');
      addNotification({
        type: 'success',
        title: 'Password Reset',
        message: 'The password has been reset successfully.'
      });
    } catch (e: any) {
      console.error('Error resetting password:', e);
      setError(e.message || 'Failed to reset password');
    } finally {
      setIsResetting(false);
    }
  };



  const openEditUser = (user: AdminUser) => {
    setSelectedUser(user);
    setFormData({
      username: user.username,
      email: user.email,
      name: user.name,
      password: '', // Don't populate password for edit
      operatorEntityId: user.operatorEntityId,
      mfaEnabled: user.mfaEnabled || false,
      mfaVerified: user.mfaVerified || false,
    });
    setIsEditSheetOpen(true);
  };

  const openViewUser = (user: AdminUser) => {
    setSelectedUser(user);
    setIsViewDialogOpen(true);
  };

  const openDeleteUser = (user: AdminUser) => {
    setSelectedUser(user);
    setIsDeleteDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      username: '',
      email: '',
      password: '',
      name: '',
      operatorEntityId: '',
      mfaEnabled: false,
      mfaVerified: false,
    });
  };

  const filteredUsers = adminUsers.filter(user => {
    const matchesSearch = 
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterRole === 'all' || user.roleName === filterRole;
    
    return matchesSearch && matchesFilter;
  });

  // Calculate pagination
  const total = filteredUsers.length;
  const totalPagesCalculated = Math.ceil(total / itemsPerPage);
  
  // Update total pages when filtered results change
  React.useEffect(() => {
    setTotalPages(totalPagesCalculated);
    // Reset to first page if current page is beyond new total
    if (currentPage > totalPagesCalculated && totalPagesCalculated > 0) {
      setCurrentPage(1);
    }
  }, [totalPagesCalculated, currentPage]);

  // Get paginated users
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const getRoleBadgeVariant = (roleName: string) => {
    switch (roleName) {
      case 'Super Admin': return 'destructive';
      case 'Manager': return 'default';
      case 'Support': return 'secondary';
      default: return 'outline';
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading admin users...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Admins</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{adminUsers.length}</div>
            <p className="text-xs text-muted-foreground">
              System operators
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {adminUsers.filter(user => user.isActive).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Currently active
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Super Admins</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {adminUsers.filter(user => user.roleName === 'Super Admin').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Full access
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Managers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {adminUsers.filter(user => user.roleName === 'Manager').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Limited access
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Admin Users Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Admin Users</CardTitle>
              <CardDescription>
                Manage system operators and their permissions
              </CardDescription>
            </div>
            <Sheet open={isCreateSheetOpen} onOpenChange={setIsCreateSheetOpen}>
              <SheetTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <UserPlus className="mr-2 h-4 w-4" />
                  Add Admin User
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[400px] sm:w-[540px] p-0">
                <div className="flex flex-col h-full">
                  <SheetHeader className="px-6 py-4 border-b">
                    <SheetTitle>Create New Admin User</SheetTitle>
                    <SheetDescription>
                      Add a new system operator with entity assignment.
                    </SheetDescription>
                  </SheetHeader>
                  
                  <div className="flex-1 overflow-y-auto px-6 py-4">
                    {error && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-lg mb-4">
                        <p className="text-sm text-red-600">{error}</p>
                      </div>
                    )}
                    
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="username">Username</Label>
                        <Input
                          id="username"
                          placeholder="Enter username"
                          value={formData.username}
                          onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="Enter email"
                          value={formData.email}
                          onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="name">Full Name</Label>
                        <Input
                          id="name"
                          placeholder="Enter full name"
                          value={formData.name}
                          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="password">Password</Label>
                        <Input
                          id="password"
                          type="password"
                          placeholder="Enter password"
                          value={formData.password}
                          onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="entity">Entity *</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              role="combobox"
                              className="w-full justify-between"
                            >
                              {formData.operatorEntityId
                                ? operatorEntities.find((entity) => entity.id === formData.operatorEntityId)?.name
                                : "Select entity..."}
                              <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-full p-0">
                            <Command>
                              <CommandInput placeholder="Search entities..." />
                              <CommandList>
                                <CommandEmpty>No entity found.</CommandEmpty>
                                <CommandGroup>
                                  {operatorEntities.map((entity) => (
                                    <CommandItem
                                      key={entity.id}
                                      value={`${entity.name} ${entity.roleName}`}
                                      onSelect={() => {
                                        setFormData(prev => ({ ...prev, operatorEntityId: entity.id }));
                                      }}
                                    >
                                      <Check
                                        className={`mr-2 h-4 w-4 ${
                                          formData.operatorEntityId === entity.id ? "opacity-100" : "opacity-0"
                                        }`}
                                      />
                                      <div className="flex flex-col">
                                        <span>{entity.name}</span>
                                        <span className="text-xs text-gray-500">({entity.roleName})</span>
                                      </div>
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                        <p className="text-xs text-gray-500">
                          The user will inherit the role from the selected entity
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="px-6 py-4 border-t bg-gray-50">
                    <div className="flex gap-3 justify-end">
                      <Button 
                        variant="outline" 
                        onClick={() => {
                          setIsCreateSheetOpen(false);
                          resetForm();
                          setError('');
                        }}
                      >
                        Cancel
                      </Button>
                      <Button 
                        onClick={handleCreateUser}
                        disabled={!formData.username || !formData.email || !formData.name || !formData.password || !formData.operatorEntityId}
                      >
                        Create User
                      </Button>
                    </div>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by username, email, or name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  className="sm:w-[200px] justify-between"
                >
                  {filterRole === 'all' 
                    ? "All Roles" 
                    : filterRole}
                  <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[200px] p-0">
                <Command>
                  <CommandInput placeholder="Search roles..." />
                  <CommandList>
                    <CommandEmpty>No role found.</CommandEmpty>
                    <CommandGroup>
                      <CommandItem
                        value="all"
                        onSelect={() => setFilterRole('all')}
                      >
                        <Check
                          className={`mr-2 h-4 w-4 ${
                            filterRole === 'all' ? "opacity-100" : "opacity-0"
                          }`}
                        />
                        All Roles
                      </CommandItem>
                      {uniqueRoles.map((role) => (
                        <CommandItem
                          key={role}
                          value={role}
                          onSelect={() => setFilterRole(role)}
                        >
                          <Check
                            className={`mr-2 h-4 w-4 ${
                              filterRole === role ? "opacity-100" : "opacity-0"
                            }`}
                          />
                          {role}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Users Table */}
          <div className="space-y-4">
            {paginatedUsers.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <Shield className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="font-medium text-gray-900">{user.name}</h3>
                      <Badge variant={getRoleBadgeVariant(user.roleName)}>
                        {user.roleName}
                      </Badge>
                      {!user.isActive && (
                        <Badge variant="outline">Inactive</Badge>
                      )}
                      <Badge variant="secondary" className="text-xs">
                        {user.operatorEntityName}
                      </Badge>
                      {user.mfaEnabled && (
                        <Badge variant="default" className="text-xs bg-green-100 text-green-800 border-green-200">
                          MFA Active
                        </Badge>
                      )}
                      {user.mfaVerified && (
                        <Badge variant="default" className="text-xs bg-blue-100 text-blue-800 border-blue-200">
                          MFA Verified
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">
                      {user.username} • {user.email}
                    </p>
                    <p className="text-xs text-gray-500">
                      Last login: {formatDate(user.lastLogin)}
                      {user.createdBy && (
                        <span className="block">
                          Created by: {user.createdBy}
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => openViewUser(user)}>
                      <Eye className="mr-2 h-4 w-4" />
                      View Details
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => openEditUser(user)}>
                      <Edit className="mr-2 h-4 w-4" />
                      Edit User
                    </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => openResetPassword(user)}>
                    <Shield className="mr-2 h-4 w-4" />
                    Reset Password
                  </DropdownMenuItem>
                    <DropdownMenuItem 
                      className="text-red-600"
                      onClick={() => openDeleteUser(user)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete User
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <div className="text-sm text-gray-700">
                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredUsers.length)} of {filteredUsers.length} results
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

          {paginatedUsers.length === 0 && (
            <div className="text-center py-8">
              <Users className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No users found</h3>
              <p className="mt-1 text-sm text-gray-500">
                Try adjusting your search or filter criteria.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit User Sheet */}
      <Sheet open={isEditSheetOpen} onOpenChange={setIsEditSheetOpen}>
        <SheetContent side="right" className="w-[400px] sm:w-[540px] p-0">
          <div className="flex flex-col h-full">
            <SheetHeader className="px-6 py-4 border-b">
              <SheetTitle>Edit Admin User</SheetTitle>
              <SheetDescription>
                Update user information and entity assignment.
              </SheetDescription>
            </SheetHeader>
            
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg mb-4">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-username">Username</Label>
                  <Input
                    id="edit-username"
                    placeholder="Enter username"
                    value={formData.username}
                    onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="edit-email">Email</Label>
                  <Input
                    id="edit-email"
                    type="email"
                    placeholder="Enter email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="edit-name">Full Name</Label>
                  <Input
                    id="edit-name"
                    placeholder="Enter full name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="edit-entity">Entity *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        className="w-full justify-between"
                      >
                        {formData.operatorEntityId
                          ? operatorEntities.find((entity) => entity.id === formData.operatorEntityId)?.name
                          : "Select entity..."}
                        <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0">
                      <Command>
                        <CommandInput placeholder="Search entities..." />
                        <CommandList>
                          <CommandEmpty>No entity found.</CommandEmpty>
                          <CommandGroup>
                            {operatorEntities.map((entity) => (
                              <CommandItem
                                key={entity.id}
                                value={`${entity.name} ${entity.roleName}`}
                                onSelect={() => {
                                  setFormData(prev => ({ ...prev, operatorEntityId: entity.id }));
                                }}
                              >
                                <Check
                                  className={`mr-2 h-4 w-4 ${
                                    formData.operatorEntityId === entity.id ? "opacity-100" : "opacity-0"
                                  }`}
                                />
                                <div className="flex flex-col">
                                  <span>{entity.name}</span>
                                  <span className="text-xs text-gray-500">({entity.roleName})</span>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                {/* MFA Toggle Section */}
                <div className="space-y-3 pt-4 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm font-medium text-gray-700">MFA Status</Label>
                      <p className="text-xs text-gray-500 mt-1">
                        {formData.mfaEnabled 
                          ? 'Two-factor authentication is enabled'
                          : 'Two-factor authentication is disabled'
                        }
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, mfaEnabled: !prev.mfaEnabled }))}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                          formData.mfaEnabled ? 'bg-blue-600' : 'bg-gray-200'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            formData.mfaEnabled ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                      <span className="text-sm text-gray-600">
                        {formData.mfaEnabled ? 'ON' : 'OFF'}
                      </span>
                    </div>
                  </div>
                  
                  {formData.mfaEnabled && (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <Shield className="w-4 h-4 text-blue-600" />
                        <span className="text-sm text-blue-800">
                          MFA will be enabled for this user. They will need to complete MFA setup on next login.
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="px-6 py-4 border-t bg-gray-50">
              <div className="flex gap-3 justify-end">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setIsEditSheetOpen(false);
                    resetForm();
                    setError('');
                    setSelectedUser(null);
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleEditUser}
                  disabled={!formData.username || !formData.email || !formData.name || !formData.operatorEntityId}
                >
                  Update User
                </Button>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* View User Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
            <DialogDescription>
              View detailed information about the admin user.
            </DialogDescription>
          </DialogHeader>
          
          {selectedUser && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-500">Name</Label>
                  <p className="text-sm">{selectedUser.name}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Username</Label>
                  <p className="text-sm">{selectedUser.username}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Email</Label>
                  <p className="text-sm">{selectedUser.email}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Status</Label>
                  <Badge variant={selectedUser.isActive ? "default" : "outline"}>
                    {selectedUser.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Role</Label>
                  <Badge variant={getRoleBadgeVariant(selectedUser.roleName)}>
                    {selectedUser.roleName}
                  </Badge>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Entity</Label>
                  <p className="text-sm">{selectedUser.operatorEntityName}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Last Login</Label>
                  <p className="text-sm">{formatDate(selectedUser.lastLogin)}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Created</Label>
                  <p className="text-sm">{formatDate(selectedUser.createdAt)}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">MFA Status</Label>
                  <div className="flex items-center space-x-2">
                    {selectedUser.mfaEnabled ? (
                      <Badge variant="default" className="text-xs bg-green-100 text-green-800 border-green-200">
                        MFA Active
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs">
                        MFA Disabled
                      </Badge>
                    )}
                    {selectedUser.mfaVerified && (
                      <Badge variant="default" className="text-xs bg-blue-100 text-blue-800 border-blue-200">
                        Verified
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this admin user? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          {selectedUser && (
            <div className="space-y-4">
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">
                  You are about to delete <strong>{selectedUser.name}</strong> ({selectedUser.email})
                </p>
              </div>
              
              <div className="flex gap-3 justify-end">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setIsDeleteDialogOpen(false);
                    setSelectedUser(null);
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  variant="destructive"
                  onClick={handleDeleteUser}
                >
                  Delete User
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              This will override the current password for the selected admin user.
            </DialogDescription>
          </DialogHeader>

          {selectedUser && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="new-password">New Password</Label>
                <Input
                  id="new-password"
                  type="password"
                  placeholder="Enter new password"
                  value={resetPassword}
                  onChange={(e) => setResetPassword(e.target.value)}
                />
                <p className="text-xs text-gray-500 mt-1">Minimum 6 characters.</p>
              </div>
              <div className="flex gap-3 justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsResetDialogOpen(false);
                    setSelectedUser(null);
                    setResetPassword('');
                  }}
                >
                  Cancel
                </Button>
                <Button onClick={handleResetPassword} disabled={!resetPassword || isResetting}>
                  {isResetting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Reset Password
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
} 