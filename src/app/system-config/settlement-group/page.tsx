'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  MoreVertical, 
  Plus,
  Edit,
  Trash2,
  DollarSign,
  Settings,
  CheckCircle,
  XCircle,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Percent,
  FileText,
  Calendar
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
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ucpApi } from '@/services/api';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface SettlementGroup {
  id: string;
  name: string;
  value: number;
  description: string | null;
  serviceType: string | null;
  isActive: boolean;
  metadata: any;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

export default function SettlementGroupPage() {
  const [settlementGroups, setSettlementGroups] = useState<SettlementGroup[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<SettlementGroup | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [filterServiceType, setFilterServiceType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [settlementToDelete, setSettlementToDelete] = useState<SettlementGroup | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    value: '',
    description: '',
    serviceType: '',
    isActive: true,
    feeType: '',
    gateway: '',
    minAmount: '',
    maxAmount: '',
  });
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalGroups, setTotalGroups] = useState(0);
  const itemsPerPage = 10;

  // Debounced search effect
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Reset to first page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchQuery]);

  // Load settlement groups
  useEffect(() => {
    loadSettlementGroups();
  }, [currentPage, debouncedSearchQuery, filterServiceType, filterStatus]);

  const loadSettlementGroups = async () => {
    try {
      setIsLoading(true);
      setError('');
      
      const params: any = {
        page: currentPage,
        limit: itemsPerPage,
      };

      if (debouncedSearchQuery) {
        params.search = debouncedSearchQuery;
      }

      if (filterServiceType !== 'all') {
        params.serviceType = filterServiceType;
      }

      if (filterStatus !== 'all') {
        params.isActive = filterStatus;
      }

      const response = await ucpApi.getAll(params);
      
      setSettlementGroups(response.data || []);
      setTotalGroups(response.pagination?.total || 0);
      setTotalPages(response.pagination?.totalPages || 1);
    } catch (error) {
      console.error('Error loading settlement groups:', error);
      setError('Failed to load settlement groups');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateNew = () => {
    setIsEditMode(false);
    setSelectedGroup(null);
    setFormData({
      name: '',
      value: '',
      description: '',
      serviceType: '',
      isActive: true,
      feeType: '',
      gateway: '',
      minAmount: '',
      maxAmount: '',
    });
    setIsSheetOpen(true);
  };

  const handleEdit = (group: SettlementGroup) => {
    setIsEditMode(true);
    setSelectedGroup(group);
    setFormData({
      name: group.name,
      value: group.value.toString(),
      description: group.description || '',
      serviceType: group.serviceType || '',
      isActive: group.isActive,
      feeType: group.metadata?.feeType || '',
      gateway: group.metadata?.gateway || '',
      minAmount: group.metadata?.minAmount?.toString() || '',
      maxAmount: group.metadata?.maxAmount?.toString() || '',
    });
    setIsSheetOpen(true);
  };

  const handleDelete = async (id: string) => {
    const groupToDelete = settlementGroups.find(group => group.id === id);
    if (groupToDelete) {
      setSettlementToDelete(groupToDelete);
      setIsDeleteModalOpen(true);
    }
  };

  const confirmDelete = async () => {
    if (!settlementToDelete) return;

    try {
      await ucpApi.delete(settlementToDelete.id);
      setIsDeleteModalOpen(false);
      setSettlementToDelete(null);
      setIsSuccessModalOpen(true);
      loadSettlementGroups();
      
      // Auto-close success modal after 2 seconds
      setTimeout(() => {
        setIsSuccessModalOpen(false);
      }, 2000);
    } catch (error) {
      console.error('Error deleting settlement group:', error);
      setError('Failed to delete settlement group');
      setIsDeleteModalOpen(false);
      setSettlementToDelete(null);
    }
  };

  const handleSubmit = async () => {
    try {
      const submitData = {
        ...formData,
        value: parseFloat(formData.value),
        metadata: {
          feeType: formData.feeType || null,
          gateway: formData.gateway || null,
          minAmount: formData.minAmount ? parseFloat(formData.minAmount) : null,
          maxAmount: formData.maxAmount ? parseFloat(formData.maxAmount) : null,
        },
      };

      if (isEditMode && selectedGroup) {
        await ucpApi.update(selectedGroup.id, submitData);
      } else {
        await ucpApi.create(submitData);
      }

      setIsSheetOpen(false);
      loadSettlementGroups();
      setFormData({
        name: '',
        value: '',
        description: '',
        serviceType: '',
        isActive: true,
        feeType: '',
        gateway: '',
        minAmount: '',
        maxAmount: '',
      });
    } catch (error) {
      console.error('Error saving settlement group:', error);
      setError('Failed to save settlement group');
    }
  };

  const getStatusBadgeVariant = (isActive: boolean) => {
    return isActive ? 'default' : 'destructive';
  };

  const getStatusIcon = (isActive: boolean) => {
    return isActive ? <CheckCircle className="h-4 w-4 text-green-600" /> : <XCircle className="h-4 w-4 text-red-600" />;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatValue = (value: number) => {
    return `${(value * 100).toFixed(2)}%`;
  };

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading settlement groups...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Settlement Groups</CardTitle>
              <CardDescription>
                Manage settlement group configurations and fees
              </CardDescription>
            </div>
            <Button onClick={handleCreateNew}>
              <Plus className="mr-2 h-4 w-4" />
              New Settlement Group
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by name or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterServiceType} onValueChange={setFilterServiceType}>
              <SelectTrigger className="sm:w-[150px]">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="payment_gateway">Payment Gateway</SelectItem>
                <SelectItem value="delivery">Delivery</SelectItem>
                <SelectItem value="subscription">Subscription</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="sm:w-[150px]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="true">Active</SelectItem>
                <SelectItem value="false">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Settlement Groups Table */}
          <div className="space-y-4">
            {settlementGroups.map((group) => (
              <div
                key={group.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <DollarSign className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="font-medium text-gray-900">
                        {group.name}
                      </h3>
                      <Badge variant={getStatusBadgeVariant(group.isActive)}>
                        {group.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                      {getStatusIcon(group.isActive)}
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                      <div className="flex items-center">
                        <Percent className="h-4 w-4 mr-1" />
                        {formatValue(group.value)}
                      </div>
                      {group.serviceType && (
                        <div className="flex items-center">
                          <Settings className="h-4 w-4 mr-1" />
                          {group.serviceType}
                        </div>
                      )}
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-1" />
                        Created {formatDate(group.createdAt)}
                        {group.createdBy && (
                          <span className="ml-1">by {group.createdBy}</span>
                        )}
                      </div>
                    </div>
                    {group.description && (
                      <p className="text-sm text-gray-500 mt-1">
                        {group.description}
                      </p>
                    )}
                    {group.metadata && (
                      <div className="flex items-center space-x-4 text-xs text-gray-500 mt-2">
                        {group.metadata.feeType && (
                          <span className="bg-gray-100 px-2 py-1 rounded">
                            {group.metadata.feeType}
                          </span>
                        )}
                        {group.metadata.gateway && (
                          <span className="bg-gray-100 px-2 py-1 rounded">
                            {group.metadata.gateway}
                          </span>
                        )}
                        {(group.metadata.minAmount || group.metadata.maxAmount) && (
                          <span className="bg-gray-100 px-2 py-1 rounded">
                            {group.metadata.minAmount ? `${group.metadata.minAmount}` : '0'} - {group.metadata.maxAmount || '∞'}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleEdit(group)}>
                      <Edit className="mr-2 h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => handleDelete(group.id)}
                      className="text-red-600"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalGroups > 0 && (
            <div className="flex items-center justify-between mt-6">
              <div className="text-sm text-gray-700">
                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalGroups)} of {totalGroups} results
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

          {settlementGroups.length === 0 && (
            <div className="text-center py-8">
              <DollarSign className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No settlement groups found</h3>
              <p className="mt-1 text-sm text-gray-500">
                Get started by creating a new settlement group.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Right Slider Modal */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="w-[600px] sm:w-[700px] overflow-y-auto px-8">
          <SheetHeader className="border-b pb-6 mb-6">
            <SheetTitle className="text-2xl font-semibold text-gray-900">
              {isEditMode ? 'Edit Settlement Group' : 'Create Settlement Group'}
            </SheetTitle>
            <SheetDescription className="text-gray-600 mt-2">
              {isEditMode 
                ? 'Update the settlement group configuration and fee settings.'
                : 'Configure a new settlement group with fee structure and payment settings.'
              }
            </SheetDescription>
          </SheetHeader>
          
          <div className="space-y-8 pr-4">
            {/* Basic Information Section */}
            <div className="space-y-6">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                <h3 className="text-lg font-medium text-gray-900">Basic Information</h3>
              </div>
              
              <div className="grid grid-cols-1 gap-6">
                <div>
                  <Label htmlFor="name" className="text-sm font-medium text-gray-700 mb-2 block">
                    Settlement Group Name *
                  </Label>
                  <Input
                    id="name"
                    placeholder="e.g., Stripe Payment Gateway, Mobile Money Fees"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="h-11"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Choose a descriptive name for this settlement group
                  </p>
                </div>

                <div>
                  <Label htmlFor="description" className="text-sm font-medium text-gray-700 mb-2 block">
                    Description
                  </Label>
                  <Textarea
                    id="description"
                    placeholder="Provide a brief description of this settlement group's purpose and usage..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Fee Configuration Section */}
            <div className="space-y-6">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                <h3 className="text-lg font-medium text-gray-900">Fee Configuration</h3>
              </div>
              
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="value" className="text-sm font-medium text-gray-700 mb-2 block">
                    Fee Rate *
                  </Label>
                  <div className="relative">
                    <Input
                      id="value"
                      type="number"
                      step="0.01"
                      min="0"
                      max="1"
                      placeholder="0.05"
                      value={formData.value}
                      onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                      className="h-11 pr-12"
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                      <span className="text-gray-500 text-sm">%</span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Enter as decimal (0.05 = 5%, 0.10 = 10%)
                  </p>
                </div>

                <div>
                  <Label htmlFor="feeType" className="text-sm font-medium text-gray-700 mb-2 block">
                    Fee Type
                  </Label>
                  <Select 
                    value={formData.feeType || ''} 
                    onValueChange={(value) => setFormData({ ...formData, feeType: value })}
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Select fee type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Percentage</SelectItem>
                      <SelectItem value="fixed">Fixed Amount</SelectItem>
                      <SelectItem value="tiered">Tiered</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Payment Settings Section */}
            <div className="space-y-6">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-purple-600 rounded-full"></div>
                <h3 className="text-lg font-medium text-gray-900">Payment Settings</h3>
              </div>
              
              <div className="grid grid-cols-1 gap-6">
                <div>
                  <Label htmlFor="serviceType" className="text-sm font-medium text-gray-700 mb-2 block">
                    Service Type
                  </Label>
                  <Select 
                    value={formData.serviceType} 
                    onValueChange={(value) => setFormData({ ...formData, serviceType: value })}
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Select service type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="payment_gateway">Payment Gateway</SelectItem>
                      <SelectItem value="delivery">Delivery</SelectItem>
                      <SelectItem value="subscription">Subscription</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="gateway" className="text-sm font-medium text-gray-700 mb-2 block">
                    Payment Gateway
                  </Label>
                  <Select 
                    value={formData.gateway || ''} 
                    onValueChange={(value) => setFormData({ ...formData, gateway: value })}
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Select gateway" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="card_payment">Card Payment</SelectItem>
                      <SelectItem value="mobile_wallet">Mobile Wallet</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Amount Limits Section */}
            <div className="space-y-6">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-orange-600 rounded-full"></div>
                <h3 className="text-lg font-medium text-gray-900">Amount Limits</h3>
              </div>
              
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="minAmount" className="text-sm font-medium text-gray-700 mb-2 block">
                    Minimum Amount
                  </Label>
                  <div className="relative">
                    <Input
                      id="minAmount"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={formData.minAmount || ''}
                      onChange={(e) => setFormData({ ...formData, minAmount: e.target.value })}
                      className="h-11"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Minimum transaction amount for this fee
                  </p>
                </div>

                <div>
                  <Label htmlFor="maxAmount" className="text-sm font-medium text-gray-700 mb-2 block">
                    Maximum Amount
                  </Label>
                  <div className="relative">
                    <Input
                      id="maxAmount"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="No limit"
                      value={formData.maxAmount || ''}
                      onChange={(e) => setFormData({ ...formData, maxAmount: e.target.value })}
                      className="h-11"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Maximum transaction amount (leave empty for no limit)
                  </p>
                </div>
              </div>
            </div>

            {/* Status Section */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-gray-600 rounded-full"></div>
                <h3 className="text-lg font-medium text-gray-900">Status</h3>
              </div>
              
              <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
                <Checkbox
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked as boolean })}
                  className="h-5 w-5"
                />
                <div>
                  <Label htmlFor="isActive" className="text-sm font-medium text-gray-900">
                    Active Settlement Group
                  </Label>
                  <p className="text-xs text-gray-500">
                    Enable this settlement group for transactions
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 pt-6 pb-8 border-t border-gray-200">
              <Button
                variant="outline"
                onClick={() => setIsSheetOpen(false)}
                className="px-6 py-2"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!formData.name || !formData.value}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700"
              >
                {isEditMode ? 'Update Settlement Group' : 'Create Settlement Group'}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation Modal */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                <Trash2 className="h-4 w-4 text-red-600" />
              </div>
              <span>Delete Settlement Group</span>
            </DialogTitle>
            <DialogDescription className="pt-4">
              Are you sure you want to delete <strong>&ldquo;{settlementToDelete?.name}&rdquo;</strong>? 
              This action cannot be undone and will permanently remove this settlement group configuration.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end space-x-3 pt-6">
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteModalOpen(false);
                setSettlementToDelete(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete Settlement Group
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Success Feedback Modal */}
      <Dialog open={isSuccessModalOpen} onOpenChange={setIsSuccessModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="h-4 w-4 text-green-600" />
              </div>
              <span>Success</span>
            </DialogTitle>
            <DialogDescription className="pt-4">
              Settlement group has been successfully deleted.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end pt-6">
            <Button
              onClick={() => setIsSuccessModalOpen(false)}
              className="bg-green-600 hover:bg-green-700"
            >
              OK
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
} 