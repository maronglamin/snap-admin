'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CheckCircle, XCircle, Clock, AlertCircle, Eye, Download, TrendingUp } from 'lucide-react';
import { apiRequest } from '@/services/api';
import { usePermissions } from '@/hooks/usePermissions';
import { PermissionGuard } from '@/components/auth/PermissionGuard';
import { AuthGuard } from '@/components/auth/AuthGuard';

interface Driver {
  id: string;
  driverId: string;
  isOnline: boolean;
  status: 'OFFLINE' | 'ONLINE' | 'BUSY' | 'SUSPENDED';
  totalRides: number;
  totalEarnings: number;
  rating?: number;
  ratingCount: number;
  isActive: boolean;
  createdAt: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    phoneNumber: string;
  };
  riderApplication: {
    id: string;
    vehicleType: 'DRIVER' | 'MOTORCYCLE' | 'BICYCLE';
    vehicleModel: string;
    vehiclePlate: string;
    licenseNumber: string;
    status: string;
  };
  rides?: Array<{
    id: string;
    rideId: string;
    status: string;
    totalFare: number;
    driverEarnings: number;
    startedAt?: string;
    completedAt?: string;
    customerRating?: number;
  }>;
  earnings?: Array<{
    id: string;
    amount: number;
    type: string;
    description: string;
    createdAt: string;
  }>;
  calculatedStats?: {
    totalRides: number;
    totalEarnings: number;
    averageRating: number;
    currentMonth?: {
      month: string;
      rides: number;
      earnings: number;
    };
  };
}

interface DriverStats {
  totalDrivers: number;
  activeDrivers: number;
  onlineDrivers: number;
  suspendedDrivers: number;
  todayNewDrivers: number;
  thisWeekNewDrivers: number;
  thisMonthNewDrivers: number;
}

