'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CheckCircle, XCircle, Clock, AlertCircle, Eye, Download, MapPin, DollarSign, Calendar } from 'lucide-react';
import { apiRequest } from '@/services/api';
import { usePermissions } from '@/hooks/usePermissions';
import { PermissionGuard } from '@/components/auth/PermissionGuard';
import { AuthGuard } from '@/components/auth/AuthGuard';

interface Ride {
  id: string;
  rideId: string;
  status: 'REQUESTED' | 'ACCEPTED' | 'ARRIVING' | 'ARRIVED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'EXPIRED';
  rideType: 'STANDARD' | 'PREMIUM' | 'POOL' | 'DELIVERY';
  totalFare: number;
  driverEarnings: number;
  platformFee: number;
  paymentMethod: 'CASH' | 'CARD' | 'MOBILE_MONEY' | 'WALLET';
  paymentStatus: 'PENDING' | 'PAID' | 'SETTLED' | 'FAILED' | 'REFUNDED' | 'CANCELLED';
  customerRating?: number;
  driverRating?: number;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  customer: {
    id: string;
    firstName: string;
    lastName: string;
    phoneNumber: string;
  };
  driver: {
    id: string;
    driverId: string;
    user: {
      firstName: string;
      lastName: string;
      phoneNumber: string;
    };
  };
  rideRequest: {
    id: string;
    requestId: string;
    requestedAt: string;
  };
}

interface RideStats {
  totalRides: number;
  completedRides: number;
  cancelledRides: number;
  cancellationRate: number;
  totalRevenue: number;
  totalDriverEarnings: number;
  totalPlatformFees: number;
  todayRides: number;
  thisWeekRides: number;
  thisMonthRides: number;
}

