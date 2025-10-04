'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, DollarSign, MapPin, Users, Car } from 'lucide-react';
import { apiRequest } from '@/services/api';
import { usePermissions } from '@/hooks/usePermissions';
import { PermissionGuard } from '@/components/auth/PermissionGuard';
import { AuthGuard } from '@/components/auth/AuthGuard';

interface DashboardStats {
  overview: {
    totalRides: number;
    totalDrivers: number;
    totalCustomers: number;
    totalRevenue: number;
    activeDrivers: number;
    onlineDrivers: number;
    pendingApplications: number;
  };
  today: {
    rides: number;
    revenue: number;
    completedRides: number;
    cancelledRides: number;
    completionRate: number;
  };
  thisWeek: {
    rides: number;
    revenue: number;
  };
  thisMonth: {
    rides: number;
    revenue: number;
  };
}

interface RevenueAnalytics {
  period: number;
  summary: {
    totalRevenue: number;
    driverEarnings: number;
    platformFees: number;
    averageFare: number;
    averageDriverEarnings: number;
  };
  revenueByDay: Array<{
    date: string;
    totalFare: number;
    driverEarnings: number;
    platformFee: number;
  }>;
  revenueByRideType: Array<{
    rideType: string;
    revenue: number;
    count: number;
  }>;
  revenueByPaymentMethod: Array<{
    paymentMethod: string;
    revenue: number;
    count: number;
  }>;
  topDrivers: Array<{
    driverId: string;
    driverName: string;
    phoneNumber: string;
    totalEarnings: number;
    totalRides: number;
  }>;
}

interface PerformanceMetrics {
  period: number;
  summary: {
    totalRides: number;
    completedRides: number;
    cancelledRides: number;
    completionRate: number;
    cancellationRate: number;
    averageRating: number;
    averageRideDuration: number;
    averageDistance: number;
  };
  ridesByStatus: Array<{
    status: string;
    count: number;
    percentage: number;
  }>;
  ridesByType: Array<{
    rideType: string;
    count: number;
    percentage: number;
  }>;
  performanceByDriver: Array<{
    driverId: string;
    driverName: string;
    phoneNumber: string;
    totalRides: number;
    averageRating: number;
    totalEarnings: number;
  }>;
}

