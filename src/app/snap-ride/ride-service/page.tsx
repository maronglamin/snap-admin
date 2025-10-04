'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  Plus,
  Edit,
  Trash2,
  Filter,
  Loader2,
  Settings,
  MoreVertical,
  Eye,
  Check,
  X,
  Car,
  Bike,
  Zap,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { apiService } from '@/services/api';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { PermissionGuard } from '@/components/auth/PermissionGuard';
import { useFeatureAccess } from '@/hooks/useFeatureAccess';
import { useAdminStore } from '@/stores/adminStore';

interface RideService {
  id: string;
  serviceId: string;
  name: string;
  description?: string;
  vehicleType: 'DRIVER' | 'MOTORCYCLE' | 'BICYCLE';
  isActive: boolean;
  isDefault: boolean;
  isRentalType: boolean;
  distanceUnit: 'KILOMETER' | 'MILE';
  baseDistance: number;
  maxDistance?: number;
  baseFare: number;
  perKmRate: number;
  perMinuteRate: number;
  minimumFare: number;
  maximumFare?: number;
  currency: string;
  currencySymbol: string;
  surgeMultiplier: number;
  maxSurgeMultiplier: number;
  platformFeePercentage: number;
  driverEarningsPercentage: number;
  nightFareMultiplier: number;
  weekendFareMultiplier: number;
  cancellationFee: number;
  cancellationTimeLimit: number;
  features?: any;
  restrictions?: any;
  estimatedPickupTime: number;
  maxWaitTime: number;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
}

interface RideServiceFormData {
  name: string;
  description: string;
  vehicleType: 'DRIVER' | 'MOTORCYCLE' | 'BICYCLE';
  isActive: boolean;
  isDefault: boolean;
  isRentalType: boolean;
  distanceUnit: 'KILOMETER' | 'MILE';
  baseDistance: number;
  maxDistance?: number;
  baseFare: number;
  perKmRate: number;
  perMinuteRate: number;
  minimumFare: number;
  maximumFare?: number;
  currency: string;
  currencySymbol: string;
  surgeMultiplier: number;
  maxSurgeMultiplier: number;
  platformFeePercentage: number;
  driverEarningsPercentage: number;
  nightFareMultiplier: number;
  weekendFareMultiplier: number;
  cancellationFee: number;
  cancellationTimeLimit: number;
  estimatedPickupTime: number;
  maxWaitTime: number;
  minLuggage?: number;
  maxLuggage?: number;
}

