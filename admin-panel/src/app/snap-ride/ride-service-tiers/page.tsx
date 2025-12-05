'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Search, 
  Filter,
  Loader2,
  Users,
  MoreVertical,
  Eye,
  Check,
  X,
  Car,
  Bike,
  UserPlus,
  UserMinus,
  MapPin,
  Phone,
  Calendar,
  Star,
  DollarSign,
  Car as CarIcon,
  AlertCircle,
  User,
  BarChart3,
  TrendingUp,
  Activity,
  Wifi,
  WifiOff,
  Clock,
} from 'lucide-react';
import { apiService } from '@/services/api';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { PermissionGuard } from '@/components/auth/PermissionGuard';
import { useAdminStore } from '@/stores/adminStore';

interface Driver {
  id: string;
  driverId: string;
  status: string;
  isOnline: boolean;
  isRentalType: boolean;
  totalRides: number;
  totalEarnings: number;
  rating: number;
  ratingCount: number;
  isVerified: boolean;
  isActive: boolean;
  createdAt: string;
  updatedBy?: string;
  updatedAt?: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    phoneNumber: string;
  };
  rideService?: {
    id: string;
    name: string;
    vehicleType: string;
    isActive: boolean;
  };
  riderApplication: {
    id: string;
    status: string;
    vehicleType: string;
    vehicleModel: string;
    vehiclePlate: string;
  };
}

interface RideService {
  id: string;
  name: string;
  vehicleType: string;
  description: string;
  isDefault: boolean;
}

interface PerformanceMetrics {
  totalRides: number;
  totalEarnings: number;
  rating: number;
  ratingCount: number;
  settlements: {
    paid: number;
    pending: number;
    processing: number;
  };
}

type DateFilter = 'today' | 'week' | 'month' | 'year' | 'all';

interface ServiceKPI {
  serviceId: string;
  serviceName: string;
  vehicleType: string;
  totalDrivers: number;
  onlineDrivers: number;
  offlineDrivers: number;
  busyDrivers: number;
}

interface OverallKPI {
  totalDrivers: number;
  totalOnlineDrivers: number;
  totalOfflineDrivers: number;
  totalBusyDrivers: number;
  totalAssignedDrivers: number;
  totalUnassignedDrivers: number;
}

interface KPIData {
  overallKPIs: OverallKPI;
  serviceKPIs: ServiceKPI[];
}