export default function DriverManagementPage() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [stats, setStats] = useState<DriverStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [isActionDialogOpen, setIsActionDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<'suspend' | 'activate' | null>(null);
  const [suspensionReason, setSuspensionReason] = useState('');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0,
  });

  // Filters
  const [filters, setFilters] = useState({
    status: '',
    isOnline: '',
    search: '',
  });

  const { hasPermission } = usePermissions();

  const loadDrivers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...(filters.status && filters.status !== 'all' && { status: filters.status }),
        ...(filters.isOnline && filters.isOnline !== 'all' && { isOnline: filters.isOnline }),
        ...(filters.search && { search: filters.search }),
      });

      const response = await apiRequest(`/driver-management?${params}`);
      setDrivers(response.drivers);
      setPagination(response.pagination);
    } catch (error) {
      console.error('Error loading drivers:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await apiRequest('/driver-management/stats/overview');
      setStats(response.stats);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const loadDriverDetails = async (driverId: string) => {
    try {
      const response = await apiRequest(`/driver-management/${driverId}`);
      setSelectedDriver(response);
    } catch (error) {
      console.error('Error loading driver details:', error);
    }
  };

  useEffect(() => {
    loadDrivers();
    loadStats();
  }, [pagination.page, filters]);

  const handleAction = async () => {
    if (!selectedDriver || !actionType) return;

    try {
      let endpoint = '';
      let data = {};

      switch (actionType) {
        case 'suspend':
          endpoint = `/driver-management/${selectedDriver.id}/suspend`;
          data = { reason: suspensionReason };
          break;
        case 'activate':
          endpoint = `/driver-management/${selectedDriver.id}/activate`;
          break;
      }

      await apiRequest(endpoint, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
      setIsActionDialogOpen(false);
      setSuspensionReason('');
      setActionType(null);
      loadDrivers();
      loadStats();
    } catch (error) {
      console.error('Error performing action:', error);
    }
  };

  const getStatusBadge = (status: string, isOnline: boolean) => {
    const statusConfig = {
      OFFLINE: { color: 'bg-gray-100 text-gray-800', icon: Clock },
      ONLINE: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
      BUSY: { color: 'bg-yellow-100 text-yellow-800', icon: AlertCircle },
      SUSPENDED: { color: 'bg-red-100 text-red-800', icon: XCircle },
    };

    const config = statusConfig[status as keyof typeof statusConfig];
    const Icon = config.icon;

    return (
      <Badge className={config.color}>
        <Icon className="w-3 h-3 mr-1" />
        {status.toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
        {isOnline && status === 'ONLINE' && ' • Online'}
      </Badge>
    );
  };

  const getVehicleTypeLabel = (type: string) => {
    const labels = {
      DRIVER: 'Car',
      MOTORCYCLE: 'Motorcycle',
      BICYCLE: 'Bicycle',
    };
    return labels[type as keyof typeof labels] || type;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'GMD',
    }).format(amount);
  };

  return (
    <AuthGuard>
      <PermissionGuard requiredPermission={{ entityType: 'SNAP_RIDE_DRIVER_MANAGEMENT', permission: 'VIEW' }}>
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold">Driver Management</h1>
            {hasPermission('SNAP_RIDE_DRIVER_MANAGEMENT', 'EXPORT') && (
              <Button variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            )}
          </div>

          {/* Statistics Cards */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Drivers</p>
                      <p className="text-2xl font-bold">{stats.totalDrivers}</p>
                    </div>
                    <div className="p-2 bg-blue-100 rounded-full">
                      <TrendingUp className="w-6 h-6 text-blue-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Active Drivers</p>
                      <p className="text-2xl font-bold text-green-600">{stats.activeDrivers}</p>
                    </div>
                    <div className="p-2 bg-green-100 rounded-full">
                      <CheckCircle className="w-6 h-6 text-green-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Online Now</p>
                      <p className="text-2xl font-bold text-blue-600">{stats.onlineDrivers}</p>
                    </div>
                    <div className="p-2 bg-blue-100 rounded-full">
                      <CheckCircle className="w-6 h-6 text-blue-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">This Month</p>
                      <p className="text-2xl font-bold">{stats.thisMonthNewDrivers}</p>
                    </div>
                    <div className="p-2 bg-purple-100 rounded-full">
                      <TrendingUp className="w-6 h-6 text-purple-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input
                  placeholder="Search by name, phone, driver ID..."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                />
                <Select value={filters.status} onValueChange={(value) => setFilters({ ...filters, status: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="OFFLINE">Offline</SelectItem>
                    <SelectItem value="ONLINE">Online</SelectItem>
                    <SelectItem value="BUSY">Busy</SelectItem>
                    <SelectItem value="SUSPENDED">Suspended</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filters.isOnline} onValueChange={(value) => setFilters({ ...filters, isOnline: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by online status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="true">Online</SelectItem>
                    <SelectItem value="false">Offline</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Drivers Table */}
          <Card>
            <CardHeader>
              <CardTitle>Drivers</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Driver</TableHead>
                    <TableHead>Vehicle</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Performance</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {drivers.map((driver) => (
                    <TableRow key={driver.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {driver.user.firstName} {driver.user.lastName}
                          </div>
                          <div className="text-sm text-gray-500">{driver.user.phoneNumber}</div>
                          <div className="text-xs text-gray-400">ID: {driver.driverId}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{driver.riderApplication.vehicleModel}</div>
                          <div className="text-sm text-gray-500">
                            {getVehicleTypeLabel(driver.riderApplication.vehicleType)} • {driver.riderApplication.vehiclePlate}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(driver.status, driver.isOnline)}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{driver.totalRides} rides</div>
                          <div className="text-sm text-gray-500">{formatCurrency(driver.totalEarnings)}</div>
                          {driver.rating && (
                            <div className="text-xs text-gray-400">
                              ⭐ {driver.rating.toFixed(1)} ({driver.ratingCount} reviews)
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{formatDate(driver.createdAt)}</TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedDriver(driver);
                              loadDriverDetails(driver.id);
                              setIsDetailDialogOpen(true);
                            }}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          {driver.status !== 'SUSPENDED' && hasPermission('SNAP_RIDE_DRIVER_MANAGEMENT', 'EDIT') && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedDriver(driver);
                                setActionType('suspend');
                                setIsActionDialogOpen(true);
                              }}
                            >
                              <XCircle className="w-4 h-4 text-red-600" />
                            </Button>
                          )}
                          {driver.status === 'SUSPENDED' && hasPermission('SNAP_RIDE_DRIVER_MANAGEMENT', 'EDIT') && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedDriver(driver);
                                setActionType('activate');
                                setIsActionDialogOpen(true);
                              }}
                            >
                              <CheckCircle className="w-4 h-4 text-green-600" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {pagination.pages > 1 && (
                <div className="flex justify-between items-center mt-4">
                  <div className="text-sm text-gray-500">
                    Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                    {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} results
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pagination.page === 1}
                      onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pagination.page === pagination.pages}
                      onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Driver Detail Dialog */}
          <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
            <DialogContent className="max-w-6xl max-h-[95vh] overflow-y-auto">
              <DialogHeader className="pb-6">
                <DialogTitle className="text-2xl">Driver Details</DialogTitle>
              </DialogHeader>
              {selectedDriver && (
                <div className="space-y-8">
                  {/* Personal Information */}
                  <div className="bg-white border border-gray-200 p-6 rounded-xl shadow-sm">
                    <h3 className="text-xl mb-4 text-gray-900 border-b border-gray-200 pb-2">Personal Information</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center py-2 border-b border-gray-100">
                        <span className="font-semibold text-gray-700">Full Name:</span>
                        <span className="text-gray-900">{selectedDriver.user.firstName} {selectedDriver.user.lastName}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-gray-100">
                        <span className="font-semibold text-gray-700">Phone Number:</span>
                        <span className="text-gray-900">{selectedDriver.user.phoneNumber}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-gray-100">
                        <span className="font-semibold text-gray-700">Driver ID:</span>
                        <span className="text-gray-900">{selectedDriver.driverId}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-gray-100">
                        <span className="font-semibold text-gray-700">Joined Date:</span>
                        <span className="text-gray-900">{formatDate(selectedDriver.createdAt)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Vehicle Information */}
                  <div className="bg-white border border-gray-200 p-6 rounded-xl shadow-sm">
                    <h3 className="text-xl mb-4 text-gray-900 border-b border-gray-200 pb-2">Vehicle Information</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center py-2 border-b border-gray-100">
                        <span className="font-semibold text-gray-700">Vehicle Type:</span>
                        <span className="text-gray-900">{getVehicleTypeLabel(selectedDriver.riderApplication.vehicleType)}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-gray-100">
                        <span className="font-semibold text-gray-700">Vehicle Model:</span>
                        <span className="text-gray-900">{selectedDriver.riderApplication.vehicleModel}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-gray-100">
                        <span className="font-semibold text-gray-700">Vehicle Plate:</span>
                        <span className="text-gray-900">{selectedDriver.riderApplication.vehiclePlate}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-gray-100">
                        <span className="font-semibold text-gray-700">License Number:</span>
                        <span className="text-gray-900">{selectedDriver.riderApplication.licenseNumber}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-gray-100">
                        <span className="font-semibold text-gray-700">Application Status:</span>
                        <span className="text-gray-900">{selectedDriver.riderApplication.status.toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}</span>
                      </div>
                    </div>
                  </div>

                  {/* Performance & Statistics */}
                  <div className="bg-white border border-gray-200 p-6 rounded-xl shadow-sm">
                    <h3 className="text-xl mb-4 text-gray-900 border-b border-gray-200 pb-2">Performance & Statistics</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center py-2 border-b border-gray-100">
                        <span className="font-semibold text-gray-700">Total Rides:</span>
                        <span className="text-gray-900">
                          {selectedDriver.calculatedStats ? selectedDriver.calculatedStats.totalRides : selectedDriver.totalRides}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-gray-100">
                        <span className="font-semibold text-gray-700">Total Earnings:</span>
                        <span className="text-gray-900">
                          {formatCurrency(selectedDriver.calculatedStats ? selectedDriver.calculatedStats.totalEarnings : selectedDriver.totalEarnings)}
                        </span>
                      </div>
                      {(selectedDriver.calculatedStats?.averageRating || selectedDriver.rating) && (
                        <div className="flex justify-between items-center py-2 border-b border-gray-100">
                          <span className="font-semibold text-gray-700">Rating:</span>
                          <span className="text-gray-900">
                            ⭐ {(selectedDriver.calculatedStats?.averageRating || selectedDriver.rating || 0).toFixed(1)} ({selectedDriver.ratingCount} reviews)
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between items-center py-2 border-b border-gray-100">
                        <span className="font-semibold text-gray-700">Average Earnings per Ride:</span>
                        <span className="text-gray-900">
                          {(() => {
                            const totalRides = selectedDriver.calculatedStats ? selectedDriver.calculatedStats.totalRides : selectedDriver.totalRides;
                            const totalEarnings = selectedDriver.calculatedStats ? selectedDriver.calculatedStats.totalEarnings : selectedDriver.totalEarnings;
                            return totalRides > 0 ? formatCurrency(totalEarnings / totalRides) : 'N/A';
                          })()}
                        </span>
                      </div>
                      {/* Current Month Statistics */}
                      {selectedDriver.calculatedStats?.currentMonth && (
                        <>
                          <div className="mt-4 pt-4 border-t border-gray-200">
                            <div className="flex items-center mb-3">
                              <span className="text-sm font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded-md">
                                📅 {selectedDriver.calculatedStats.currentMonth.month}
                              </span>
                            </div>
                            <div className="space-y-3">
                              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                                <span className="font-semibold text-gray-700">Monthly Rides:</span>
                                <span className="text-gray-900">
                                  {selectedDriver.calculatedStats.currentMonth.rides}
                                </span>
                              </div>
                              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                                <span className="font-semibold text-gray-700">Monthly Earnings:</span>
                                <span className="text-gray-900">
                                  {formatCurrency(selectedDriver.calculatedStats.currentMonth.earnings)}
                                </span>
                              </div>
                              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                                <span className="font-semibold text-gray-700">Monthly Average per Ride:</span>
                                <span className="text-gray-900">
                                  {selectedDriver.calculatedStats.currentMonth.rides > 0 
                                    ? formatCurrency(selectedDriver.calculatedStats.currentMonth.earnings / selectedDriver.calculatedStats.currentMonth.rides)
                                    : 'N/A'
                                  }
                                </span>
                              </div>
                            </div>
                          </div>
                        </>
                      )}
                      
                      {/* Recent Activity (Last 10 Rides) */}
                      {selectedDriver.rides && selectedDriver.rides.length > 0 && (
                        <>
                          <div className="mt-4 pt-4 border-t border-gray-200">
                            <div className="flex items-center mb-3">
                              <span className="text-sm font-medium text-green-600 bg-green-50 px-2 py-1 rounded-md">
                                📊 Recent Activity (Last 10 Rides)
                              </span>
                            </div>
                            <div className="space-y-3">
                              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                                <span className="font-semibold text-gray-700">Completed Rides:</span>
                                <span className="text-gray-900">
                                  {selectedDriver.rides.filter(ride => ride.status === 'COMPLETED').length}
                                </span>
                              </div>
                              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                                <span className="font-semibold text-gray-700">Cancelled Rides:</span>
                                <span className="text-gray-900">
                                  {selectedDriver.rides.filter(ride => ride.status === 'CANCELLED').length}
                                </span>
                              </div>
                              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                                <span className="font-semibold text-gray-700">Recent Completion Rate:</span>
                                <span className="text-gray-900">
                                  {(() => {
                                    const totalRecentRides = selectedDriver.rides.length;
                                    const completedRides = selectedDriver.rides.filter(ride => ride.status === 'COMPLETED').length;
                                    return totalRecentRides > 0 ? `${((completedRides / totalRecentRides) * 100).toFixed(1)}%` : 'N/A';
                                  })()}
                                </span>
                              </div>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Status Information */}
                  <div className="bg-white border border-gray-200 p-6 rounded-xl shadow-sm">
                    <h3 className="text-xl mb-4 text-gray-900 border-b border-gray-200 pb-2">Status Information</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center py-2 border-b border-gray-100">
                        <span className="font-semibold text-gray-700">Driver Status:</span>
                        <span>{getStatusBadge(selectedDriver.status, selectedDriver.isOnline)}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-gray-100">
                        <span className="font-semibold text-gray-700">Online Status:</span>
                        <span className="text-gray-900">{selectedDriver.isOnline ? 'Online' : 'Offline'}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-gray-100">
                        <span className="font-semibold text-gray-700">Account Status:</span>
                        <span className="text-gray-900">{selectedDriver.isActive ? 'Active' : 'Inactive'}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-gray-100">
                        <span className="font-semibold text-gray-700">Last Activity:</span>
                        <span className="text-gray-900">{formatDate(selectedDriver.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>

          {/* Action Dialog */}
          <Dialog open={isActionDialogOpen} onOpenChange={setIsActionDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {actionType === 'suspend' && 'Suspend Driver'}
                  {actionType === 'activate' && 'Activate Driver'}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <p>
                  Are you sure you want to{' '}
                  {actionType === 'suspend' && 'suspend'}
                  {actionType === 'activate' && 'activate'}
                  {' '}this driver?
                </p>
                
                {actionType === 'suspend' && (
                  <div>
                    <label className="block text-sm font-medium mb-2">Reason for suspension</label>
                    <Input
                      value={suspensionReason}
                      onChange={(e) => setSuspensionReason(e.target.value)}
                      placeholder="Enter reason..."
                    />
                  </div>
                )}
                
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setIsActionDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    variant={actionType === 'activate' ? 'default' : 'destructive'}
                    onClick={handleAction}
                    disabled={actionType === 'suspend' && !suspensionReason.trim()}
                  >
                    Confirm
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </PermissionGuard>
    </AuthGuard>
  );
} 