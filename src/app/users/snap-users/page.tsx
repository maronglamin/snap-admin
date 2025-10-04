'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  MoreVertical, 
  Edit, 
  Trash2, 
  Eye,
  UserCheck,
  User,
  ShoppingBag,
  DollarSign,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Mail,
  Phone,
  Calendar,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Shield,
  MapPin,
  BarChart3,
  Clock
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { usersApi } from '@/services/api';

interface SnapUser {
  id: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  email?: string; // Make email optional since User model doesn't have it
  type: 'BUYER' | 'SELLER';
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'PENDING';
  joinDate: string;
  lastActive: string;
  totalProducts: number;
  totalOrders: number;
  totalSales: number;
  totalSpent: number;
  totalSettlements: number;
  latestCurrency: string; // Add currency field
  allCurrencies: string[]; // Add all currencies field
  currencyTotals: { [key: string]: number }; // Add currency totals field
  kycStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED' | null;
  kycVerifiedAt: string | null;
  businessName: string | null;
  businessType: string | null;
}

interface UserDetails extends SnapUser {
  products: any[];
  orders: any[];
  sellerOrders: any[];
  settlements: any[];
  deliveryAddresses: any[];
  kycDetails: {
    id: string;
    businessName: string;
    businessType: string;
    registrationNumber: string;
    taxId: string;
    address: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    documentType: string;
    documentNumber: string;
    documentUrl: string;
    documentExpiryDate: string;
    status: string;
    rejectionReason: string;
    verifiedAt: string;
    createdAt: string;
    bankAccounts: Array<{
      id: string;
      accountNumber: string;
      accountName: string;
      bankName: string;
      bankCode: string;
      currency: string;
    }>;
    wallets: Array<{
      id: string;
      walletType: string;
      walletAddress: string;
      account: string;
      currency: string;
    }>;
  } | null;
}