function RideServiceTiersPage() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [rideServices, setRideServices] = useState<RideService[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const { addNotification } = useAdminStore();
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedRideServiceId, setSelectedRideServiceId] = useState('');
  const [assignLoading, setAssignLoading] = useState(false);
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics | null>(null);
  const [performanceLoading, setPerformanceLoading] = useState(false);
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRideServiceFilter, setSelectedRideServiceFilter] = useState('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('all');
  const [statusUpdateLoading, setStatusUpdateLoading] = useState(false);
  const [kpiData, setKpiData] = useState<KPIData | null>(null);
  const [kpiLoading, setKpiLoading] = useState(false);
  const [showServiceKPIs, setShowServiceKPIs] = useState(false);

  // Load drivers and ride services on mount
  useEffect(() => {
    loadDrivers();
    loadRideServices();
    loadKPIData();
  }, []);

  // Reload drivers when filters change
  useEffect(() => {
    loadDrivers();
  }, [searchTerm, selectedRideServiceFilter, selectedStatusFilter]);

  const loadDrivers = async () => {
    try {
      setLoading(true);
      setError('');
      
      const params: any = {};
      if (searchTerm) params.search = searchTerm;
      if (selectedRideServiceFilter !== 'all') params.rideServiceId = selectedRideServiceFilter;
      if (selectedStatusFilter !== 'all') params.driverStatus = selectedStatusFilter;
      
      const response = await apiService.getRideServiceTiers(params) as any;
      
      if (response.success) {
        setDrivers(response.data);
      } else {
        const errorMsg = 'Failed to load drivers';
        setError(errorMsg);
        addNotification({
          type: 'error',
          title: 'Error',
          message: errorMsg
        });
      }
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to load drivers';
      setError(errorMsg);
      addNotification({
        type: 'error',
        title: 'Error',
        message: errorMsg
      });
    } finally {
      setLoading(false);
    }
  };

  const loadRideServices = async () => {
    try {
      const response = await apiService.getAvailableRideServices() as any;
      if (response.success) {
        setRideServices(response.data);
      }
    } catch (err: any) {
      console.error('Error loading ride services:', err);
    }
  };

  const loadKPIData = async () => {
    try {
      setKpiLoading(true);
      const response = await apiService.getRideServiceTiersKPIs() as any;
      if (response.success) {
        setKpiData(response.data);
      }
    } catch (err: any) {
      console.error('Error loading KPI data:', err);
    } finally {
      setKpiLoading(false);
    }
  };

  const loadPerformanceMetrics = async (driverId: string, filter: DateFilter) => {
    try {
      setPerformanceLoading(true);
      const response = await apiService.getDriverPerformanceMetrics(driverId, filter) as any;
      if (response.success) {
        setPerformanceMetrics(response.data);
      } else {
        console.error('Failed to load performance metrics:', response.error);
      }
    } catch (err: any) {
      console.error('Error loading performance metrics:', err);
    } finally {
      setPerformanceLoading(false);
    }
  };

  const handleDateFilterChange = (filter: DateFilter) => {
    setDateFilter(filter);
    if (selectedDriver) {
      loadPerformanceMetrics(selectedDriver.id, filter);
    }
  };

  const handleStatusUpdate = async (driver: Driver, newStatus: string) => {
    try {
      setStatusUpdateLoading(true);
      setError('');
      
      const response = await apiService.updateDriverStatus(driver.id, newStatus) as any;
      
      if (response.success) {
        addNotification({
          type: 'success',
          title: 'Success',
          message: `Driver status updated to ${newStatus}`
        });
        loadDrivers(); // Refresh the list
      } else {
        const errorMsg = response.error || 'Failed to update driver status';
        setError(errorMsg);
        addNotification({
          type: 'error',
          title: 'Error',
          message: errorMsg
        });
      }
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to update driver status';
      setError(errorMsg);
      addNotification({
        type: 'error',
        title: 'Error',
        message: errorMsg
      });
    } finally {
      setStatusUpdateLoading(false);
    }
  };

  const handleViewDriver = (driver: Driver) => {
    setSelectedDriver(driver);
    setIsViewModalOpen(true);
    loadPerformanceMetrics(driver.id, dateFilter);
  };

  const handleAssignDriver = (driver: Driver) => {
    setSelectedDriver(driver);
    setSelectedRideServiceId(driver.rideService?.id || '');
    setIsAssignModalOpen(true);
  };

  const handleAssignSubmit = async () => {
    if (!selectedDriver || !selectedRideServiceId) return;

    try {
      setAssignLoading(true);
      setError('');
      
      const response = await apiService.assignDriverToRideService(
        selectedDriver.id, 
        selectedRideServiceId
      ) as any;
      
      if (response.success) {
        addNotification({
          type: 'success',
          title: 'Success',
          message: response.message || 'Driver assigned successfully'
        });
        setIsAssignModalOpen(false);
        loadDrivers(); // Refresh the list
      } else {
        const errorMsg = response.error || 'Failed to assign driver';
        setError(errorMsg);
        addNotification({
          type: 'error',
          title: 'Error',
          message: errorMsg
        });
      }
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to assign driver';
      setError(errorMsg);
      addNotification({
        type: 'error',
        title: 'Error',
        message: errorMsg
      });
    } finally {
      setAssignLoading(false);
    }
  };

  const handleUnassignDriver = async (driver: Driver) => {
    if (!driver.rideService) {
      const errorMsg = 'Driver is not assigned to any ride service';
      setError(errorMsg);
      addNotification({
        type: 'error',
        title: 'Error',
        message: errorMsg
      });
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      const response = await apiService.unassignDriverFromRideService(driver.id) as any;
      
      if (response.success) {
        addNotification({
          type: 'success',
          title: 'Success',
          message: response.message || 'Driver unassigned successfully'
        });
        loadDrivers(); // Refresh the list
      } else {
        const errorMsg = response.error || 'Failed to unassign driver';
        setError(errorMsg);
        addNotification({
          type: 'error',
          title: 'Error',
          message: errorMsg
        });
      }
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to unassign driver';
      setError(errorMsg);
      addNotification({
        type: 'error',
        title: 'Error',
        message: errorMsg
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'online':
        return 'bg-green-100 text-green-800';
      case 'offline':
        return 'bg-gray-100 text-gray-800';
      case 'busy':
        return 'bg-yellow-100 text-yellow-800';
      case 'inactive':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getVehicleIcon = (vehicleType: string) => {
    switch (vehicleType.toLowerCase()) {
      case 'car':
        return <CarIcon className="h-4 w-4" />;
      case 'bike':
        return <Bike className="h-4 w-4" />;
      default:
        return <CarIcon className="h-4 w-4" />;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GM', {
      style: 'currency',
      currency: 'GMD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  return (
    <AuthGuard>
      {/* <PermissionGuard 
        requiredPermission={{ 
          entityType: 'SNAP_RIDE_RIDE_SERVICE_TIERS', 
          permission: 'VIEW' 
        }}
      > */}
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Ride Service Tiers</h1>
              <p className="text-muted-foreground">
                Manage driver assignments to ride services
              </p>
            </div>
          </div>

          {/* KPI Cards */}
          {kpiLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : kpiData && (
            <div className="space-y-6">
              {/* Overall KPIs */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                <Card className="bg-white border-gray-200 hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-blue-600">Total Drivers</p>
                        <p className="text-2xl font-bold text-gray-900">{kpiData.overallKPIs.totalDrivers}</p>
                      </div>
                      <Users className="h-8 w-8 text-blue-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white border-gray-200 hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-green-600">Online</p>
                        <p className="text-2xl font-bold text-gray-900">{kpiData.overallKPIs.totalOnlineDrivers}</p>
                      </div>
                      <Wifi className="h-8 w-8 text-green-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white border-gray-200 hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Offline</p>
                        <p className="text-2xl font-bold text-gray-900">{kpiData.overallKPIs.totalOfflineDrivers}</p>
                      </div>
                      <WifiOff className="h-8 w-8 text-gray-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white border-gray-200 hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-yellow-600">Busy</p>
                        <p className="text-2xl font-bold text-gray-900">{kpiData.overallKPIs.totalBusyDrivers}</p>
                      </div>
                      <Clock className="h-8 w-8 text-yellow-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white border-gray-200 hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-purple-600">Assigned</p>
                        <p className="text-2xl font-bold text-gray-900">{kpiData.overallKPIs.totalAssignedDrivers}</p>
                      </div>
                      <Check className="h-8 w-8 text-purple-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white border-gray-200 hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-red-600">Unassigned</p>
                        <p className="text-2xl font-bold text-gray-900">{kpiData.overallKPIs.totalUnassignedDrivers}</p>
                      </div>
                      <X className="h-8 w-8 text-red-600" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Toggle Button for Service KPIs */}
              <div className="flex justify-center">
                <Button
                  variant="outline"
                  onClick={() => setShowServiceKPIs(!showServiceKPIs)}
                  className="flex items-center space-x-2"
                >
                  <BarChart3 className="h-4 w-4" />
                  <span>{showServiceKPIs ? 'Hide Service Details' : 'Show Service Details'}</span>
                </Button>
              </div>

              {/* Service-specific KPIs */}
              {showServiceKPIs && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {kpiData.serviceKPIs.map((serviceKPI) => (
                    <Card key={serviceKPI.serviceId} className="border-l-4 border-l-blue-500 hover:shadow-lg transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center space-x-2">
                            {getVehicleIcon(serviceKPI.vehicleType)}
                            <h3 className="text-lg font-semibold text-gray-900">{serviceKPI.serviceName}</h3>
                          </div>
                          <Badge className="bg-blue-100 text-blue-800">
                            {serviceKPI.totalDrivers} drivers
                          </Badge>
                        </div>
                        
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <Wifi className="h-4 w-4 text-green-600" />
                              <span className="text-sm text-gray-600">Online</span>
                            </div>
                            <span className="text-sm font-semibold text-green-600">{serviceKPI.onlineDrivers}</span>
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <WifiOff className="h-4 w-4 text-gray-600" />
                              <span className="text-sm text-gray-600">Offline</span>
                            </div>
                            <span className="text-sm font-semibold text-gray-600">{serviceKPI.offlineDrivers}</span>
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <Clock className="h-4 w-4 text-yellow-600" />
                              <span className="text-sm text-gray-600">Busy</span>
                            </div>
                            <span className="text-sm font-semibold text-yellow-600">{serviceKPI.busyDrivers}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Filter className="h-5 w-5" />
                <span>Filters</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Search */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Search</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Driver name or ID..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                {/* Ride Service Filter */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Ride Service</label>
                  <Select value={selectedRideServiceFilter} onValueChange={setSelectedRideServiceFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All services" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60 overflow-y-auto">
                      <SelectItem value="all">All Services</SelectItem>
                      {rideServices.map((service) => (
                        <SelectItem key={service.id} value={service.id}>
                          {service.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Status Filter */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Driver Status</label>
                  <Select value={selectedStatusFilter} onValueChange={setSelectedStatusFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="ONLINE">Online</SelectItem>
                      <SelectItem value="OFFLINE">Offline</SelectItem>
                      <SelectItem value="BUSY">Busy</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded flex items-center space-x-2">
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          )}

          {/* Drivers Table */}
          <Card>
            <CardHeader>
              <CardTitle>Drivers ({drivers.length})</CardTitle>
              <CardDescription>
                Manage driver assignments to ride services
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : drivers.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No drivers found
                </div>
              ) : (
                <div className="space-y-4">
                  {drivers.map((driver: Driver) => (
                    <div key={driver.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="flex-shrink-0">
                            <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                              <Users className="h-6 w-6 text-gray-500" />
                            </div>
                          </div>
                          <div>
                            <h3 className="text-lg font-medium">
                              {driver.user.firstName} {driver.user.lastName}
                            </h3>
                            <p className="text-sm text-gray-500">
                              ID: {driver.driverId} • {driver.user.phoneNumber}
                            </p>
                            <div className="flex items-center space-x-2 mt-1">
                              <Badge className={getStatusColor(driver.status)}>
                                {driver.status}
                              </Badge>
                              {driver.isRentalType && (
                                <Badge className="bg-amber-100 text-amber-800">
                                  Rental
                                </Badge>
                              )}
                              {driver.rideService && (
                                <Badge className="bg-blue-100 text-blue-800 flex items-center space-x-1">
                                  {getVehicleIcon(driver.rideService.vehicleType)}
                                  <span>{driver.rideService.name}</span>
                                </Badge>
                              )}
                              {driver.isVerified && (
                                <Badge className="bg-purple-100 text-purple-800">
                                  Verified
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewDriver(driver)}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleAssignDriver(driver)}
                          >
                            <UserPlus className="h-4 w-4 mr-2" />
                            {driver.rideService ? 'Reassign' : 'Assign'}
                          </Button>
                          {driver.rideService && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleUnassignDriver(driver)}
                              disabled={loading}
                            >
                              <UserMinus className="h-4 w-4 mr-2" />
                              Unassign
                            </Button>
                          )}
                          {/* Status Update Button */}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleStatusUpdate(driver, 'OFFLINE')}
                            disabled={statusUpdateLoading || driver.status === 'OFFLINE'}
                            className={driver.status === 'OFFLINE' ? 'opacity-50' : ''}
                          >
                            {statusUpdateLoading ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <X className="h-4 w-4 mr-2" />
                            )}
                            Set Offline
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* View Driver Modal */}
          <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader className="pb-6">
                <DialogTitle className="text-2xl font-semibold">Driver Profile</DialogTitle>
                <DialogDescription className="text-base">
                  Comprehensive driver information and performance details
                </DialogDescription>
              </DialogHeader>
              {selectedDriver && (
                <div className="space-y-8">
                  {/* Header with Driver Photo and Basic Info */}
                  <div className="flex items-start space-x-6 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
                    <div className="flex-shrink-0">
                      <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center">
                        <Users className="h-10 w-10 text-blue-600" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <h2 className="text-2xl font-bold text-gray-900 mb-2">
                        {selectedDriver.user.firstName} {selectedDriver.user.lastName}
                      </h2>
                      <div className="flex items-center space-x-4 text-gray-600">
                        <div className="flex items-center space-x-2">
                          <Phone className="h-4 w-4" />
                          <span>{selectedDriver.user.phoneNumber}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Calendar className="h-4 w-4" />
                          <span>Joined {formatDate(selectedDriver.createdAt)}</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4 mt-3">
                        <Badge className={getStatusColor(selectedDriver.status)}>
                          {selectedDriver.status}
                        </Badge>
                        <Badge className={selectedDriver.isVerified ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                          {selectedDriver.isVerified ? "Verified" : "Not Verified"}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Driver Information */}
                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <div className="text-gray-600 mb-4">Driver Information</div>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center py-2 border-b border-gray-100">
                        <span className="text-gray-600">Driver ID</span>
                        <span className="text-gray-900 font-mono">{selectedDriver.driverId}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-gray-100">
                        <span className="text-gray-600">Status</span>
                        <Badge className={getStatusColor(selectedDriver.status)}>
                          {selectedDriver.status}
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-gray-100">
                        <span className="text-gray-600">Verification</span>
                        <Badge className={selectedDriver.isVerified ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                          {selectedDriver.isVerified ? "Verified" : "Not Verified"}
                        </Badge>
                      </div>
                      {selectedDriver.updatedBy && (
                        <div className="flex justify-between items-center py-2 border-b border-gray-100">
                          <span className="text-gray-600">Last Updated By</span>
                          <span className="text-gray-900">{selectedDriver.updatedBy}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Vehicle Information */}
                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <div className="text-gray-600 mb-4">Vehicle Information</div>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center py-2 border-b border-gray-100">
                        <span className="text-gray-600">Vehicle Type</span>
                        <span className="text-gray-900">{selectedDriver.riderApplication.vehicleType}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-gray-100">
                        <span className="text-gray-600">Model</span>
                        <span className="text-gray-900">{selectedDriver.riderApplication.vehicleModel}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-gray-100">
                        <span className="text-gray-600">License Plate</span>
                        <span className="text-gray-900 font-mono">{selectedDriver.riderApplication.vehiclePlate}</span>
                      </div>
                    </div>
                  </div>

                  {/* Change Log */}
                  {selectedDriver.updatedBy && (
                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                      <div className="text-gray-600 mb-4">Change Log</div>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center py-2 border-b border-gray-100">
                          <span className="text-gray-600">Last Updated By</span>
                          <span className="text-gray-900 font-medium">{selectedDriver.updatedBy}</span>
                        </div>
                        {selectedDriver.updatedAt && (
                          <div className="flex justify-between items-center py-2 border-b border-gray-100">
                            <span className="text-gray-600">Last Updated</span>
                            <span className="text-gray-900">{formatDate(selectedDriver.updatedAt)}</span>
                          </div>
                        )}
                        <div className="text-xs text-gray-500 bg-blue-50 border border-blue-200 rounded p-2">
                          ℹ️ This shows the admin user who last modified the driver's ride service assignment
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Performance Metrics */}
                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="text-gray-600">Performance Metrics</div>
                      <div className="flex space-x-1">
                        {(['today', 'week', 'month', 'year', 'all'] as DateFilter[]).map((filter) => (
                          <button
                            key={filter}
                            onClick={() => handleDateFilterChange(filter)}
                            className={`px-3 py-1 text-xs rounded-md transition-colors ${
                              dateFilter === filter
                                ? 'bg-blue-100 text-blue-700 border border-blue-200'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                          >
                            {filter.charAt(0).toUpperCase() + filter.slice(1)}
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    {performanceLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                      </div>
                    ) : performanceMetrics ? (
                      <div className="space-y-4">
                        {/* Ride Metrics */}
                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <Car className="h-5 w-5 text-blue-600" />
                            <div>
                              <span className="text-gray-600">Total Rides</span>
                              <div className="text-xl text-gray-900">{performanceMetrics.totalRides}</div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Earnings */}
                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <DollarSign className="h-5 w-5 text-green-600" />
                            <div>
                              <span className="text-gray-600">Total Earnings</span>
                              <div className="text-xl text-gray-900">{formatCurrency(performanceMetrics.totalEarnings)}</div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Rating */}
                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <Star className="h-5 w-5 text-yellow-600" />
                            <div>
                              <span className="text-gray-600">Rating</span>
                              <div className="text-xl text-gray-900">
                                {performanceMetrics.rating ? performanceMetrics.rating.toFixed(1) : 'N/A'}
                              </div>
                              <span className="text-sm text-gray-500">
                                {performanceMetrics.ratingCount} reviews
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        {/* Settlement KPIs */}
                        <div className="border-t pt-4">
                          <div className="text-gray-600 mb-3">Settlement Status</div>
                          <div className="text-xs text-gray-500 mb-3 bg-blue-50 border border-blue-200 rounded p-2">
                            ℹ️ Settlement records are for ride service only
                          </div>
                          <div className="grid grid-cols-3 gap-3">
                            <div className="text-center p-3 bg-green-50 rounded-lg border border-green-200">
                              <div className="text-lg font-semibold text-green-700">{performanceMetrics.settlements.paid}</div>
                              <div className="text-xs text-green-600">Paid</div>
                            </div>
                            <div className="text-center p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                              <div className="text-lg font-semibold text-yellow-700">{performanceMetrics.settlements.pending}</div>
                              <div className="text-xs text-yellow-600">Pending</div>
                            </div>
                            <div className="text-center p-3 bg-blue-50 rounded-lg border border-blue-200">
                              <div className="text-lg font-semibold text-blue-700">{performanceMetrics.settlements.processing}</div>
                              <div className="text-xs text-blue-600">Processing</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        No performance data available
                      </div>
                    )}
                  </div>

                  {/* Current Assignment */}
                  {selectedDriver.rideService && (
                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                      <div className="text-gray-600 mb-4">Current Assignment</div>
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            {getVehicleIcon(selectedDriver.rideService.vehicleType)}
                            <div>
                              <span className="text-gray-900">{selectedDriver.rideService.name}</span>
                              <div className="text-sm text-gray-600">Ride Service</div>
                            </div>
                          </div>
                          <Badge className={selectedDriver.rideService.isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                            {selectedDriver.rideService.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </DialogContent>
          </Dialog>

          {/* Assign Driver Modal */}
          <Dialog open={isAssignModalOpen} onOpenChange={setIsAssignModalOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Assign Driver to Ride Service</DialogTitle>
                <DialogDescription>
                  {selectedDriver && (
                    <>Assign {selectedDriver.user.firstName} {selectedDriver.user.lastName} to a ride service</>
                  )}
                </DialogDescription>
              </DialogHeader>
              {selectedDriver && (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Select Ride Service</label>
                    <Select value={selectedRideServiceId} onValueChange={setSelectedRideServiceId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a ride service" />
                      </SelectTrigger>
                      <SelectContent>
                        {rideServices.map((service) => (
                          <SelectItem key={service.id} value={service.id}>
                            <div className="flex items-center space-x-2">
                              {getVehicleIcon(service.vehicleType)}
                              <span>{service.name}</span>
                              {service.isDefault && (
                                <Badge className="bg-gray-100 text-gray-800 text-xs">Default</Badge>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex justify-end space-x-2">
                    <Button
                      variant="outline"
                      onClick={() => setIsAssignModalOpen(false)}
                      disabled={assignLoading}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleAssignSubmit}
                      disabled={!selectedRideServiceId || assignLoading}
                    >
                      {assignLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Assigning...
                        </>
                      ) : (
                        'Assign Driver'
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>
      {/* </PermissionGuard> */}
    </AuthGuard>
  );
}

export default RideServiceTiersPage;
