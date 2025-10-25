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
  CreditCard,
  Settings,
  CheckCircle,
  XCircle,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Globe,
  DollarSign,
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
import { paymentGatewaysApi } from '@/services/api';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface PaymentGateway {
  id: string;
  name: string;
  type: string;
  countryCode: string;
  currencyCode: string;
  isActive: boolean;
  logoUrl?: string;
  description?: string;
  metadata?: any;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

export default function PaymentGatewaysPage() {
  const [paymentGateways, setPaymentGateways] = useState<PaymentGateway[]>([]);
  const [selectedGateway, setSelectedGateway] = useState<PaymentGateway | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterCountry, setFilterCountry] = useState('all');
  const [filterCurrency, setFilterCurrency] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [gatewayToDelete, setGatewayToDelete] = useState<PaymentGateway | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    type: '',
    countryCode: '',
    currencyCode: '',
    description: '',
    logoUrl: '',
    isActive: true,
  });
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalGateways, setTotalGateways] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Filter options
  const [types, setTypes] = useState<string[]>([]);
  const [countries, setCountries] = useState<string[]>([]);
  const [currencies, setCurrencies] = useState<string[]>([]);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Load payment gateways
  const loadPaymentGateways = async () => {
    try {
      setIsLoading(true);
      setError('');

      const params = {
        page: currentPage,
        limit: itemsPerPage,
        search: debouncedSearchQuery,
        type: filterType,
        countryCode: filterCountry,
        currencyCode: filterCurrency,
        status: filterStatus,
      };

      const response = await paymentGatewaysApi.getPaymentGateways(params);
      
      if (response.success) {
        setPaymentGateways(response.data);
        setTotalPages(response.pagination.totalPages);
        setTotalGateways(response.pagination.totalItems);
      } else {
        setError(response.error || 'Failed to load payment gateways');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load payment gateways');
    } finally {
      setIsLoading(false);
    }
  };

  // Load filter options
  const loadFilterOptions = async () => {
    try {
      const [typesResponse, countriesResponse, currenciesResponse] = await Promise.all([
        paymentGatewaysApi.getPaymentGatewayTypes(),
        paymentGatewaysApi.getPaymentGatewayCountries(),
        paymentGatewaysApi.getPaymentGatewayCurrencies(),
      ]);

      if (typesResponse.success) setTypes(typesResponse.data);
      if (countriesResponse.success) setCountries(countriesResponse.data);
      if (currenciesResponse.success) setCurrencies(currenciesResponse.data);
    } catch (error) {
      console.error('Failed to load filter options:', error);
    }
  };

  // Load data on mount and when filters change
  useEffect(() => {
    loadPaymentGateways();
  }, [currentPage, itemsPerPage, debouncedSearchQuery, filterType, filterCountry, filterCurrency, filterStatus]);

  useEffect(() => {
    loadFilterOptions();
  }, []);

  const handleCreateNew = () => {
    setFormData({
      name: '',
      type: '',
      countryCode: '',
      currencyCode: '',
      description: '',
      logoUrl: '',
      isActive: true,
    });
    setIsEditMode(false);
    setSelectedGateway(null);
    setIsSheetOpen(true);
  };

  const handleEdit = (gateway: PaymentGateway) => {
    setFormData({
      name: gateway.name,
      type: gateway.type,
      countryCode: gateway.countryCode,
      currencyCode: gateway.currencyCode,
      description: gateway.description || '',
      logoUrl: gateway.logoUrl || '',
      isActive: gateway.isActive,
    });
    setSelectedGateway(gateway);
    setIsEditMode(true);
    setIsSheetOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await paymentGatewaysApi.deletePaymentGateway(id);
      if (response.success) {
        setIsSuccessModalOpen(true);
        loadPaymentGateways();
      } else {
        setError(response.error || 'Failed to delete payment gateway');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to delete payment gateway');
    }
  };

  const confirmDelete = async () => {
    if (gatewayToDelete) {
      await handleDelete(gatewayToDelete.id);
      setGatewayToDelete(null);
      setIsDeleteModalOpen(false);
    }
  };

  const handleSubmit = async () => {
    try {
      setError('');

      const submitData = {
        ...formData,
        metadata: {},
      };

      let response;
      if (isEditMode && selectedGateway) {
        response = await paymentGatewaysApi.updatePaymentGateway(selectedGateway.id, submitData);
      } else {
        response = await paymentGatewaysApi.createPaymentGateway(submitData);
      }

      if (response.success) {
        setIsSheetOpen(false);
        setIsSuccessModalOpen(true);
        loadPaymentGateways();
      } else {
        setError(response.error || 'Failed to save payment gateway');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save payment gateway');
    }
  };

  const getStatusBadgeVariant = (isActive: boolean) => {
    return isActive ? 'default' : 'secondary';
  };

  const getStatusIcon = (isActive: boolean) => {
    return isActive ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  if (isLoading && paymentGateways.length === 0) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading payment gateways...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payment Gateways</h1>
          <p className="text-gray-600">Manage payment gateway service providers</p>
        </div>
        <Button onClick={handleCreateNew} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Add Payment Gateway
        </Button>
      </div>

      {/* Filters and Search */}
      <Card className="mb-6">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Search className="h-5 w-5 text-blue-600" />
            Search & Filters
          </CardTitle>
          <CardDescription>
            Filter payment gateways by various criteria
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
            {/* Search */}
            <div className="lg:col-span-2">
              <Label htmlFor="search" className="text-sm font-medium text-gray-700">
                Search
              </Label>
              <div className="relative mt-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="search"
                  placeholder="Search by name, type, or description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-10"
                />
              </div>
            </div>

            {/* Type Filter */}
            <div>
              <Label htmlFor="type" className="text-sm font-medium text-gray-700">
                Type
              </Label>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="mt-1 h-10">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {types.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Country Filter */}
            <div>
              <Label htmlFor="country" className="text-sm font-medium text-gray-700">
                Country
              </Label>
              <Select value={filterCountry} onValueChange={setFilterCountry}>
                <SelectTrigger className="mt-1 h-10">
                  <SelectValue placeholder="All Countries" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Countries</SelectItem>
                  {countries.map((country) => (
                    <SelectItem key={country} value={country}>
                      {country}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Currency Filter */}
            <div>
              <Label htmlFor="currency" className="text-sm font-medium text-gray-700">
                Currency
              </Label>
              <Select value={filterCurrency} onValueChange={setFilterCurrency}>
                <SelectTrigger className="mt-1 h-10">
                  <SelectValue placeholder="All Currencies" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Currencies</SelectItem>
                  {currencies.map((currency) => (
                    <SelectItem key={currency} value={currency}>
                      {currency}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status Filter */}
            <div>
              <Label htmlFor="status" className="text-sm font-medium text-gray-700">
                Status
              </Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="mt-1 h-10">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Payment Gateways</CardTitle>
              <CardDescription>
                {totalGateways} payment gateway{totalGateways !== 1 ? 's' : ''} found
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {paymentGateways.length === 0 ? (
            <div className="text-center py-8">
              <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No payment gateways found</h3>
              <p className="text-gray-600 mb-4">
                {searchQuery || filterType !== 'all' || filterCountry !== 'all' || filterStatus !== 'all'
                  ? 'Try adjusting your search or filters'
                  : 'Get started by creating your first payment gateway'}
              </p>
              {!searchQuery && filterType === 'all' && filterCountry === 'all' && filterStatus === 'all' && (
                <Button onClick={handleCreateNew}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Payment Gateway
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {paymentGateways.map((gateway) => (
                <div
                  key={gateway.id}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      {gateway.logoUrl ? (
                        <img
                          src={gateway.logoUrl}
                          alt={gateway.name}
                          className="h-10 w-10 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="h-10 w-10 bg-gray-200 rounded-lg flex items-center justify-center">
                          <CreditCard className="h-5 w-5 text-gray-500" />
                        </div>
                      )}
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">{gateway.name}</h3>
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <Badge variant="outline">{gateway.type}</Badge>
                        <Badge variant="outline">{gateway.countryCode}</Badge>
                        <Badge variant="outline">{gateway.currencyCode}</Badge>
                        <Badge variant={getStatusBadgeVariant(gateway.isActive)}>
                          {getStatusIcon(gateway.isActive)}
                          {gateway.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      {gateway.description && (
                        <p className="text-sm text-gray-600 mt-1">{gateway.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="text-sm text-gray-500">
                      Created {formatDate(gateway.createdAt)}
                      {gateway.createdBy && (
                        <div className="text-xs text-gray-400">
                          by {gateway.createdBy}
                        </div>
                      )}
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(gateway)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            setGatewayToDelete(gateway);
                            setIsDeleteModalOpen(true);
                          }}
                          className="text-red-600"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <div className="text-sm text-gray-700">
                Showing {((currentPage - 1) * itemsPerPage) + 1} to{' '}
                {Math.min(currentPage * itemsPerPage, totalGateways)} of {totalGateways} results
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <div className="text-sm text-gray-700">
                  Page {currentPage} of {totalPages}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Sheet */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="w-[600px] sm:w-[540px] overflow-y-auto">
          <div className="px-6 py-6">
            <SheetHeader className="mb-6">
              <SheetTitle className="text-xl font-semibold">
                {isEditMode ? 'Edit Payment Gateway' : 'Create Payment Gateway'}
              </SheetTitle>
              <SheetDescription className="text-gray-600">
                {isEditMode
                  ? 'Update the payment gateway information below.'
                  : 'Add a new payment gateway service provider to the system.'}
              </SheetDescription>
            </SheetHeader>
            
            <div className="space-y-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2">
                  Basic Information
                </h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-sm font-medium">
                      Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Gateway name"
                      className="w-full"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="type" className="text-sm font-medium">
                      Type <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="type"
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                      placeholder="e.g., Card, Mobile Money"
                      className="w-full"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="countryCode" className="text-sm font-medium">
                      Country Code <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="countryCode"
                      value={formData.countryCode}
                      onChange={(e) => setFormData({ ...formData, countryCode: e.target.value.toUpperCase() })}
                      placeholder="e.g., GM"
                      maxLength={2}
                      className="w-full"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="currencyCode" className="text-sm font-medium">
                      Currency Code <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="currencyCode"
                      value={formData.currencyCode}
                      onChange={(e) => setFormData({ ...formData, currencyCode: e.target.value.toUpperCase() })}
                      placeholder="e.g., GMD"
                      maxLength={3}
                      className="w-full"
                    />
                  </div>
                </div>
              </div>

              {/* Additional Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2">
                  Additional Information
                </h3>
                
                <div className="space-y-2">
                  <Label htmlFor="description" className="text-sm font-medium">
                    Description
                  </Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Optional description of the payment gateway"
                    rows={3}
                    className="w-full resize-none"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="logoUrl" className="text-sm font-medium">
                    Logo URL
                  </Label>
                  <Input
                    id="logoUrl"
                    value={formData.logoUrl}
                    onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
                    placeholder="https://example.com/logo.png"
                    className="w-full"
                  />
                </div>
              </div>

              {/* Status */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2">
                  Status
                </h3>
                
                <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
                  <Checkbox
                    id="isActive"
                    checked={formData.isActive}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, isActive: checked as boolean })
                    }
                    className="h-5 w-5"
                  />
                  <div className="space-y-1">
                    <Label htmlFor="isActive" className="text-sm font-medium">
                      Active
                    </Label>
                    <p className="text-xs text-gray-600">
                      Enable this payment gateway for transactions
                    </p>
                  </div>
                </div>
              </div>

              {/* Error Display */}
              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-800 text-sm">{error}</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                <Button 
                  variant="outline" 
                  onClick={() => setIsSheetOpen(false)}
                  className="px-6"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleSubmit}
                  className="px-6"
                  disabled={!formData.name || !formData.type || !formData.countryCode || !formData.currencyCode}
                >
                  {isEditMode ? 'Update' : 'Create'} Payment Gateway
                </Button>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation Modal */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Payment Gateway</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{gatewayToDelete?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Success Modal */}
      <Dialog open={isSuccessModalOpen} onOpenChange={setIsSuccessModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Success</DialogTitle>
            <DialogDescription>
              {isEditMode ? 'Payment gateway updated successfully!' : 'Payment gateway created successfully!'}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end">
            <Button onClick={() => setIsSuccessModalOpen(false)}>OK</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
} 