export default function SnapUsersPage() {
  const [users, setUsers] = useState<SnapUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserDetails | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isKycDialogOpen, setIsKycDialogOpen] = useState(false);
  const [isCurrenciesDialogOpen, setIsCurrenciesDialogOpen] = useState(false);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [totalBuyers, setTotalBuyers] = useState(0);
  const [totalSellers, setTotalSellers] = useState(0);
  const itemsPerPage = 10;

  // Platform revenue
  const [platformRevenue, setPlatformRevenue] = useState<{
    totalServiceFees: number;
    serviceFeeRate: number;
    totalSalesGMD: number;
    transactionCount: number;
    currency: string;
  } | null>(null);

  // Debounced search effect
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 500); // Wait 500ms after user stops typing

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Reset to first page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchQuery]);

  // KPI counts independently (not affected by pagination/filters)
  useEffect(() => {
    loadUserCounts();
    loadPlatformRevenue();
  }, []); // Only run once on mount

  // Load users when pagination/filters change
  useEffect(() => {
    loadUsers();
  }, [currentPage, debouncedSearchQuery, filterStatus, filterType]);

  const loadUsers = async () => {
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

      if (filterStatus !== 'all') {
        params.status = filterStatus;
      }

      if (filterType !== 'all') {
        params.type = filterType;
      }

      const response = await usersApi.getAll(params);
      
      setUsers(response.data || []);
      setTotalUsers(response.pagination?.total || 0);
      setTotalPages(response.pagination?.totalPages || 1);
    } catch (error) {
      console.error('Error loading users:', error);
      setError('Failed to load users');
    } finally {
      setIsLoading(false);
    }
  };

  const loadUserCounts = async () => {
    try {
      // Always get total counts without any filters
      const buyersResponse = await usersApi.getAll({ type: 'BUYER', limit: 1 });
      setTotalBuyers(buyersResponse.pagination?.total || 0);
      
      const sellersResponse = await usersApi.getAll({ type: 'SELLER', limit: 1 });
      setTotalSellers(sellersResponse.pagination?.total || 0);
      
      // Get total users count
      const totalResponse = await usersApi.getAll({ limit: 1 });
      setTotalUsers(totalResponse.pagination?.total || 0);
    } catch (error) {
      console.error('Error loading user counts:', error);
      // Fallback to calculating from current users if API fails
      setTotalBuyers(users.filter((user: SnapUser) => user.type === 'BUYER').length);
      setTotalSellers(users.filter((user: SnapUser) => user.type === 'SELLER').length);
    }
  };

  const loadPlatformRevenue = async () => {
    try {
      const response = await usersApi.getPlatformRevenue();
      setPlatformRevenue(response.data);
    } catch (error) {
      console.error('Error loading platform revenue:', error);
      // Fallback to mock calculation if API fails
      const mockRevenue = {
        totalServiceFees: users.reduce((sum, user) => {
          if (user.type === 'SELLER') return sum + (user.totalSales * 0.05);
          return sum;
        }, 0),
        serviceFeeRate: 0.05,
        totalSalesGMD: users.reduce((sum, user) => {
          if (user.type === 'SELLER') return sum + user.totalSales;
          return sum;
        }, 0),
        transactionCount: 0,
        currency: 'GMD',
      };
      setPlatformRevenue(mockRevenue);
    }
  };

  const handleViewUser = async (user: SnapUser) => {
    try {
      const response = await usersApi.getById(user.id);
      const userData = response.data;
      
      // Calculate statistics from the detailed data
      const totalProducts = userData.products?.filter((p: any) => p.status === 'ACTIVE').length || 0;
      const totalOrders = userData.orders?.length || 0;
      const totalSettlements = userData.settlements?.filter((s: any) => s.status === 'COMPLETED').length || 0;
      
      // Calculate currency totals
      let totalSales = 0;
      let totalSpent = 0;
      let latestCurrency = 'GMD';
      let currencyTotals: { [key: string]: number } = { GMD: 0 };

      // Collect currencies exactly like the backend list view does
      let allCurrencies: string[] = [];

      if (userData.type === 'SELLER' && userData.sellerOrders?.length > 0) {
        // Get current month date range
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        
        // Get all unique currencies for this seller (only from PAID or SETTLED orders in current month)
        const paidOrders = userData.sellerOrders.filter((order: any) => {
          const orderDate = new Date(order.createdAt);
          const isPaid = order.paymentStatus === 'PAID' || order.paymentStatus === 'SETTLED';
          const isCurrentMonth = orderDate >= startOfMonth && orderDate <= endOfMonth;
          return isPaid && isCurrentMonth;
        });
        allCurrencies = [...new Set(paidOrders.map((order: any) => order.currencyCode))] as string[];
      }

      if (userData.type === 'BUYER' && userData.orders?.length > 0) {
        // Get current month date range
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        
        // Get all unique currencies for this buyer (only from current month orders)
        const currentMonthOrders = userData.orders.filter((order: any) => {
          const orderDate = new Date(order.createdAt);
          return orderDate >= startOfMonth && orderDate <= endOfMonth;
        });
        allCurrencies = [...new Set(currentMonthOrders.map((order: any) => order.currencyCode))] as string[];
      }

      // Filter out undefined/null values after collection (like the backend does implicitly)
      allCurrencies = allCurrencies.filter(currency => currency && currency !== 'undefined' && currency !== 'null');

      // If no currency found, default to GMD (like backend)
      if (allCurrencies.length === 0) {
        allCurrencies = ['GMD'];
      }

      if (userData.type === 'SELLER' && userData.sellerOrders?.length > 0) {
        // Get current month date range
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        
        // Filter orders to only include PAID or SETTLED orders for sellers in current month
        const paidOrders = userData.sellerOrders.filter((order: any) => {
          const orderDate = new Date(order.createdAt);
          const isPaid = order.paymentStatus === 'PAID' || order.paymentStatus === 'SETTLED';
          const isCurrentMonth = orderDate >= startOfMonth && orderDate <= endOfMonth;
          return isPaid && isCurrentMonth;
        });
        
        // Group orders by currency and sum totals (only paid orders in current month)
        currencyTotals = paidOrders.reduce((acc: any, order: any) => {
          const currency = order.currencyCode && order.currencyCode !== 'undefined' ? order.currencyCode : 'GMD';
          if (!acc[currency]) {
            acc[currency] = 0;
          }
          acc[currency] += Number(order.totalAmount);
          return acc;
        }, {});
        
        // Get the most recent paid order to determine primary currency
        const latestOrder = paidOrders.length > 0 
          ? paidOrders.reduce((latest: any, order: any) => 
              new Date(order.createdAt) > new Date(latest.createdAt) ? order : latest
            )
          : null;
        
        latestCurrency = latestOrder && latestOrder.currencyCode && latestOrder.currencyCode !== 'undefined' 
          ? latestOrder.currencyCode 
          : 'GMD';
        
        // Set total sales to the primary currency total
        totalSales = currencyTotals[latestCurrency] || 0;
      }

      if (userData.type === 'BUYER' && userData.orders?.length > 0) {
        // Get current month date range
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        
        // Filter orders to only include orders in current month
        const currentMonthOrders = userData.orders.filter((order: any) => {
          const orderDate = new Date(order.createdAt);
          return orderDate >= startOfMonth && orderDate <= endOfMonth;
        });
        
        // Group orders by currency and sum totals (only current month orders)
        currencyTotals = currentMonthOrders.reduce((acc: any, order: any) => {
          const currency = order.currencyCode && order.currencyCode !== 'undefined' ? order.currencyCode : 'GMD';
          if (!acc[currency]) {
            acc[currency] = 0;
          }
          acc[currency] += Number(order.totalAmount);
          return acc;
        }, {});
        
        // Get the most recent order to determine primary currency
        const latestOrder = currentMonthOrders.length > 0 
          ? currentMonthOrders.reduce((latest: any, order: any) => 
              new Date(order.createdAt) > new Date(latest.createdAt) ? order : latest
            )
          : null;
        latestCurrency = latestOrder && latestOrder.currencyCode && latestOrder.currencyCode !== 'undefined' 
          ? latestOrder.currencyCode 
          : 'GMD';
        
        // Set total spent to the primary currency total
        totalSpent = currencyTotals[latestCurrency] || 0;
      }

      // Create enhanced user data with calculated statistics
      const enhancedUserData = {
        ...userData,
        totalProducts,
        totalOrders,
        totalSales,
        totalSpent,
        totalSettlements,
        latestCurrency,
        allCurrencies,
        currencyTotals,
      };

      setSelectedUser(enhancedUserData);
      setIsViewDialogOpen(true);
    } catch (error) {
      console.error('Error loading user details:', error);
      setError('Failed to load user details');
    }
  };

  const handleKycAction = async (action: 'approve' | 'reject', rejectionReason?: string) => {
    if (!selectedUser) return;

    try {
      const kycData = {
        status: action === 'approve' ? 'APPROVED' : 'REJECTED',
        rejectionReason: action === 'reject' ? rejectionReason : null,
      };

      await usersApi.updateKyc(selectedUser.id, kycData);
      
      // Refresh users list
      loadUsers();
      
      // Close dialogs
      setIsKycDialogOpen(false);
      setIsViewDialogOpen(false);
      setSelectedUser(null);
    } catch (error) {
      console.error('Error updating KYC status:', error);
      setError('Failed to update KYC status');
    }
  };

  const getTypeBadgeVariant = (type: string) => {
    switch (type) {
      case 'BUYER': return 'default'; // Blue background
      case 'SELLER': return 'secondary'; // Light blue
      default: return 'outline';
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'default'; // Blue background
      case 'INACTIVE': return 'secondary'; // Light blue
      case 'SUSPENDED': return 'destructive'; // Red for suspended
      case 'PENDING': return 'default'; // Blue background instead of outline
      default: return 'default'; // Blue background
    }
  };

  const getKycStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'APPROVED': return 'default'; // Blue background
      case 'PENDING': return 'default'; // Blue background instead of outline
      case 'REJECTED': return 'destructive'; // Red for rejected
      case 'SUSPENDED': return 'destructive'; // Red for suspended
      default: return 'default'; // Blue background
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatCurrency = (amount: number, currency: string) => {
    // Validate currency code and provide fallback
    const validCurrency = currency && currency !== 'undefined' ? currency : 'GMD';
    
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: validCurrency,
      }).format(amount);
    } catch (error) {
      // Fallback formatting if currency code is invalid
      console.warn(`Invalid currency code: ${currency}, using GMD as fallback`);
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'GMD',
      }).format(amount);
    }
  };

  const formatGroupedCurrency = (currencyTotals: { [key: string]: number }) => {
    if (!currencyTotals || Object.keys(currencyTotals).length === 0) {
      return 'GMD 0.00';
    }
    
    return Object.entries(currencyTotals)
      .map(([currency, amount]) => {
        return formatCurrency(amount, currency);
      })
      .join(' ');
  };

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


  const filteredUsers = users;

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading users...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">SNAP Users</h1>
          <p className="text-gray-600 mt-1">Manage Snap buyers and sellers</p>
        </div>
        <div className="flex space-x-3">
          <Button
            variant="outline"
            onClick={() => window.location.href = '/users/kyc-approval'}
          >
            <Shield className="mr-2 h-4 w-4" />
            KYC Approval
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div 
              className="text-2xl font-bold"
              title={totalUsers.toLocaleString()}
            >
              {formatLargeNumber(totalUsers)}
            </div>
            <p className="text-xs text-muted-foreground">
              Snap users
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Buyers</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div 
              className="text-2xl font-bold"
              title={totalBuyers.toLocaleString()}
            >
              {formatLargeNumber(totalBuyers)}
            </div>
            <p className="text-xs text-muted-foreground">
              Active buyers
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sellers</CardTitle>
            <ShoppingBag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div 
              className="text-2xl font-bold"
              title={totalSellers.toLocaleString()}
            >
              {formatLargeNumber(totalSellers)}
            </div>
            <p className="text-xs text-muted-foreground">
              Active sellers
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Platform Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div 
              className="text-2xl font-bold"
              title={formatCurrency(platformRevenue?.totalServiceFees || 0, platformRevenue?.currency || 'GMD')}
            >
              {platformRevenue?.totalServiceFees 
                ? `${platformRevenue.currency || 'GMD'} ${formatLargeNumber(platformRevenue.totalServiceFees)}`
                : 'GMD 0'
              }
            </div>
            <p className="text-xs text-muted-foreground">
              Service fees ({platformRevenue?.currency || 'GMD'} only) - {platformRevenue?.currentMonth || 'Current Month'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle>Snap Users</CardTitle>
          <CardDescription>
            View and manage buyers and sellers on Snap
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by name, email, or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="sm:w-[150px]">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="BUYER">Buyers</SelectItem>
                <SelectItem value="SELLER">Sellers</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="sm:w-[150px]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="INACTIVE">Inactive</SelectItem>
                <SelectItem value="SUSPENDED">Suspended</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Users Table */}
          <div className="space-y-4">
            {filteredUsers.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    {user.type === 'BUYER' ? (
                      <User className="h-5 w-5 text-blue-600" />
                    ) : (
                      <ShoppingBag className="h-5 w-5 text-blue-600" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="font-medium text-gray-900">
                        {user.firstName} {user.lastName}
                      </h3>
                      <Badge variant={getTypeBadgeVariant(user.type)}>
                        {user.type}
                      </Badge>
                      <Badge variant={getStatusBadgeVariant(user.status)}>
                        {user.status}
                      </Badge>
                      {user.type === 'SELLER' && user.kycStatus && (
                        <Badge variant={getKycStatusBadgeVariant(user.kycStatus)}>
                          KYC {user.kycStatus}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                      {user.email && (
                        <div className="flex items-center">
                          <Mail className="h-4 w-4 mr-1" />
                          {user.email}
                        </div>
                      )}
                      <div className="flex items-center">
                        <Phone className="h-4 w-4 mr-1" />
                        {user.phoneNumber}
                      </div>
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-1" />
                        Joined {formatDate(user.joinDate)}
                      </div>
                    </div>
                    <div className="flex items-center space-x-4 text-xs text-gray-500 mt-1">
                      {user.type === 'BUYER' ? (
                        <>
                          <span>{user.totalOrders} orders</span>
                          <span className="font-medium text-green-600 break-words max-w-[120px]">
                            {user.currencyTotals && Object.keys(user.currencyTotals).length > 0
                              ? formatCurrency(
                                  user.currencyTotals[user.latestCurrency] || 0,
                                  user.latestCurrency
                                )
                              : 'GMD 0.00'
                            }
                            {user.allCurrencies && user.allCurrencies.length > 1 && (
                              <span className="text-blue-600 ml-1">(+{user.allCurrencies.length - 1})</span>
                            )}
                          </span>
                        </>
                      ) : (
                        <>
                          <span>{user.totalProducts} products</span>
                          <span className="font-medium text-green-600 break-words max-w-[120px]">
                            {user.currencyTotals && Object.keys(user.currencyTotals).length > 0
                              ? formatCurrency(
                                  user.currencyTotals[user.latestCurrency] || 0,
                                  user.latestCurrency
                                )
                              : 'GMD 0.00'
                            }
                            {user.allCurrencies && user.allCurrencies.length > 1 && (
                              <span className="text-blue-600 ml-1">(+{user.allCurrencies.length - 1})</span>
                            )}
                          </span>
                          <span>{user.totalSettlements} settlements</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleViewUser(user)}>
                      <Eye className="mr-2 h-4 w-4" />
                      View Details
                    </DropdownMenuItem>
                    {user.type === 'SELLER' && user.kycStatus === 'PENDING' && (
                      <DropdownMenuItem onClick={() => {
                        setSelectedUser(user as any);
                        setIsKycDialogOpen(true);
                      }}>
                        <AlertTriangle className="mr-2 h-4 w-4" />
                        Review KYC
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
          </div>

          {/* Pagination - Always show if there are users */}
          {totalUsers > 0 && (
            <div className="flex items-center justify-between mt-6">
              <div className="text-sm text-gray-700">
                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalUsers)} of {totalUsers} results
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

          {filteredUsers.length === 0 && (
            <div className="text-center py-8">
              <UserCheck className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No users found</h3>
              <p className="mt-1 text-sm text-gray-500">
                Try adjusting your search or filter criteria.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* View User Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">User Details</DialogTitle>
            <DialogDescription>
              Comprehensive information about the user account and activities.
            </DialogDescription>
          </DialogHeader>
          
          {selectedUser && (
            <div className="space-y-6">
              {/* Header Section */}
              <div className="flex items-center mb-6 p-4 bg-gray-50 rounded-lg">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                  {selectedUser.type === 'BUYER' ? (
                    <User className="h-8 w-8 text-blue-600" />
                  ) : (
                    <ShoppingBag className="h-8 w-8 text-blue-600" />
                  )}
                </div>
                <div className="ml-4 flex-1">
                  <h2 className="text-xl font-bold text-gray-900">
                    {selectedUser.firstName} {selectedUser.lastName}
                  </h2>
                  <p className="text-sm text-gray-500">
                    {selectedUser.type === 'SELLER' ? 'Seller Account' : 'Buyer Account'} • ID: {selectedUser.id}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant={getStatusBadgeVariant(selectedUser.status)}>
                      {selectedUser.status}
                    </Badge>
                    {selectedUser.type === 'SELLER' && selectedUser.kycStatus && (
                      <Badge variant={getKycStatusBadgeVariant(selectedUser.kycStatus)}>
                        KYC {selectedUser.kycStatus}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Contact & Account Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                    <User className="h-4 w-4 mr-2" />
                    Contact Information
                  </h4>
                  <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                    <div className="flex items-center">
                      <Phone className="h-4 w-4 text-gray-400 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{selectedUser.phoneNumber}</p>
                        <p className="text-xs text-gray-500">Phone Number</p>
                      </div>
                    </div>
                    {selectedUser.email && (
                      <div className="flex items-center">
                        <Mail className="h-4 w-4 text-gray-400 mr-3" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">{selectedUser.email}</p>
                          <p className="text-xs text-gray-500">Email Address</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                    <Calendar className="h-4 w-4 mr-2" />
                    Account Information
                  </h4>
                  <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 text-gray-400 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {formatDate(selectedUser.joinDate)}
                        </p>
                        <p className="text-xs text-gray-500">Joined Date</p>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 text-gray-400 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {formatDate(selectedUser.lastActive)}
                        </p>
                        <p className="text-xs text-gray-500">Last Active</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* KYC Details for Sellers */}
              {selectedUser.type === 'SELLER' && selectedUser.kycDetails && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                    <Shield className="h-4 w-4 mr-2" />
                    Business & KYC Information
                  </h4>
                  <div className="bg-gray-50 p-4 rounded-lg space-y-4">
                    {/* Basic Business Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Business Name</p>
                        <p className="text-sm font-medium text-gray-900">{selectedUser.kycDetails.businessName || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Business Type</p>
                        <p className="text-sm font-medium text-gray-900">{selectedUser.kycDetails.businessType || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Registration Number</p>
                        <p className="text-sm font-medium text-gray-900">{selectedUser.kycDetails.registrationNumber || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Tax ID</p>
                        <p className="text-sm font-medium text-gray-900">{selectedUser.kycDetails.taxId || 'N/A'}</p>
                      </div>
                    </div>

                    {/* Business Address */}
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Business Address</p>
                      <p className="text-sm text-gray-900">
                        {selectedUser.kycDetails.address}, {selectedUser.kycDetails.city}, {selectedUser.kycDetails.state} {selectedUser.kycDetails.postalCode}, {selectedUser.kycDetails.country}
                      </p>
                    </div>

                    {/* Document Information */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Document Type</p>
                        <p className="text-sm font-medium text-gray-900">{selectedUser.kycDetails.documentType || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Document Number</p>
                        <p className="text-sm font-medium text-gray-900">{selectedUser.kycDetails.documentNumber || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Document Expiry</p>
                        <p className="text-sm font-medium text-gray-900">
                          {selectedUser.kycDetails.documentExpiryDate ? formatDate(selectedUser.kycDetails.documentExpiryDate) : 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">KYC Verified At</p>
                        <p className="text-sm font-medium text-gray-900">
                          {selectedUser.kycDetails.verifiedAt ? formatDate(selectedUser.kycDetails.verifiedAt) : 'N/A'}
                        </p>
                      </div>
                    </div>

                    {/* Document URL */}
                    {selectedUser.kycDetails.documentUrl && (
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Document</p>
                        <a 
                          href={selectedUser.kycDetails.documentUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:text-blue-800 underline"
                        >
                          View Document
                        </a>
                      </div>
                    )}

                    {/* Bank Accounts */}
                    {selectedUser.kycDetails.bankAccounts && selectedUser.kycDetails.bankAccounts.length > 0 && (
                      <div>
                        <p className="text-xs text-gray-500 mb-2">Bank Accounts</p>
                        <div className="space-y-2">
                          {selectedUser.kycDetails.bankAccounts.map((account, index) => (
                            <div key={account.id} className="p-3 bg-white rounded border">
                              <div className="grid grid-cols-2 gap-2 text-sm">
                                <div>
                                  <span className="text-gray-500">Bank:</span> {account.bankName}
                                </div>
                                <div>
                                  <span className="text-gray-500">Account:</span> {account.accountNumber}
                                </div>
                                <div>
                                  <span className="text-gray-500">Name:</span> {account.accountName}
                                </div>
                                <div>
                                  <span className="text-gray-500">Currency:</span> {account.currency}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Wallets */}
                    {selectedUser.kycDetails.wallets && selectedUser.kycDetails.wallets.length > 0 && (
                      <div>
                        <p className="text-xs text-gray-500 mb-2">Digital Wallets</p>
                        <div className="space-y-2">
                          {selectedUser.kycDetails.wallets.map((wallet, index) => (
                            <div key={wallet.id} className="p-3 bg-white rounded border">
                              <div className="grid grid-cols-2 gap-2 text-sm">
                                <div>
                                  <span className="text-gray-500">Type:</span> {wallet.walletType}
                                </div>
                                <div>
                                  <span className="text-gray-500">Account:</span> {wallet.account}
                                </div>
                                <div>
                                  <span className="text-gray-500">Address:</span> {wallet.walletAddress}
                                </div>
                                <div>
                                  <span className="text-gray-500">Currency:</span> {wallet.currency}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Delivery Addresses */}
              {selectedUser.deliveryAddresses && selectedUser.deliveryAddresses.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                    <MapPin className="h-4 w-4 mr-2" />
                    Delivery Addresses
                  </h4>
                  <div className="space-y-2">
                    {selectedUser.deliveryAddresses.map((address, index) => (
                      <div key={address.id} className="p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {address.address}, {address.city}, {address.state}
                            </p>
                            {address.isDefault && (
                              <Badge variant="outline" className="text-xs mt-1">Default</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Statistics */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Activity Statistics
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {selectedUser.type === 'BUYER' ? selectedUser.totalOrders : selectedUser.totalProducts}
                    </div>
                    <div className="text-xs text-gray-600">
                      {selectedUser.type === 'BUYER' ? 'Total Orders' : 'Total Products'}
                    </div>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-lg font-bold text-green-600 break-words">
                      {selectedUser.currencyTotals && Object.keys(selectedUser.currencyTotals).length > 0
                        ? formatCurrency(
                            selectedUser.currencyTotals[selectedUser.latestCurrency] || 0,
                            selectedUser.latestCurrency
                          )
                        : 'GMD 0.00'
                      }
                    </div>
                    <div className="text-xs text-gray-600">
                      {selectedUser.type === 'BUYER' ? 'Total Spent' : 'Total Sales'}
                    </div>
                    {selectedUser.allCurrencies && selectedUser.allCurrencies.length > 1 && (
                      <button
                        onClick={() => setIsCurrenciesDialogOpen(true)}
                        className="text-xs text-blue-600 hover:text-blue-800 underline mt-1"
                      >
                        See all currencies ({selectedUser.allCurrencies.length})
                      </button>
                    )}
                  </div>
                  {selectedUser.type === 'SELLER' && (
                    <div className="text-center p-4 bg-purple-50 rounded-lg">
                      <div className="text-2xl font-bold text-purple-600">
                        {selectedUser.totalSettlements}
                      </div>
                      <div className="text-xs text-gray-600">Settlements</div>
                    </div>
                  )}
                  <div className="text-center p-4 bg-orange-50 rounded-lg">
                    <div className="text-2xl font-bold text-orange-600">
                      {selectedUser.allCurrencies?.length || 0}
                    </div>
                    <div className="text-xs text-gray-600">Currencies Used</div>
                  </div>
                </div>
              </div>

              {/* Recent Activity */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                  <Clock className="h-4 w-4 mr-2" />
                  Recent Activity
                </h4>
                <div className="space-y-3">
                  {/* Recent Orders */}
                  {selectedUser.orders && selectedUser.orders.length > 0 && (
                    <div>
                      <p className="text-xs text-gray-500 mb-2">Recent Orders</p>
                      <div className="space-y-2">
                        {selectedUser.orders.slice(0, 3).map((order) => (
                          <div key={order.id} className="p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-medium text-gray-900">Order #{order.orderNumber}</p>
                                <p className="text-xs text-gray-500">{formatDate(order.createdAt)}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-medium text-gray-900">
                                  {formatCurrency(order.totalAmount, order.currencyCode)}
                                </p>
                                <Badge variant={order.status === 'COMPLETED' ? 'default' : 'secondary'}>
                                  {order.status}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Recent Products (for sellers) */}
                  {selectedUser.type === 'SELLER' && selectedUser.products && selectedUser.products.length > 0 && (
                    <div>
                      <p className="text-xs text-gray-500 mb-2">Recent Products</p>
                      <div className="space-y-2">
                        {selectedUser.products.slice(0, 3).map((product) => (
                          <div key={product.id} className="p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-medium text-gray-900">{product.title}</p>
                                <p className="text-xs text-gray-500">{formatDate(product.createdAt)}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-medium text-gray-900">
                                  {formatCurrency(product.price, product.currencyCode)}
                                </p>
                                <Badge variant={product.status === 'ACTIVE' ? 'default' : 'secondary'}>
                                  {product.status}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* KYC Action for Pending Sellers */}
              {selectedUser.type === 'SELLER' && selectedUser.kycStatus === 'PENDING' && (
                <div className="mt-6">
                  <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    KYC Verification Required
                  </h4>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-start">
                      <AlertTriangle className="h-5 w-5 text-yellow-500 mr-2 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm text-yellow-800 mb-3">
                          This seller has submitted KYC documents and is awaiting verification on Snap.
                        </p>
                        <div className="flex space-x-3">
                          <Button
                            onClick={() => handleKycAction('approve')}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Approve KYC
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => setIsKycDialogOpen(true)}
                          >
                            <XCircle className="mr-2 h-4 w-4" />
                            Reject KYC
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* KYC Rejection Dialog */}
      <Dialog open={isKycDialogOpen} onOpenChange={setIsKycDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Reject KYC Application</DialogTitle>
            <DialogDescription>
              Provide a reason for rejecting this KYC application.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Rejection Reason</label>
              <textarea
                className="mt-1 w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={4}
                placeholder="Enter the reason for rejection..."
                id="rejectionReason"
              />
            </div>
            
            <div className="flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={() => setIsKycDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  const reason = (document.getElementById('rejectionReason') as HTMLTextAreaElement).value;
                  handleKycAction('reject', reason);
                }}
              >
                Reject KYC
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* All Currencies Dialog */}
      <Dialog open={isCurrenciesDialogOpen} onOpenChange={setIsCurrenciesDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>All Currencies</DialogTitle>
            <DialogDescription>
              Complete breakdown of {selectedUser?.firstName} {selectedUser?.lastName}'s currency usage.
            </DialogDescription>
          </DialogHeader>
          
          {selectedUser && selectedUser.currencyTotals && (
            <div className="space-y-4">
              <div className="grid gap-3">
                {Object.entries(selectedUser.currencyTotals).map(([currency, amount]) => (
                  <div key={currency} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-blue-600">{currency}</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{currency}</p>
                        <p className="text-xs text-gray-500">
                          {selectedUser.type === 'BUYER' ? 'Total Spent' : 'Total Sales'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-gray-900">
                        {formatCurrency(amount, currency)}
                      </p>
                      {currency === selectedUser.latestCurrency && (
                        <Badge variant="outline" className="text-xs mt-1">Primary</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Total Currencies Used:</span>
                  <span className="font-medium text-gray-900">{selectedUser.allCurrencies?.length || 0}</span>
                </div>
                <div className="flex items-center justify-between text-sm mt-1">
                  <span className="text-gray-600">Primary Currency:</span>
                  <span className="font-medium text-gray-900">{selectedUser.latestCurrency}</span>
                </div>
              </div>
            </div>
          )}
          
          <div className="flex justify-end pt-4">
            <Button onClick={() => setIsCurrenciesDialogOpen(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
} 