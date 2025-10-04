'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { StatCard } from '@/components/dashboard/StatCard';
import { RevenueChart } from '@/components/dashboard/RevenueChart';
import { UserGrowthChart } from '@/components/dashboard/UserGrowthChart';
import { useDashboardData } from '@/hooks/useDashboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AuthGuard } from '@/components/auth/AuthGuard';

import { 
  Users, 
  Store, 
  Car, 
  DollarSign, 
  ArrowUpRight, 
  ArrowDownRight,
  CheckCircle,
  XCircle
} from 'lucide-react';

function DashboardContent() {
  const router = useRouter();
  const { data, isLoading, error } = useDashboardData();

  // Helper function to format large numbers with abbreviations
  const formatLargeNumber = (num: number): string => {
    if (num >= 1000000000) {
      return (num / 1000000000).toFixed(1).replace(/\.0$/, '') + 'B';
    }
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
    }
    return num.toString();
  };

  // Sample data for stats with better formatting
  const stats = [
    {
      title: 'Customer Base',
      value: data && data.customerBase ? formatLargeNumber(data.customerBase) : '0',
      tooltip: data && data.customerBase ? data.customerBase.toLocaleString() : '0',
      icon: <Users size={24} />,
      change: data?.customerBaseGrowth || '+12%',
      changeType: (data?.customerBaseGrowth?.startsWith('-') ? 'negative' : 'positive') as 'positive' | 'negative',
      bgColor: 'bg-blue-500',
    },
    {
      title: 'E-commerce Sellers',
      value: data && data.ecommerceSellers ? formatLargeNumber(data.ecommerceSellers) : '0',
      tooltip: data && data.ecommerceSellers ? data.ecommerceSellers.toLocaleString() : '0',
      icon: <Store size={24} />,
      change: data?.ecommerceSellersGrowth || '+5%',
      changeType: (data?.ecommerceSellersGrowth?.startsWith('-') ? 'negative' : 'positive') as 'positive' | 'negative',
      bgColor: 'bg-green-500',
    },
    {
      title: 'Ride Drivers',
      value: data && data.rideDrivers ? formatLargeNumber(data.rideDrivers) : '0',
      tooltip: data && data.rideDrivers ? data.rideDrivers.toLocaleString() : '0',
      icon: <Car size={24} />,
      change: data?.rideDriversGrowth || '-3%',
      changeType: (data?.rideDriversGrowth?.startsWith('-') ? 'negative' : 'positive') as 'positive' | 'negative',
      bgColor: 'bg-orange-500',
    },
    {
      title: 'Total Revenue',
      value: data && data.totalRevenue ? `D ${formatLargeNumber(data.totalRevenue)}` : 'D 0',
      tooltip: data && data.totalRevenue ? `D ${data.totalRevenue.toLocaleString()}` : 'D 0',
      icon: <DollarSign size={24} />,
      change: data?.totalRevenueGrowth || '+8%',
      changeType: (data?.totalRevenueGrowth?.startsWith('-') ? 'negative' : 'positive') as 'positive' | 'negative',
      bgColor: 'bg-purple-500',
      subtitle: data?.currentMonth ? `(${data.currentMonth})` : '',
    },
  ];

  // Helper function to format time ago
  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const activityTime = new Date(timestamp);
    const diffInMinutes = Math.floor((now.getTime() - activityTime.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes} minutes ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours} hours ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays} days ago`;
    
    return activityTime.toLocaleDateString();
  };


  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-600">Loading dashboard data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-red-600">Error loading dashboard data</div>
        <div className="mt-2 text-sm text-gray-500">Please check your connection and try again.</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <StatCard
            key={index}
            title={stat.title}
            value={stat.value}
            tooltip={stat.tooltip}
            icon={stat.icon}
            change={stat.change}
            changeType={stat.changeType}
            bgColor={stat.bgColor}
            subtitle={stat.subtitle}
          />
        ))}
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-gray-600">
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div 
              className="relative h-28 bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl cursor-pointer transition-all duration-300 hover:shadow-lg hover:shadow-blue-100 hover:scale-105 group overflow-hidden"
              onClick={() => router.push('/users/kyc-approval')}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-blue-600/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative p-5 h-full flex flex-col justify-center items-center">
                <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl mb-3 shadow-lg group-hover:shadow-xl transition-all duration-300">
                  <Users className="h-7 w-7 text-white" />
                </div>
                <span className="text-sm font-semibold text-gray-800 group-hover:text-blue-700 transition-colors text-center">Review KYC</span>
                <span className="text-xs text-gray-500 mt-1 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-1 group-hover:translate-y-0">Manage user verifications</span>
              </div>
            </div>
            
            <div 
              className="relative h-28 bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200 rounded-xl cursor-pointer transition-all duration-300 hover:shadow-lg hover:shadow-emerald-100 hover:scale-105 group overflow-hidden"
              onClick={() => router.push('/settlements/sheet')}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative p-5 h-full flex flex-col justify-center items-center">
                <div className="p-3 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl mb-3 shadow-lg group-hover:shadow-xl transition-all duration-300">
                  <DollarSign className="h-7 w-7 text-white" />
                </div>
                <span className="text-sm font-semibold text-gray-800 group-hover:text-emerald-700 transition-colors text-center">Process Settlements</span>
                <span className="text-xs text-gray-500 mt-1 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-1 group-hover:translate-y-0">Handle payment settlements</span>
              </div>
            </div>
            
            <div 
              className="relative h-28 bg-gradient-to-br from-violet-50 to-violet-100 border border-violet-200 rounded-xl cursor-pointer transition-all duration-300 hover:shadow-lg hover:shadow-violet-100 hover:scale-105 group overflow-hidden"
              onClick={() => router.push('/products')}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 to-violet-600/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative p-5 h-full flex flex-col justify-center items-center">
                <div className="p-3 bg-gradient-to-br from-violet-500 to-violet-600 rounded-2xl mb-3 shadow-lg group-hover:shadow-xl transition-all duration-300">
                  <Store className="h-7 w-7 text-white" />
                </div>
                <span className="text-sm font-semibold text-gray-800 group-hover:text-violet-700 transition-colors text-center">Moderate Products</span>
                <span className="text-xs text-gray-500 mt-1 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-1 group-hover:translate-y-0">Review product listings</span>
              </div>
            </div>
            
            <div 
              className="relative h-28 bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-200 rounded-xl cursor-pointer transition-all duration-300 hover:shadow-lg hover:shadow-amber-100 hover:scale-105 group overflow-hidden"
              onClick={() => router.push('/orders')}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-amber-600/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative p-5 h-full flex flex-col justify-center items-center">
                <div className="p-3 bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl mb-3 shadow-lg group-hover:shadow-xl transition-all duration-300">
                  <Car className="h-7 w-7 text-white" />
                </div>
                <span className="text-sm font-semibold text-gray-800 group-hover:text-amber-700 transition-colors text-center">Review Orders</span>
                <span className="text-xs text-gray-500 mt-1 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-1 group-hover:translate-y-0">Manage order requests</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Revenue Trend - Full Width */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-gray-600">
            Revenue Trend
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data && data.revenueData && <RevenueChart data={data.revenueData} />}
        </CardContent>
      </Card>

      {/* User Growth Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-gray-600">
            User Growth Trend
          </CardTitle>
          <p className="text-xs text-gray-500">Cumulative user registrations (last 30 days)</p>
        </CardHeader>
        <CardContent>
          {data && data.userGrowthTrendData && <UserGrowthChart data={data.userGrowthTrendData} />}
        </CardContent>
      </Card>

      {/* Recent Activities - Full Width */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-gray-600">
            Recent Activities
          </CardTitle>
          <p className="text-xs text-gray-500">Latest activities on the platform</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="space-y-4">
              {data?.recentActivities?.slice(0, 5).map((activity: any) => (
                <div key={activity.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-blue-100 rounded-lg text-lg">
                      {activity.icon}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{activity.title}</p>
                      <p className="text-sm text-gray-500">
                        {activity.description} • {formatTimeAgo(activity.timestamp)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="space-y-4">
              {data?.recentActivities?.slice(5, 10).map((activity: any) => (
                <div key={activity.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-blue-100 rounded-lg text-lg">
                      {activity.icon}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{activity.title}</p>
                      <p className="text-sm text-gray-500">
                        {activity.description} • {formatTimeAgo(activity.timestamp)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* User Growth Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Customer Growth Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-600" />
              Customer Growth
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data?.userGrowthData?.slice(-5).reverse().map((growth, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-blue-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900 text-sm">
                      {new Date(growth.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </p>
                    <p className="text-xs text-gray-500">
                      {growth.customers} new customers
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900 text-sm">{growth.customers}</p>
                    {index > 0 && data?.userGrowthData?.slice(-5).reverse()[index - 1]?.customers && (
                      <p className={`text-xs ${growth.customers >= data.userGrowthData.slice(-5).reverse()[index - 1].customers ? 'text-green-500' : 'text-red-500'}`}>
                        {growth.customers >= data.userGrowthData.slice(-5).reverse()[index - 1].customers ? '+' : ''}
                        {growth.customers - data.userGrowthData.slice(-5).reverse()[index - 1].customers}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Seller Growth Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Store className="h-4 w-4 text-green-600" />
              Seller Growth
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data?.userGrowthData?.slice(-5).reverse().map((growth, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-green-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900 text-sm">
                      {new Date(growth.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </p>
                    <p className="text-xs text-gray-500">
                      {growth.sellers} new sellers
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900 text-sm">{growth.sellers}</p>
                    {index > 0 && data?.userGrowthData?.slice(-5).reverse()[index - 1]?.sellers && (
                      <p className={`text-xs ${growth.sellers >= data.userGrowthData.slice(-5).reverse()[index - 1].sellers ? 'text-green-500' : 'text-red-500'}`}>
                        {growth.sellers >= data.userGrowthData.slice(-5).reverse()[index - 1].sellers ? '+' : ''}
                        {growth.sellers - data.userGrowthData.slice(-5).reverse()[index - 1].sellers}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Driver Growth Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Car className="h-4 w-4 text-orange-600" />
              Driver Growth
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data?.userGrowthData?.slice(-5).reverse().map((growth, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-orange-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900 text-sm">
                      {new Date(growth.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </p>
                    <p className="text-xs text-gray-500">
                      {growth.drivers} new drivers
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900 text-sm">{growth.drivers}</p>
                    {index > 0 && data?.userGrowthData?.slice(-5).reverse()[index - 1]?.drivers && (
                      <p className={`text-xs ${growth.drivers >= data.userGrowthData.slice(-5).reverse()[index - 1].drivers ? 'text-green-500' : 'text-red-500'}`}>
                        {growth.drivers >= data.userGrowthData.slice(-5).reverse()[index - 1].drivers ? '+' : ''}
                        {growth.drivers - data.userGrowthData.slice(-5).reverse()[index - 1].drivers}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>


    </div>
  );
}

export default function DashboardPage() {
  return (
    <AuthGuard>
      <div className="space-y-6">
        <DashboardContent />
      </div>
    </AuthGuard>
  );
} 