export default function RideServicePage() {
  const [rideServices, setRideServices] = useState<RideService[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterVehicleType, setFilterVehicleType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterDefault, setFilterDefault] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  
  const { addNotification } = useAdminStore();
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [itemsPerPage] = useState(10);
  
  // Sheet states
  const [showCreateSheet, setShowCreateSheet] = useState(false);
  const [showEditSheet, setShowEditSheet] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedRideService, setSelectedRideService] = useState<RideService | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState<RideServiceFormData>({
    name: '',
    description: '',
    vehicleType: 'DRIVER',
    isActive: true,
    isDefault: false,
    isRentalType: false,
    distanceUnit: 'KILOMETER',
    baseDistance: 1.0,
    maxDistance: undefined,
    baseFare: 0,
    perKmRate: 0,
    perMinuteRate: 0,
    minimumFare: 0,
    maximumFare: undefined,
    currency: 'GMD',
    currencySymbol: 'D',
    surgeMultiplier: 1.0,
    maxSurgeMultiplier: 3.0,
    platformFeePercentage: 0.15,
    driverEarningsPercentage: 0.85,
    nightFareMultiplier: 1.2,
    weekendFareMultiplier: 1.1,
    cancellationFee: 0,
    cancellationTimeLimit: 300,
    estimatedPickupTime: 5,
    maxWaitTime: 10,
    minLuggage: undefined,
    maxLuggage: undefined,
  });

  const { canView, canAdd, canEdit, canDelete } = useFeatureAccess('SNAP_RIDE_RIDE_SERVICE');

  const loadRideServices = async () => {
    try {
      setIsLoading(true);
      setError('');
      
      const params: any = {
        page: currentPage,
        limit: itemsPerPage,
        search: searchQuery,
      };

      if (filterVehicleType !== 'all') {
        params.vehicleType = filterVehicleType;
      }
      if (filterStatus !== 'all') {
        params.isActive = filterStatus;
      }
      if (filterDefault !== 'all') {
        params.isDefault = filterDefault;
      }

      const response = await apiService.getRideServices(params) as any;
      
      if (response.success) {
        setRideServices(response.data);
        setTotalPages(response.pagination.totalPages);
        setTotalItems(response.pagination.total);
      } else {
        setError('Failed to load ride services');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load ride services');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateRideService = async () => {
    try {
      setIsSubmitting(true);
      setError('');
      
      // Prepare restrictions data
      const restrictions = {
        luggage: {
          min: formData.minLuggage,
          max: formData.maxLuggage
        }
      };
      
      const requestData = {
        ...formData,
        restrictions: restrictions
      };
      
      const response = await apiService.createRideService(requestData) as any;
      
      if (response.success) {
        addNotification({
          type: 'success',
          title: 'Success',
          message: 'Ride service created successfully'
        });
        setShowCreateSheet(false);
        resetForm();
        loadRideServices();
      } else {
        const errorMsg = response.error || 'Failed to create ride service';
        setError(errorMsg);
        addNotification({
          type: 'error',
          title: 'Error',
          message: errorMsg
        });
      }
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to create ride service';
      setError(errorMsg);
      addNotification({
        type: 'error',
        title: 'Error',
        message: errorMsg
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateRideService = async () => {
    if (!selectedRideService) return;
    
    try {
      setIsSubmitting(true);
      setError('');
      
      // Prepare restrictions data
      const restrictions = {
        luggage: {
          min: formData.minLuggage,
          max: formData.maxLuggage
        }
      };
      
      const requestData = {
        ...formData,
        restrictions: restrictions
      };
      
      const response = await apiService.updateRideService(selectedRideService.id, requestData) as any;
      
      if (response.success) {
        addNotification({
          type: 'success',
          title: 'Success',
          message: 'Ride service updated successfully'
        });
        setShowEditSheet(false);
        resetForm();
        loadRideServices();
      } else {
        const errorMsg = response.error || 'Failed to update ride service';
        setError(errorMsg);
        addNotification({
          type: 'error',
          title: 'Error',
          message: errorMsg
        });
      }
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to update ride service';
      setError(errorMsg);
      addNotification({
        type: 'error',
        title: 'Error',
        message: errorMsg
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteRideService = async () => {
    if (!selectedRideService) return;
    
    try {
      setIsSubmitting(true);
      setError('');
      
      const response = await apiService.deleteRideService(selectedRideService.id) as any;
      
      if (response.success) {
        addNotification({
          type: 'success',
          title: 'Success',
          message: 'Ride service deleted successfully'
        });
        setShowDeleteDialog(false);
        loadRideServices();
      } else {
        const errorMsg = response.error || 'Failed to delete ride service';
        setError(errorMsg);
        addNotification({
          type: 'error',
          title: 'Error',
          message: errorMsg
        });
      }
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to delete ride service';
      setError(errorMsg);
      addNotification({
        type: 'error',
        title: 'Error',
        message: errorMsg
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (rideService: RideService) => {
    setSelectedRideService(rideService);
    
    // Parse restrictions to get luggage data
    let minLuggage = undefined;
    let maxLuggage = undefined;
    
    if (rideService.restrictions && typeof rideService.restrictions === 'object') {
      const restrictions = rideService.restrictions as any;
      if (restrictions.luggage) {
        minLuggage = restrictions.luggage.min;
        maxLuggage = restrictions.luggage.max;
      }
    }
    
    setFormData({
      name: rideService.name,
      description: rideService.description || '',
      vehicleType: rideService.vehicleType,
      isActive: rideService.isActive,
      isDefault: rideService.isDefault,
      isRentalType: rideService.isRentalType || false,
      distanceUnit: rideService.distanceUnit,
      baseDistance: rideService.baseDistance,
      maxDistance: rideService.maxDistance,
      baseFare: Number(rideService.baseFare),
      perKmRate: Number(rideService.perKmRate),
      perMinuteRate: Number(rideService.perMinuteRate),
      minimumFare: Number(rideService.minimumFare),
      maximumFare: rideService.maximumFare ? Number(rideService.maximumFare) : undefined,
      currency: rideService.currency,
      currencySymbol: rideService.currencySymbol,
      surgeMultiplier: Number(rideService.surgeMultiplier),
      maxSurgeMultiplier: Number(rideService.maxSurgeMultiplier),
      platformFeePercentage: Number(rideService.platformFeePercentage),
      driverEarningsPercentage: Number(rideService.driverEarningsPercentage),
      nightFareMultiplier: Number(rideService.nightFareMultiplier),
      weekendFareMultiplier: Number(rideService.weekendFareMultiplier),
      cancellationFee: Number(rideService.cancellationFee),
      cancellationTimeLimit: rideService.cancellationTimeLimit,
      estimatedPickupTime: rideService.estimatedPickupTime,
      maxWaitTime: rideService.maxWaitTime,
      minLuggage: minLuggage,
      maxLuggage: maxLuggage,
    });
    setShowEditSheet(true);
  };

  const handleDelete = (rideService: RideService) => {
    setSelectedRideService(rideService);
    setShowDeleteDialog(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      vehicleType: 'DRIVER',
      isActive: true,
      isDefault: false,
      isRentalType: false,
      distanceUnit: 'KILOMETER',
      baseDistance: 1.0,
      maxDistance: undefined,
      baseFare: 0,
      perKmRate: 0,
      perMinuteRate: 0,
      minimumFare: 0,
      maximumFare: undefined,
      currency: 'GMD',
      currencySymbol: 'D',
      surgeMultiplier: 1.0,
      maxSurgeMultiplier: 3.0,
      platformFeePercentage: 0.15,
      driverEarningsPercentage: 0.85,
      nightFareMultiplier: 1.2,
      weekendFareMultiplier: 1.1,
      cancellationFee: 0,
      cancellationTimeLimit: 300,
      estimatedPickupTime: 5,
      maxWaitTime: 10,
      minLuggage: undefined,
      maxLuggage: undefined,
    });
    setSelectedRideService(null);
  };

  const getVehicleTypeIcon = (type: string) => {
    switch (type) {
      case 'DRIVER':
        return <Car className="h-4 w-4" />;
      case 'MOTORCYCLE':
        return <Bike className="h-4 w-4" />;
      case 'BICYCLE':
        return <Bike className="h-4 w-4" />;
      default:
        return <Car className="h-4 w-4" />;
    }
  };

  const getVehicleTypeLabel = (type: string) => {
    switch (type) {
      case 'DRIVER':
        return 'Car';
      case 'MOTORCYCLE':
        return 'Motorcycle';
      case 'BICYCLE':
        return 'Bicycle';
      default:
        return type;
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'GMD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  useEffect(() => {
    loadRideServices();
  }, [currentPage, searchQuery, filterVehicleType, filterStatus, filterDefault]);



  if (!canView) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl font-bold text-red-600 mb-2">Access Denied</div>
          <div className="text-gray-600">You don't have permission to access this page.</div>
        </div>
      </div>
    );
  }

  return (
    <AuthGuard>
      <PermissionGuard requiredPermission={{ entityType: 'SNAP_RIDE_RIDE_SERVICE', permission: 'VIEW' }}>
        <div className="container mx-auto py-6 space-y-6">
          {/* Header */}
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Ride Services</h1>
              <p className="text-gray-600">Manage ride service configurations and pricing</p>
            </div>
            {canAdd && (
              <Button onClick={() => setShowCreateSheet(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Ride Service
              </Button>
            )}
          </div>



          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-md">
              {error}
            </div>
          )}

          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Filters</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="search">Search</Label>
                  <Input
                    id="search"
                    placeholder="Search by name, description, or service ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="vehicleType">Vehicle Type</Label>
                  <Select value={filterVehicleType} onValueChange={setFilterVehicleType}>
                    <SelectTrigger>
                      <SelectValue placeholder="All vehicle types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All vehicle types</SelectItem>
                      <SelectItem value="DRIVER">Car</SelectItem>
                      <SelectItem value="MOTORCYCLE">Motorcycle</SelectItem>
                      <SelectItem value="BICYCLE">Bicycle</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger>
                      <SelectValue placeholder="All statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All statuses</SelectItem>
                      <SelectItem value="true">Active</SelectItem>
                      <SelectItem value="false">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="default">Default</Label>
                  <Select value={filterDefault} onValueChange={setFilterDefault}>
                    <SelectTrigger>
                      <SelectValue placeholder="All services" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All services</SelectItem>
                      <SelectItem value="true">Default only</SelectItem>
                      <SelectItem value="false">Non-default only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Ride Services List */}
          <Card>
            <CardHeader>
              <CardTitle>Ride Services ({totalItems})</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center items-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : rideServices.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No ride services found
                </div>
              ) : (
                <div className="space-y-4">
                  {rideServices.map((service) => (
                    <div key={service.id} className="border rounded-lg p-4 hover:bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center space-x-2">
                            {getVehicleTypeIcon(service.vehicleType)}
                            <span className="font-medium">{service.name}</span>
                          </div>
                          <Badge variant={service.isActive ? "default" : "secondary"}>
                            {service.isActive ? "Active" : "Inactive"}
                          </Badge>
                          {service.isDefault && (
                            <Badge variant="outline">Default</Badge>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="text-right">
                            <div className="font-medium">
                              {formatCurrency(Number(service.baseFare), service.currency)}
                            </div>
                            <div className="text-sm text-gray-500">
                              {service.currencySymbol}{Number(service.perKmRate)}/km
                            </div>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {canEdit && (
                                <DropdownMenuItem onClick={() => handleEdit(service)}>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                              )}
                              {canDelete && (
                                <DropdownMenuItem 
                                  onClick={() => handleDelete(service)}
                                  className="text-red-600"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                      <div className="mt-2 text-sm text-gray-600">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div>
                            <span className="font-medium">Vehicle:</span> {getVehicleTypeLabel(service.vehicleType)}
                          </div>
                          <div>
                            <span className="font-medium">Min Fare:</span> {formatCurrency(Number(service.minimumFare), service.currency)}
                          </div>
                          <div>
                            <span className="font-medium">Platform Fee:</span> {(Number(service.platformFeePercentage) * 100).toFixed(1)}%
                          </div>
                          <div>
                            <span className="font-medium">Created:</span> {formatDate(service.createdAt)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-between items-center mt-6">
                  <div className="text-sm text-gray-600">
                    Page {currentPage} of {totalPages} ({totalItems} total)
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(currentPage - 1)}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage(currentPage + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Create/Edit Sheet */}
          <Sheet open={showCreateSheet || showEditSheet} onOpenChange={(open) => {
            if (!open) {
              setShowCreateSheet(false);
              setShowEditSheet(false);
              resetForm();
            }
          }}>
            <SheetContent className="w-[600px] sm:w-[800px] overflow-y-auto">
              <SheetHeader className="pb-6 border-b border-gray-200">
                <SheetTitle className="text-2xl font-semibold text-gray-900">
                  {showCreateSheet ? 'Create Ride Service' : 'Edit Ride Service'}
                </SheetTitle>
                <SheetDescription className="text-gray-600 mt-2">
                  Configure the ride service settings and pricing structure.
                </SheetDescription>
              </SheetHeader>
              
              <div className="space-y-8 py-8 px-2">
                {/* Basic Information */}
                <div className="space-y-6 p-6 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-6 bg-blue-600 rounded-full"></div>
                    <h3 className="text-xl font-semibold text-gray-900">Basic Information</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-sm font-medium text-gray-700">Service Name *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Enter service name"
                        className="h-11"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="vehicleType" className="text-sm font-medium text-gray-700">Vehicle Type *</Label>
                      <Select value={formData.vehicleType} onValueChange={(value: any) => setFormData({ ...formData, vehicleType: value })}>
                        <SelectTrigger className="h-11">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="DRIVER">Car</SelectItem>
                          <SelectItem value="MOTORCYCLE">Motorcycle</SelectItem>
                          <SelectItem value="BICYCLE">Bicycle</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description" className="text-sm font-medium text-gray-700">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Enter service description"
                      rows={3}
                      className="resize-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div className="flex items-center space-x-3 p-3 bg-white rounded-md border border-gray-200">
                      <Switch
                        id="isActive"
                        checked={formData.isActive}
                        onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                      />
                      <Label htmlFor="isActive" className="text-sm font-medium text-gray-700">Active</Label>
                    </div>
                    <div className="flex items-center space-x-3 p-3 bg-white rounded-md border border-gray-200">
                      <Switch
                        id="isDefault"
                        checked={formData.isDefault}
                        onCheckedChange={(checked) => setFormData({ ...formData, isDefault: checked })}
                      />
                      <Label htmlFor="isDefault" className="text-sm font-medium text-gray-700">Default Service</Label>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 p-3 bg-white rounded-md border border-gray-200 w-fit">
                    <Switch
                      id="isRentalType"
                      checked={formData.isRentalType}
                      onCheckedChange={(checked) => setFormData({ ...formData, isRentalType: checked })}
                    />
                    <Label htmlFor="isRentalType" className="text-sm font-medium text-gray-700">Rental Type</Label>
                  </div>
                </div>

                {/* Pricing Configuration */}
                <div className="space-y-6 p-6 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-6 bg-green-600 rounded-full"></div>
                    <h3 className="text-xl font-semibold text-gray-900">Pricing Configuration</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="baseFare" className="text-sm font-medium text-gray-700">Base Fare *</Label>
                      <Input
                        id="baseFare"
                        type="number"
                        step="0.01"
                        value={formData.baseFare}
                        onChange={(e) => setFormData({ ...formData, baseFare: parseFloat(e.target.value) || 0 })}
                        placeholder="0.00"
                        className="h-11"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="perKmRate" className="text-sm font-medium text-gray-700">Per KM Rate *</Label>
                      <Input
                        id="perKmRate"
                        type="number"
                        step="0.01"
                        value={formData.perKmRate}
                        onChange={(e) => setFormData({ ...formData, perKmRate: parseFloat(e.target.value) || 0 })}
                        placeholder="0.00"
                        className="h-11"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="perMinuteRate" className="text-sm font-medium text-gray-700">Per Minute Rate *</Label>
                      <Input
                        id="perMinuteRate"
                        type="number"
                        step="0.01"
                        value={formData.perMinuteRate}
                        onChange={(e) => setFormData({ ...formData, perMinuteRate: parseFloat(e.target.value) || 0 })}
                        placeholder="0.00"
                        className="h-11"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="minimumFare" className="text-sm font-medium text-gray-700">Minimum Fare *</Label>
                      <Input
                        id="minimumFare"
                        type="number"
                        step="0.01"
                        value={formData.minimumFare}
                        onChange={(e) => setFormData({ ...formData, minimumFare: parseFloat(e.target.value) || 0 })}
                        placeholder="0.00"
                        className="h-11"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="maximumFare" className="text-sm font-medium text-gray-700">Maximum Fare</Label>
                      <Input
                        id="maximumFare"
                        type="number"
                        step="0.01"
                        value={formData.maximumFare || ''}
                        onChange={(e) => setFormData({ ...formData, maximumFare: e.target.value ? parseFloat(e.target.value) : undefined })}
                        placeholder="Optional"
                        className="h-11"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cancellationFee" className="text-sm font-medium text-gray-700">Cancellation Fee</Label>
                      <Input
                        id="cancellationFee"
                        type="number"
                        step="0.01"
                        value={formData.cancellationFee}
                        onChange={(e) => setFormData({ ...formData, cancellationFee: parseFloat(e.target.value) || 0 })}
                        placeholder="0.00"
                        className="h-11"
                      />
                    </div>
                  </div>
                </div>

                {/* Fee Structure */}
                <div className="space-y-6 p-6 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-6 bg-purple-600 rounded-full"></div>
                    <h3 className="text-xl font-semibold text-gray-900">Fee Structure</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="platformFeePercentage" className="text-sm font-medium text-gray-700">Platform Fee % *</Label>
                      <Input
                        id="platformFeePercentage"
                        type="number"
                        step="0.01"
                        value={formData.platformFeePercentage * 100}
                        onChange={(e) => setFormData({ ...formData, platformFeePercentage: (parseFloat(e.target.value) || 0) / 100 })}
                        placeholder="15.00"
                        className="h-11"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="driverEarningsPercentage" className="text-sm font-medium text-gray-700">Driver Earnings % *</Label>
                      <Input
                        id="driverEarningsPercentage"
                        type="number"
                        step="0.01"
                        value={formData.driverEarningsPercentage * 100}
                        onChange={(e) => setFormData({ ...formData, driverEarningsPercentage: (parseFloat(e.target.value) || 0) / 100 })}
                        placeholder="85.00"
                        className="h-11"
                      />
                    </div>
                  </div>
                </div>

                {/* Multipliers */}
                <div className="space-y-6 p-6 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-6 bg-orange-600 rounded-full"></div>
                    <h3 className="text-xl font-semibold text-gray-900">Fare Multipliers</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="surgeMultiplier" className="text-sm font-medium text-gray-700">Surge Multiplier</Label>
                      <Input
                        id="surgeMultiplier"
                        type="number"
                        step="0.01"
                        value={formData.surgeMultiplier}
                        onChange={(e) => setFormData({ ...formData, surgeMultiplier: parseFloat(e.target.value) || 1.0 })}
                        placeholder="1.00"
                        className="h-11"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="maxSurgeMultiplier" className="text-sm font-medium text-gray-700">Max Surge Multiplier</Label>
                      <Input
                        id="maxSurgeMultiplier"
                        type="number"
                        step="0.01"
                        value={formData.maxSurgeMultiplier}
                        onChange={(e) => setFormData({ ...formData, maxSurgeMultiplier: parseFloat(e.target.value) || 3.0 })}
                        placeholder="3.00"
                        className="h-11"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="nightFareMultiplier" className="text-sm font-medium text-gray-700">Night Fare Multiplier</Label>
                      <Input
                        id="nightFareMultiplier"
                        type="number"
                        step="0.01"
                        value={formData.nightFareMultiplier}
                        onChange={(e) => setFormData({ ...formData, nightFareMultiplier: parseFloat(e.target.value) || 1.2 })}
                        placeholder="1.20"
                        className="h-11"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="weekendFareMultiplier" className="text-sm font-medium text-gray-700">Weekend Fare Multiplier</Label>
                      <Input
                        id="weekendFareMultiplier"
                        type="number"
                        step="0.01"
                        value={formData.weekendFareMultiplier}
                        onChange={(e) => setFormData({ ...formData, weekendFareMultiplier: parseFloat(e.target.value) || 1.1 })}
                        placeholder="1.10"
                        className="h-11"
                      />
                    </div>
                  </div>
                </div>

                {/* Time Settings */}
                <div className="space-y-6 p-6 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-6 bg-indigo-600 rounded-full"></div>
                    <h3 className="text-xl font-semibold text-gray-900">Time Settings</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="cancellationTimeLimit" className="text-sm font-medium text-gray-700">Cancellation Time Limit (seconds)</Label>
                      <Input
                        id="cancellationTimeLimit"
                        type="number"
                        value={formData.cancellationTimeLimit}
                        onChange={(e) => setFormData({ ...formData, cancellationTimeLimit: parseInt(e.target.value) || 300 })}
                        placeholder="300"
                        className="h-11"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="estimatedPickupTime" className="text-sm font-medium text-gray-700">Estimated Pickup Time (minutes)</Label>
                      <Input
                        id="estimatedPickupTime"
                        type="number"
                        value={formData.estimatedPickupTime}
                        onChange={(e) => setFormData({ ...formData, estimatedPickupTime: parseInt(e.target.value) || 5 })}
                        placeholder="5"
                        className="h-11"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="maxWaitTime" className="text-sm font-medium text-gray-700">Max Wait Time (minutes)</Label>
                      <Input
                        id="maxWaitTime"
                        type="number"
                        value={formData.maxWaitTime}
                        onChange={(e) => setFormData({ ...formData, maxWaitTime: parseInt(e.target.value) || 10 })}
                        placeholder="10"
                        className="h-11"
                      />
                    </div>
                  </div>
                </div>

                {/* Luggage Restrictions */}
                <div className="space-y-6 p-6 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-6 bg-yellow-600 rounded-full"></div>
                    <h3 className="text-xl font-semibold text-gray-900">Luggage Restrictions</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="minLuggage" className="text-sm font-medium text-gray-700">Minimum Luggage (pieces)</Label>
                      <Input
                        id="minLuggage"
                        type="number"
                        min="0"
                        value={formData.minLuggage || ''}
                        onChange={(e) => setFormData({ ...formData, minLuggage: e.target.value ? parseInt(e.target.value) : undefined })}
                        placeholder="0"
                        className="h-11"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="maxLuggage" className="text-sm font-medium text-gray-700">Maximum Luggage (pieces)</Label>
                      <Input
                        id="maxLuggage"
                        type="number"
                        min="0"
                        value={formData.maxLuggage || ''}
                        onChange={(e) => setFormData({ ...formData, maxLuggage: e.target.value ? parseInt(e.target.value) : undefined })}
                        placeholder="10"
                        className="h-11"
                      />
                    </div>
                  </div>
                  <div className="text-sm text-gray-600">
                    Set luggage restrictions for this ride service. Leave empty for no restrictions.
                  </div>
                </div>
              </div>

              <SheetFooter className="pt-6 border-t border-gray-200">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowCreateSheet(false);
                    setShowEditSheet(false);
                    resetForm();
                  }}
                  className="h-11 px-6"
                >
                  Cancel
                </Button>
                <Button
                  onClick={showCreateSheet ? handleCreateRideService : handleUpdateRideService}
                  disabled={isSubmitting || !formData.name}
                  className="h-11 px-6"
                >
                  {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {showCreateSheet ? 'Create' : 'Update'}
                </Button>
              </SheetFooter>
            </SheetContent>
          </Sheet>

          {/* Delete Confirmation Dialog */}
          <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete Ride Service</DialogTitle>
                <DialogDescription>
                  Are you sure you want to delete "{selectedRideService?.name}"? This action cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDeleteRideService}
                  disabled={isSubmitting}
                >
                  {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Delete
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </PermissionGuard>
    </AuthGuard>
  );
}