export default function RideManagementPage() {
  const [rides, setRides] = useState<Ride[]>([]);
  const [stats, setStats] = useState<RideStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedRide, setSelectedRide] = useState<Ride | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0,
  });



  // Get today's date in YYYY-MM-DD format
  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  // Filters
  const [filters, setFilters] = useState({
    status: '',
    paymentStatus: '',
    search: '',
    startDate: getTodayDate(),
    endDate: getTodayDate(),
  });

  const { hasPermission } = usePermissions();

  const loadRides = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...(filters.status && filters.status !== 'all' && { status: filters.status }),
        ...(filters.paymentStatus && filters.paymentStatus !== 'all' && { paymentStatus: filters.paymentStatus }),
        ...(filters.search && { search: filters.search }),
        ...(filters.startDate && { startDate: filters.startDate }),
        ...(filters.endDate && { endDate: filters.endDate }),
      });

      const response = await apiRequest(`/ride-management?${params}`);
      setRides(response.rides);
      setPagination(response.pagination);
    } catch (error) {
      console.error('Error loading rides:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await apiRequest('/ride-management/stats/overview');
      setStats(response.stats);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  useEffect(() => {
    loadRides();
    loadStats();
  }, [pagination.page, filters]);

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      REQUESTED: { color: 'bg-blue-100 text-blue-800', icon: Clock },
      ACCEPTED: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
      ARRIVING: { color: 'bg-yellow-100 text-yellow-800', icon: AlertCircle },
      ARRIVED: { color: 'bg-purple-100 text-purple-800', icon: MapPin },
      IN_PROGRESS: { color: 'bg-orange-100 text-orange-800', icon: MapPin },
      COMPLETED: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
      CANCELLED: { color: 'bg-red-100 text-red-800', icon: XCircle },
      EXPIRED: { color: 'bg-gray-100 text-gray-800', icon: XCircle },
    };

    const config = statusConfig[status as keyof typeof statusConfig];
    const Icon = config.icon;

    return (
      <Badge className={config.color}>
        <Icon className="w-3 h-3 mr-1" />
        {status.replace('_', ' ')}
      </Badge>
    );
  };

  const getPaymentStatusBadge = (status: string) => {
    const statusConfig = {
      PENDING: { color: 'bg-yellow-100 text-yellow-800' },
      PAID: { color: 'bg-green-100 text-green-800' },
      SETTLED: { color: 'bg-blue-100 text-blue-800' },
      FAILED: { color: 'bg-red-100 text-red-800' },
      REFUNDED: { color: 'bg-gray-100 text-gray-800' },
      CANCELLED: { color: 'bg-red-100 text-red-800' },
    };

    const config = statusConfig[status as keyof typeof statusConfig];

    return (
      <Badge className={config.color}>
        {status}
      </Badge>
    );
  };

  const getRideTypeLabel = (type: string) => {
    const labels = {
      STANDARD: 'Standard',
      PREMIUM: 'Premium',
      POOL: 'Pool',
      DELIVERY: 'Delivery',
    };
    return labels[type as keyof typeof labels] || type;
  };

  const getPaymentMethodLabel = (method: string) => {
    const labels = {
      CASH: 'Cash',
      CARD: 'Card',
      MOBILE_MONEY: 'Mobile Money',
      WALLET: 'Wallet',
    };
    return labels[method as keyof typeof labels] || method;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'GMD',
    }).format(amount);
  };

  const exportToCSV = async () => {
    try {
      setLoading(true);
      
      // Build export parameters with all filters but no pagination
      const exportParams = new URLSearchParams({
        export: 'true',
        ...(filters.status && filters.status !== 'all' && { status: filters.status }),
        ...(filters.paymentStatus && filters.paymentStatus !== 'all' && { paymentStatus: filters.paymentStatus }),
        ...(filters.search && { search: filters.search }),
        ...(filters.startDate && { startDate: filters.startDate }),
        ...(filters.endDate && { endDate: filters.endDate }),
      });

      // Get auth token using the same method as apiRequest
      const getAuthToken = () => {
        if (typeof window !== 'undefined') {
          const authStorage = localStorage.getItem('auth-storage');
          if (authStorage) {
            try {
              const parsed = JSON.parse(authStorage);
              const token = parsed.token || parsed.state?.token || parsed.accessToken || null;
              return token;
            } catch (error) {
              console.error('Error parsing auth storage:', error);
              return null;
            }
          }
        }
        return null;
      };

      const token = getAuthToken();
      
      // Use fetch directly for blob response
      const response = await fetch(`http://snap-admin.cloudnexus.biz:8080/api/ride-management/export?${exportParams}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Export failed:', response.status, errorText);
        throw new Error(`Export failed: ${response.status} ${response.statusText}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `ride-management-export-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting rides:', error);
      // You might want to show a toast notification here
      alert('Export failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthGuard>
      <PermissionGuard requiredPermission={{ entityType: 'SNAP_RIDE_RIDE_MANAGEMENT', permission: 'VIEW' }}>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
          <div className="max-w-7xl mx-auto space-y-8">
            {/* Header Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    Ride Reports
                  </h1>
                  <p className="text-gray-600 mt-2">Monitor and manage all ride activities across the platform</p>
                </div>
                {hasPermission('SNAP_RIDE_RIDE_MANAGEMENT', 'EXPORT') && (
                  <Button 
                    onClick={exportToCSV}
                    disabled={loading}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-200"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    {loading ? 'Exporting...' : 'Export CSV'}
                  </Button>
                )}
              </div>
            </div>

          {/* Statistics Cards */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-all duration-200 group">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Total Rides</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalRides.toLocaleString()}</p>
                    <p className="text-xs text-gray-400 mt-1">All time rides</p>
                  </div>
                  <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl group-hover:scale-110 transition-transform duration-200">
                    <MapPin className="w-6 h-6 text-white" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-all duration-200 group">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Completed</p>
                    <p className="text-3xl font-bold text-green-600 mt-2">{stats.completedRides.toLocaleString()}</p>
                    <p className="text-xs text-gray-400 mt-1">Successful rides</p>
                  </div>
                  <div className="p-3 bg-gradient-to-br from-green-500 to-green-600 rounded-xl group-hover:scale-110 transition-transform duration-200">
                    <CheckCircle className="w-6 h-6 text-white" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-all duration-200 group">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Total Revenue</p>
                    <p className="text-3xl font-bold text-emerald-600 mt-2">{formatCurrency(stats.totalRevenue)}</p>
                    <p className="text-xs text-gray-400 mt-1">Platform earnings</p>
                  </div>
                  <div className="p-3 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl group-hover:scale-110 transition-transform duration-200">
                    <DollarSign className="w-6 h-6 text-white" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-all duration-200 group">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">This Month</p>
                    <p className="text-3xl font-bold text-purple-600 mt-2">{stats.thisMonthRides.toLocaleString()}</p>
                    <p className="text-xs text-gray-400 mt-1">Current month</p>
                  </div>
                  <div className="p-3 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl group-hover:scale-110 transition-transform duration-200">
                    <MapPin className="w-6 h-6 text-white" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Advanced Filters</h3>
              <p className="text-sm text-gray-500">Refine your ride data with precise filtering options</p>
            </div>
            
            {/* Search and Status Filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Search</label>
                <Input
                  placeholder="Search by ride ID, customer, driver..."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  className="border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Status</label>
                <Select 
                  value={filters.status} 
                  onValueChange={(value) => setFilters({ ...filters, status: value })}
                >
                  <SelectTrigger className="border-gray-200 focus:border-blue-500 focus:ring-blue-500">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="REQUESTED">Requested</SelectItem>
                    <SelectItem value="ACCEPTED">Accepted</SelectItem>
                    <SelectItem value="ARRIVING">Arriving</SelectItem>
                    <SelectItem value="ARRIVED">Arrived</SelectItem>
                    <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                    <SelectItem value="COMPLETED">Completed</SelectItem>
                    <SelectItem value="CANCELLED">Cancelled</SelectItem>
                    <SelectItem value="EXPIRED">Expired</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Payment Status</label>
                <Select 
                  value={filters.paymentStatus} 
                  onValueChange={(value) => setFilters({ ...filters, paymentStatus: value })}
                >
                  <SelectTrigger className="border-gray-200 focus:border-blue-500 focus:ring-blue-500">
                    <SelectValue placeholder="Filter by payment status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Payment Status</SelectItem>
                    <SelectItem value="PENDING">Pending</SelectItem>
                    <SelectItem value="PAID">Paid</SelectItem>
                    <SelectItem value="SETTLED">Settled</SelectItem>
                    <SelectItem value="FAILED">Failed</SelectItem>
                    <SelectItem value="REFUNDED">Refunded</SelectItem>
                    <SelectItem value="CANCELLED">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Date Range Filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 flex items-center">
                  <Calendar className="w-4 h-4 mr-1" />
                  Start Date
                </label>
                <Input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                  className="border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 flex items-center">
                  <Calendar className="w-4 h-4 mr-1" />
                  End Date
                </label>
                <Input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                  className="border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              
              {/* Empty columns for better spacing */}
              <div></div>
              <div></div>
            </div>
            <div className="mt-4 flex justify-end">
              <Button
                onClick={() => {
                  setFilters({
                    status: '',
                    paymentStatus: '',
                    search: '',
                    startDate: getTodayDate(),
                    endDate: getTodayDate(),
                  });
                  setPagination({ ...pagination, page: 1 });
                  setTimeout(() => loadRides(), 100);
                }}
                variant="outline"
                className="border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Reset Filters
              </Button>
            </div>
          </div>

          {/* Rides Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Ride Records</h3>
                  <p className="text-sm text-gray-500">Detailed view of all ride activities</p>
                </div>
                <div className="text-sm text-gray-500">
                  {pagination.total > 0 && (
                    <span>Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                    {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total.toLocaleString()} results</span>
                  )}
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50 hover:bg-gray-50">
                    <TableHead className="px-6 py-4 text-left font-semibold text-gray-700">Ride ID</TableHead>
                    <TableHead className="px-6 py-4 text-left font-semibold text-gray-700">Customer</TableHead>
                    <TableHead className="px-6 py-4 text-left font-semibold text-gray-700">Driver</TableHead>
                    <TableHead className="px-6 py-4 text-left font-semibold text-gray-700">Status</TableHead>
                    <TableHead className="px-6 py-4 text-left font-semibold text-gray-700">Payment</TableHead>
                    <TableHead className="px-6 py-4 text-left font-semibold text-gray-700">Amount</TableHead>
                    <TableHead className="px-6 py-4 text-left font-semibold text-gray-700">Created</TableHead>
                    <TableHead className="px-6 py-4 text-left font-semibold text-gray-700">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rides.map((ride, index) => (
                    <TableRow key={ride.id} className={`hover:bg-gray-50 transition-colors duration-150 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-25'}`}>
                      <TableCell className="px-6 py-4">
                        <div className="font-mono text-sm font-medium text-gray-900 bg-gray-100 px-2 py-1 rounded-md inline-block">
                          {ride.rideId}
                        </div>
                      </TableCell>
                      <TableCell className="px-6 py-4">
                        <div>
                          <div className="font-medium text-gray-900">
                            {ride.customer.firstName} {ride.customer.lastName}
                          </div>
                          <div className="text-sm text-gray-500 flex items-center mt-1">
                            <span className="w-2 h-2 bg-green-400 rounded-full mr-2"></span>
                            {ride.customer.phoneNumber}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="px-6 py-4">
                        <div>
                          <div className="font-medium text-gray-900">
                            {ride.driver.user.firstName} {ride.driver.user.lastName}
                          </div>
                          <div className="text-sm text-gray-500 flex items-center mt-1">
                            <span className="w-2 h-2 bg-blue-400 rounded-full mr-2"></span>
                            {ride.driver.user.phoneNumber}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="px-6 py-4">{getStatusBadge(ride.status)}</TableCell>
                      <TableCell className="px-6 py-4">
                        <div className="space-y-2">
                          {getPaymentStatusBadge(ride.paymentStatus)}
                          <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-md inline-block">
                            {getPaymentMethodLabel(ride.paymentMethod)}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="px-6 py-4">
                        <div className="font-medium">{formatCurrency(ride.totalFare)}</div>
                      </TableCell>
                      <TableCell className="px-6 py-4">
                        <div className="text-sm text-gray-600">{formatDate(ride.createdAt)}</div>
                      </TableCell>
                      <TableCell className="px-6 py-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedRide(ride);
                            setIsDetailDialogOpen(true);
                          }}
                          className="bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100 hover:border-blue-300 transition-colors duration-200"
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="px-6 py-4 border-t border-gray-100 bg-gray-50">
                <div className="flex justify-between items-center">
                  <div className="text-sm text-gray-600">
                    Page {pagination.page} of {pagination.pages}
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pagination.page === 1}
                      onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                      className="border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                      ← Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pagination.page === pagination.pages}
                      onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                      className="border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                      Next →
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

          {/* Ride Detail Sheet */}
          <Sheet open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
            <SheetContent side="right" className="w-[45%] max-w-none p-0 bg-gray-50">
              <SheetHeader className="px-6 py-6 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
                <div className="flex flex-col space-y-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <SheetTitle className="text-2xl font-bold text-gray-900 mb-2">Ride Details</SheetTitle>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-gray-600">Ride ID:</span>
                        <span className="text-sm font-mono text-gray-900 bg-gray-100 px-2 py-1 rounded-md">{selectedRide?.rideId}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm font-medium text-gray-600 mb-1">Total Amount</p>
                        <p className="text-xs text-gray-500">Including all fees</p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-gray-700">{selectedRide && formatCurrency(selectedRide.totalFare)}</div>
                        <div className="text-xs text-gray-500 mt-1">GMD</div>
                      </div>
                    </div>
                  </div>
                </div>
              </SheetHeader>
              
              {selectedRide && (
                <div className="h-full overflow-y-auto">
                  <div className="p-6 space-y-6">
                    {/* Overview Section */}
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-3 border-b border-gray-200">
                        <h3 className="text-base font-semibold text-gray-900">Ride Overview</h3>
                      </div>
                      <div className="p-4">
                        <div className="space-y-3">
                          <div className="flex justify-between items-center py-2">
                            <span className="text-sm font-medium text-gray-600">Ride ID</span>
                            <span className="text-sm font-mono text-gray-900 bg-gray-100 px-2 py-1 rounded">{selectedRide.rideId}</span>
                          </div>
                          <div className="flex justify-between items-center py-2">
                            <span className="text-sm font-medium text-gray-600">Type</span>
                            <span className="text-sm text-gray-900">{getRideTypeLabel(selectedRide.rideType)}</span>
                          </div>
                          <div className="flex justify-between items-center py-2">
                            <span className="text-sm font-medium text-gray-600">Status</span>
                            <div>{getStatusBadge(selectedRide.status)}</div>
                          </div>
                          <div className="flex justify-between items-center py-2">
                            <span className="text-sm font-medium text-gray-600">Created</span>
                            <span className="text-sm text-gray-900">{formatDate(selectedRide.createdAt)}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                                         {/* Financial Summary */}
                     <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                       <div className="bg-gradient-to-r from-green-50 to-emerald-50 px-4 py-3 border-b border-gray-200">
                         <h3 className="text-base font-semibold text-gray-900">Financial Summary</h3>
                       </div>
                       <div className="p-4">
                         <div className="space-y-4">
                           <div className="flex justify-between items-center py-3 bg-gray-50 rounded-lg px-3">
                             <span className="text-sm font-medium text-gray-600">Total Fare</span>
                             <span className="text-lg font-bold text-gray-700">{formatCurrency(selectedRide.totalFare)}</span>
                           </div>
                           <div className="flex justify-between items-center py-3 bg-gray-50 rounded-lg px-3">
                             <span className="text-sm font-medium text-gray-600">Driver Earnings</span>
                             <span className="text-lg font-bold text-gray-700">{formatCurrency(selectedRide.driverEarnings)}</span>
                           </div>
                         </div>
                         <div className="mt-4 pt-4 border-t border-gray-200 space-y-2">
                           <div className="flex justify-between items-center">
                             <span className="text-sm font-medium text-gray-600">Payment Method</span>
                             <span className="text-sm text-gray-900">{getPaymentMethodLabel(selectedRide.paymentMethod)}</span>
                           </div>
                           <div className="flex justify-between items-center">
                             <span className="text-sm font-medium text-gray-600">Payment Status</span>
                             <div>{getPaymentStatusBadge(selectedRide.paymentStatus)}</div>
                           </div>
                         </div>
                       </div>
                     </div>

                    {/* Customer Information */}
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                      <div className="bg-gradient-to-r from-green-50 to-teal-50 px-4 py-3 border-b border-gray-200">
                        <h3 className="text-base font-semibold text-gray-900 flex items-center">
                          <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                          Customer Information
                        </h3>
                      </div>
                      <div className="p-4">
                        <div className="space-y-3">
                          <div className="flex justify-between items-center py-2">
                            <span className="text-sm font-medium text-gray-600">Full Name</span>
                            <span className="text-sm text-gray-900">{selectedRide.customer.firstName} {selectedRide.customer.lastName}</span>
                          </div>
                          <div className="flex justify-between items-center py-2">
                            <span className="text-sm font-medium text-gray-600">Phone Number</span>
                            <span className="text-sm text-gray-900">{selectedRide.customer.phoneNumber}</span>
                          </div>
                          {selectedRide.customerRating && (
                            <div className="flex justify-between items-center py-2">
                              <span className="text-sm font-medium text-gray-600">Rating</span>
                              <div className="flex items-center">
                                <span className="text-yellow-400 mr-2">⭐</span>
                                <span className="text-sm text-gray-900">{selectedRide.customerRating}/5</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Driver Information */}
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-3 border-b border-gray-200">
                        <h3 className="text-base font-semibold text-gray-900 flex items-center">
                          <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                          Driver Information
                        </h3>
                      </div>
                      <div className="p-4">
                        <div className="space-y-3">
                          <div className="flex justify-between items-center py-2">
                            <span className="text-sm font-medium text-gray-600">Full Name</span>
                            <span className="text-sm text-gray-900">{selectedRide.driver.user.firstName} {selectedRide.driver.user.lastName}</span>
                          </div>
                          <div className="flex justify-between items-center py-2">
                            <span className="text-sm font-medium text-gray-600">Phone Number</span>
                            <span className="text-sm text-gray-900">{selectedRide.driver.user.phoneNumber}</span>
                          </div>
                          <div className="flex justify-between items-center py-2">
                            <span className="text-sm font-medium text-gray-600">Driver ID</span>
                            <span className="text-sm font-mono text-gray-900">{selectedRide.driver.driverId}</span>
                          </div>
                          {selectedRide.driverRating && (
                            <div className="flex justify-between items-center py-2">
                              <span className="text-sm font-medium text-gray-600">Rating</span>
                              <div className="flex items-center">
                                <span className="text-yellow-400 mr-2">⭐</span>
                                <span className="text-sm text-gray-900">{selectedRide.driverRating}/5</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Timeline */}
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                      <div className="bg-gradient-to-r from-purple-50 to-pink-50 px-4 py-3 border-b border-gray-200">
                        <h3 className="text-base font-semibold text-gray-900">Ride Timeline</h3>
                      </div>
                      <div className="p-4">
                        <div className="space-y-4">
                          <div className="flex items-start">
                            <div className="flex-shrink-0 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center mr-3 mt-1">
                              <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-900">Ride Requested</p>
                              <p className="text-xs text-gray-600 mt-1">{formatDate(selectedRide.rideRequest.requestedAt)}</p>
                            </div>
                          </div>
                          
                          {selectedRide.startedAt && (
                            <div className="flex items-start">
                              <div className="flex-shrink-0 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center mr-3 mt-1">
                                <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                              </div>
                              <div className="flex-1">
                                <p className="text-sm font-medium text-gray-900">Ride Started</p>
                                <p className="text-xs text-gray-600 mt-1">{formatDate(selectedRide.startedAt)}</p>
                              </div>
                            </div>
                          )}
                          
                          {selectedRide.completedAt && (
                            <div className="flex items-start">
                              <div className="flex-shrink-0 w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center mr-3 mt-1">
                                <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                              </div>
                              <div className="flex-1">
                                <p className="text-sm font-medium text-gray-900">Ride Completed</p>
                                <p className="text-xs text-gray-600 mt-1">{formatDate(selectedRide.completedAt)}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </SheetContent>
          </Sheet>
        </div>
      </PermissionGuard>
    </AuthGuard>
  );
} 