export default function RideAnalyticsPage() {
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [revenueAnalytics, setRevenueAnalytics] = useState<RevenueAnalytics | null>(null);
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('30');

  const { hasPermission } = usePermissions();

  const loadDashboardStats = async () => {
    try {
      const response = await apiRequest('/ride-analytics/dashboard');
      setDashboardStats(response.dashboard);
    } catch (error) {
      console.error('Error loading dashboard stats:', error);
    }
  };

  const loadRevenueAnalytics = async () => {
    try {
      const response = await apiRequest('/ride-analytics/revenue');
      setRevenueAnalytics(response.revenue);
    } catch (error) {
      console.error('Error loading revenue analytics:', error);
    }
  };

  const loadPerformanceMetrics = async () => {
    try {
      const response = await apiRequest('/ride-analytics/performance');
      setPerformanceMetrics(response.performance);
    } catch (error) {
      console.error('Error loading performance metrics:', error);
    }
  };

  useEffect(() => {
    const loadAllData = async () => {
      setLoading(true);
      await Promise.all([
        loadDashboardStats(),
        loadRevenueAnalytics(),
        loadPerformanceMetrics(),
      ]);
      setLoading(false);
    };

    loadAllData();
  }, [period]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'GMD',
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading analytics...</div>
      </div>
    );
  }

  return (
    <AuthGuard>
      <PermissionGuard requiredPermission={{ entityType: 'SNAP_RIDE_ANALYTICS', permission: 'VIEW' }}>
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold">Ride Analytics</h1>
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Dashboard Overview */}
          {dashboardStats && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Total Rides</p>
                        <p className="text-2xl font-bold">{formatNumber(dashboardStats.overview.totalRides)}</p>
                      </div>
                      <div className="p-2 bg-blue-100 rounded-full">
                        <MapPin className="w-6 h-6 text-blue-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                        <p className="text-2xl font-bold text-green-600">{formatCurrency(dashboardStats.overview.totalRevenue)}</p>
                      </div>
                      <div className="p-2 bg-green-100 rounded-full">
                        <DollarSign className="w-6 h-6 text-green-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Active Drivers</p>
                        <p className="text-2xl font-bold text-blue-600">{formatNumber(dashboardStats.overview.activeDrivers)}</p>
                      </div>
                      <div className="p-2 bg-blue-100 rounded-full">
                        <Car className="w-6 h-6 text-blue-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Total Customers</p>
                        <p className="text-2xl font-bold text-purple-600">{formatNumber(dashboardStats.overview.totalCustomers)}</p>
                      </div>
                      <div className="p-2 bg-purple-100 rounded-full">
                        <Users className="w-6 h-6 text-purple-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Today's Activity</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span>Rides</span>
                        <span className="font-semibold">{dashboardStats.today.rides}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Revenue</span>
                        <span className="font-semibold text-green-600">{formatCurrency(dashboardStats.today.revenue)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Completion Rate</span>
                        <span className="font-semibold">{formatPercentage(dashboardStats.today.completionRate)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">This Week</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span>Rides</span>
                        <span className="font-semibold">{dashboardStats.thisWeek.rides}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Revenue</span>
                        <span className="font-semibold text-green-600">{formatCurrency(dashboardStats.thisWeek.revenue)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">This Month</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span>Rides</span>
                        <span className="font-semibold">{dashboardStats.thisMonth.rides}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Revenue</span>
                        <span className="font-semibold text-green-600">{formatCurrency(dashboardStats.thisMonth.revenue)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}

          {/* Revenue Analytics */}
          {revenueAnalytics && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Revenue Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-4 bg-green-50 rounded-lg">
                        <p className="text-sm text-gray-600">Total Revenue</p>
                        <p className="text-2xl font-bold text-green-600">{formatCurrency(revenueAnalytics.summary.totalRevenue)}</p>
                      </div>
                      <div className="text-center p-4 bg-blue-50 rounded-lg">
                        <p className="text-sm text-gray-600">Driver Earnings</p>
                        <p className="text-2xl font-bold text-blue-600">{formatCurrency(revenueAnalytics.summary.driverEarnings)}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-4 bg-purple-50 rounded-lg">
                        <p className="text-sm text-gray-600">Platform Fees</p>
                        <p className="text-2xl font-bold text-purple-600">{formatCurrency(revenueAnalytics.summary.platformFees)}</p>
                      </div>
                      <div className="text-center p-4 bg-orange-50 rounded-lg">
                        <p className="text-sm text-gray-600">Average Fare</p>
                        <p className="text-2xl font-bold text-orange-600">{formatCurrency(revenueAnalytics.summary.averageFare)}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Revenue by Ride Type</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {revenueAnalytics.revenueByRideType.map((item) => (
                      <div key={item.rideType} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium">{item.rideType}</p>
                          <p className="text-sm text-gray-500">{item.count} rides</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-green-600">{formatCurrency(item.revenue)}</p>
                          <p className="text-sm text-gray-500">
                            {formatPercentage((item.revenue / revenueAnalytics.summary.totalRevenue) * 100)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Performance Metrics */}
          {performanceMetrics && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Performance Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-4 bg-green-50 rounded-lg">
                        <p className="text-sm text-gray-600">Completion Rate</p>
                        <p className="text-2xl font-bold text-green-600">{formatPercentage(performanceMetrics.summary.completionRate)}</p>
                      </div>
                      <div className="text-center p-4 bg-red-50 rounded-lg">
                        <p className="text-sm text-gray-600">Cancellation Rate</p>
                        <p className="text-2xl font-bold text-red-600">{formatPercentage(performanceMetrics.summary.cancellationRate)}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-4 bg-blue-50 rounded-lg">
                        <p className="text-sm text-gray-600">Average Rating</p>
                        <p className="text-2xl font-bold text-blue-600">⭐ {performanceMetrics.summary.averageRating.toFixed(1)}</p>
                      </div>
                      <div className="text-center p-4 bg-purple-50 rounded-lg">
                        <p className="text-sm text-gray-600">Avg Duration</p>
                        <p className="text-2xl font-bold text-purple-600">{performanceMetrics.summary.averageRideDuration} min</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Rides by Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {performanceMetrics.ridesByStatus.map((item) => (
                      <div key={item.status} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium">{item.status.replace('_', ' ')}</p>
                          <p className="text-sm text-gray-500">{item.count} rides</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">{formatNumber(item.count)}</p>
                          <p className="text-sm text-gray-500">{formatPercentage(item.percentage)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Top Drivers */}
          {revenueAnalytics && (
            <Card>
              <CardHeader>
                <CardTitle>Top Drivers by Earnings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {revenueAnalytics.topDrivers.map((driver, index) => (
                    <div key={driver.driverId} className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-sm font-semibold text-blue-600">#{index + 1}</span>
                        </div>
                        <div>
                          <p className="font-medium">{driver.driverName}</p>
                          <p className="text-sm text-gray-500">{driver.phoneNumber}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-green-600">{formatCurrency(driver.totalEarnings)}</p>
                        <p className="text-sm text-gray-500">{driver.totalRides} rides</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </PermissionGuard>
    </AuthGuard>
  );
} 