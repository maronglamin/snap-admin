'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Search, 
  MoreVertical, 
  Edit, 
  Trash2, 
  Users,
  Building,
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { operatorEntitiesApi } from '@/services/api';
import { useAuthStore } from '@/stores/authStore';

interface Role {
  id: string;
  name: string;
  description: string;
}

interface OperatorEntity {
  id: string;
  name: string;
  description: string;
  roleId: string;
  roleName: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  assignedUsers: number;
  users: unknown[];
}

export default function OperatorEntityPage() {
  const router = useRouter();
  const { isAuthenticated, checkAuth } = useAuthStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [entities, setEntities] = useState<OperatorEntity[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingEntity, setEditingEntity] = useState<OperatorEntity | null>(null);
  const [roleSearchOpen, setRoleSearchOpen] = useState(false);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 10; // Show 10 records per page

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    roleId: ''
  });

  // Check authentication on mount
  useEffect(() => {
    if (!isAuthenticated || !checkAuth()) {
      router.push('/');
      return;
    }
    loadData();
  }, [isAuthenticated, router, checkAuth]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      const [entitiesResponse, rolesResponse] = await Promise.all([
        operatorEntitiesApi.getAll(),
        operatorEntitiesApi.getRoles()
      ]);
      
      setEntities(entitiesResponse.data);
      setRoles(rolesResponse.data);
      
      // Calculate pagination
      const total = entitiesResponse.data.length;
      setTotalPages(Math.ceil(total / itemsPerPage));
    } catch (error) {
      console.error('Error loading data:', error);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const filteredEntities = entities.filter(entity =>
    entity.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    entity.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    entity.roleName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Get paginated entities
  const paginatedEntities = filteredEntities.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleCreateEntity = async () => {
    if (!formData.name || !formData.roleId) {
      setError('Name and role are required');
      return;
    }

    try {
      const response = await operatorEntitiesApi.create(formData);
      setEntities(prev => [response.data, ...prev]);
      setIsCreateDialogOpen(false);
      setFormData({ name: '', description: '', roleId: '' });
      setError('');
    } catch (error: unknown) {
      console.error('Error creating entity:', error);
      setError(error instanceof Error ? error.message : 'Failed to create entity');
    }
  };

  const handleUpdateEntity = async () => {
    if (!editingEntity) return;

    try {
      const response = await operatorEntitiesApi.update(editingEntity.id, {
        name: editingEntity.name,
        description: editingEntity.description,
        roleId: editingEntity.roleId
      });
      
      setEntities(prev => prev.map(entity => 
        entity.id === editingEntity.id ? response.data : entity
      ));
      setEditingEntity(null);
      setError('');
    } catch (error: unknown) {
      console.error('Error updating entity:', error);
      setError(error instanceof Error ? error.message : 'Failed to update entity');
    }
  };

  const handleDeleteEntity = async (entityId: string) => {
    try {
      await operatorEntitiesApi.delete(entityId);
      setEntities(prev => prev.filter(entity => entity.id !== entityId));
    } catch (error: unknown) {
      console.error('Error deleting entity:', error);
      setError(error instanceof Error ? error.message : 'Failed to delete entity');
    }
  };

  const resetForm = () => {
    setFormData({ name: '', description: '', roleId: '' });
    setError('');
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-gray-600">Loading operator entities...</div>
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
            <CardTitle className="text-sm font-medium">Total Entities</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{entities.length}</div>
            <p className="text-xs text-muted-foreground">
              Operator entities
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Entities</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {entities.filter(entity => entity.isActive).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Currently active
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {entities.reduce((sum, entity) => sum + entity.assignedUsers, 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Assigned users
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Management */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Entity Management</CardTitle>
              <CardDescription>
                Manage operator entities and their role assignments
              </CardDescription>
            </div>
            <Sheet open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <SheetTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Entity
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[25%] sm:w-[400px] p-6">
                <SheetHeader className="pb-6">
                  <SheetTitle>Create New Operator Entity</SheetTitle>
                  <SheetDescription>
                    Create a new operator entity and assign it to a role.
                  </SheetDescription>
                </SheetHeader>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label htmlFor="name" className="text-sm font-medium">
                      Entity Name *
                    </label>
                    <Input
                      id="name"
                      placeholder="Enter entity name"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="description" className="text-sm font-medium">
                      Description
                    </label>
                    <Input
                      id="description"
                      placeholder="Enter entity description"
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="role" className="text-sm font-medium">
                      Role *
                    </label>
                    <Popover open={roleSearchOpen} onOpenChange={setRoleSearchOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={roleSearchOpen}
                          className="w-full justify-between"
                        >
                          {formData.roleId
                            ? roles.find((role) => role.id === formData.roleId)?.name
                            : "Select a role..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0">
                        <Command>
                          <CommandInput placeholder="Search roles..." />
                          <CommandList>
                            <CommandEmpty>No role found.</CommandEmpty>
                            <CommandGroup>
                              {roles.map((role) => (
                                <CommandItem
                                  key={role.id}
                                  value={`${role.name} ${role.description}`}
                                  onSelect={() => {
                                    setFormData(prev => ({ ...prev, roleId: role.id }));
                                    setRoleSearchOpen(false);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      formData.roleId === role.id ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  <div className="flex flex-col">
                                    <span className="font-medium">{role.name}</span>
                                    <span className="text-sm text-muted-foreground">{role.description}</span>
                                  </div>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
                <div className="flex justify-end space-x-2 pt-6 border-t mt-6">
                  <Button variant="outline" onClick={() => {
                    setIsCreateDialogOpen(false);
                    resetForm();
                  }}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateEntity}>
                    Create Entity
                  </Button>
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
                placeholder="Search entities..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Entities List */}
          <div className="space-y-4">
            {paginatedEntities.map((entity) => (
              <Card key={entity.id} className="border-l-4 border-l-blue-500">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Building className="h-5 w-5 text-blue-600" />
                        {entity.name}
                        {!entity.isActive && (
                          <Badge variant="outline">Inactive</Badge>
                        )}
                      </CardTitle>
                      <CardDescription>
                        {entity.description}
                        {entity.createdBy && (
                          <span className="block text-xs text-gray-500 mt-1">
                            Created by: {entity.createdBy}
                          </span>
                        )}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" onClick={() => setEditingEntity(entity)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Users className="mr-2 h-4 w-4" />
                            View Users ({entity.assignedUsers})
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setEditingEntity(entity)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit Entity
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="text-red-600"
                            onClick={() => handleDeleteEntity(entity.id)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete Entity
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Role:</span> {entity.roleName}
                    </div>
                    <div>
                      <span className="font-medium">Assigned Users:</span> {entity.assignedUsers}
                    </div>
                    <div>
                      <span className="font-medium">Created:</span> {new Date(entity.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <div className="text-sm text-gray-700">
                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredEntities.length)} of {filteredEntities.length} results
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

          {paginatedEntities.length === 0 && (
            <div className="text-center py-8">
              <Building className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No entities found</h3>
              <p className="mt-1 text-sm text-gray-500">
                Try adjusting your search criteria or create a new entity.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      {editingEntity && (
        <Dialog open={!!editingEntity} onOpenChange={() => setEditingEntity(null)}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Edit Operator Entity</DialogTitle>
              <DialogDescription>
                Update the operator entity details and role assignment.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label htmlFor="edit-name" className="text-sm font-medium">
                  Entity Name *
                </label>
                <Input
                  id="edit-name"
                  placeholder="Enter entity name"
                  value={editingEntity.name}
                  onChange={(e) => setEditingEntity(prev => prev ? { ...prev, name: e.target.value } : null)}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="edit-description" className="text-sm font-medium">
                  Description
                </label>
                <Input
                  id="edit-description"
                  placeholder="Enter entity description"
                  value={editingEntity.description}
                  onChange={(e) => setEditingEntity(prev => prev ? { ...prev, description: e.target.value } : null)}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="edit-role" className="text-sm font-medium">
                  Role *
                </label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className="w-full justify-between"
                    >
                      {editingEntity.roleId
                        ? roles.find((role) => role.id === editingEntity.roleId)?.name
                        : "Select a role..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0">
                    <Command>
                      <CommandInput placeholder="Search roles..." />
                      <CommandList>
                        <CommandEmpty>No role found.</CommandEmpty>
                        <CommandGroup>
                          {roles.map((role) => (
                            <CommandItem
                              key={role.id}
                              value={`${role.name} ${role.description}`}
                              onSelect={() => {
                                setEditingEntity(prev => prev ? { ...prev, roleId: role.id } : null);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  editingEntity.roleId === role.id ? "opacity-100" : "opacity-0"
                                )}
                              />
                              <div className="flex flex-col">
                                <span className="font-medium">{role.name}</span>
                                <span className="text-sm text-muted-foreground">{role.description}</span>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setEditingEntity(null)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateEntity}>
                Update Entity
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
} 