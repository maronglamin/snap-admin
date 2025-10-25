'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  DollarSign, 
  Car, 
  ShoppingCart, 
  Download,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { PermissionGuard } from '@/components/auth/PermissionGuard';
import { analyticsApi } from '@/services/api';
import { DrillDownModal } from '@/components/analytics/DrillDownModal';

export default function RevenueAnalysisPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(false);
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [rideAnalyticsLoading, setRideAnalyticsLoading] = useState(false);
  const [ecommerceAnalyticsLoading, setEcommerceAnalyticsLoading] = useState(false);
  const [faultCasesLoading, setFaultCasesLoading] = useState(false);
  const [period, setPeriod] = useState('30');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [minDistance, setMinDistance] = useState('10');
  const [selectedCurrency, setSelectedCurrency] = useState('GMD');
  const [availableCurrencies, setAvailableCurrencies] = useState<string[]>([]);

  // Data states
  const [revenueOverview, setRevenueOverview] = useState<any>(null);
  const [externalTransactionsOverview, setExternalTransactionsOverview] = useState<any>(null);
  const [inactiveDrivers, setInactiveDrivers] = useState([]);
  const [unpaidRides, setUnpaidRides] = useState([]);
  const [unsettledDrivers, setUnsettledDrivers] = useState([]);
  const [highDistanceUnpaidRides, setHighDistanceUnpaidRides] = useState([]);
  const [repeatCustomers, setRepeatCustomers] = useState([]);
  const [noTokenRides, setNoTokenRides] = useState([]);
  const [unpaidOrders, setUnpaidOrders] = useState([]);
  const [sellersNoOrders, setSellersNoOrders] = useState([]);
  const [unsettledSellers, setUnsettledSellers] = useState([]);

  // Cache states to track what's been loaded
  const [dataLoaded, setDataLoaded] = useState({
    overview: false,
    rideAnalytics: false,
    ecommerceAnalytics: false,
    faultCases: false,
  });

  // Drill-down modal state
  const [drillDownModal, setDrillDownModal] = useState<{
    isOpen: boolean;
    type: 'total' | 'ride' | 'ecommerce' | 'external';
    title: string;
  }>({
    isOpen: false,
    type: 'total',
    title: '',
  });

  const loadAvailableCurrencies = async () => {
    try {
      const response = await analyticsApi.getAvailableCurrencies();
      setAvailableCurrencies(response.currencies || []);
      // Set default currency to first available or GMD
      if (response.currencies && response.currencies.length > 0) {
        setSelectedCurrency(response.currencies[0]);
      }
    } catch (error) {
      console.error('Error loading available currencies:', error);
    }
  };

  // Load overview data (revenue cards and external transactions)
  const loadOverviewData = async () => {
    if (loading) return;
    
    setOverviewLoading(true);
    try {
      const [overviewRes, externalTransactionsRes] = await Promise.all([
        analyticsApi.getRevenueOverview(period, selectedCurrency),
        analyticsApi.getExternalTransactionsOverview(period, selectedCurrency),
      ]);

      setRevenueOverview(overviewRes);
      setExternalTransactionsOverview(externalTransactionsRes);
      setDataLoaded(prev => ({ ...prev, overview: true }));
    } catch (error) {
      console.error('Error loading overview data:', error);
    } finally {
      setOverviewLoading(false);
    }
  };

  // Load ride analytics data
  const loadRideAnalytics = async () => {
    if (loading) return;
    
    setRideAnalyticsLoading(true);
    try {
      const [inactiveRes, unpaidRidesRes, unsettledDriversRes] = await Promise.all([
        analyticsApi.getInactiveDrivers(period),
        analyticsApi.getUnpaidRides(selectedCurrency),
        analyticsApi.getUnsettledDrivers(period, selectedCurrency),
      ]);

      setInactiveDrivers(inactiveRes.inactiveDriversList || []);
      setUnpaidRides(unpaidRidesRes.unpaidRides || []);
      setUnsettledDrivers(unsettledDriversRes.unsettledDriversList || []);
      setDataLoaded(prev => ({ ...prev, rideAnalytics: true }));
    } catch (error) {
      console.error('Error loading ride analytics:', error);
    } finally {
      setRideAnalyticsLoading(false);
    }
  };

  // Load ecommerce analytics data
  const loadEcommerceAnalytics = async () => {
    // Remove the guard clause to allow reloading when currency changes
    if (loading) return;
    
    setEcommerceAnalyticsLoading(true);
    try {
      const [unpaidOrdersRes, sellersNoOrdersRes, unsettledSellersRes] = await Promise.all([
        analyticsApi.getUnpaidOrders(selectedCurrency),
        analyticsApi.getSellersNoOrders(period),
        analyticsApi.getUnsettledSellers(period, selectedCurrency),
      ]);

      setUnpaidOrders(unpaidOrdersRes.orders || []);
      setSellersNoOrders(sellersNoOrdersRes.sellersWithoutOrdersList || []);
      setUnsettledSellers(unsettledSellersRes.unsettledSellersList || []);
      setDataLoaded(prev => ({ ...prev, ecommerceAnalytics: true }));
    } catch (error) {
      console.error('Error loading ecommerce analytics:', error);
    } finally {
      setEcommerceAnalyticsLoading(false);
    }
  };

  // Load fault cases data
  const loadFaultCases = async () => {
    if (loading) return;
    
    setFaultCasesLoading(true);
    try {
      const [highDistanceRes, repeatCustomersRes, noTokenRidesRes] = await Promise.all([
        analyticsApi.getHighDistanceUnpaidRides(minDistance, selectedCurrency),
        analyticsApi.getRepeatCustomers(date, selectedCurrency),
        analyticsApi.getNoTokenRides(selectedCurrency),
      ]);

      setHighDistanceUnpaidRides(highDistanceRes.rides || []);
      setRepeatCustomers(repeatCustomersRes.repeatCustomers || []);
      setNoTokenRides(noTokenRidesRes.ridesWithoutToken || []);
      setDataLoaded(prev => ({ ...prev, faultCases: true }));
    } catch (error) {
      console.error('Error loading fault cases:', error);
    } finally {
      setFaultCasesLoading(false);
    }
  };

  // Load all data (for refresh button)
  const loadAllData = async () => {
    setLoading(true);
    setDataLoaded({
      overview: false,
      rideAnalytics: false,
      ecommerceAnalytics: false,
      faultCases: false,
    });
    
    try {
      await Promise.all([
        loadOverviewData(),
        loadRideAnalytics(),
        loadEcommerceAnalytics(),
        loadFaultCases(),
      ]);
    } catch (error) {
      console.error('Error loading all data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAvailableCurrencies();
  }, []);

  // Load overview data when currencies are available or when filters change
  useEffect(() => {
    if (availableCurrencies.length > 0) {
      loadOverviewData();
    }
  }, [period, selectedCurrency, availableCurrencies.length]);

  // Load tab-specific data when tab changes or currency changes
  useEffect(() => {
    if (activeTab === 'ride' && !dataLoaded.rideAnalytics) {
      loadRideAnalytics();
    } else if (activeTab === 'ecommerce' && !dataLoaded.ecommerceAnalytics) {
      loadEcommerceAnalytics();
    } else if ((activeTab === 'fault-ride' || activeTab === 'fault-ecommerce') && !dataLoaded.faultCases) {
      loadFaultCases();
    }
  }, [activeTab, dataLoaded.rideAnalytics, dataLoaded.ecommerceAnalytics, dataLoaded.faultCases, selectedCurrency]);

  // Reset overview cache when currency or period changes
  useEffect(() => {
    setDataLoaded(prev => ({
      ...prev,
      overview: false,
    }));
    // Clear the data immediately when currency/period changes
    setRevenueOverview(null);
    setExternalTransactionsOverview(null);
  }, [selectedCurrency, period]);

  // Reset ride analytics cache when period or currency changes
  useEffect(() => {
    setDataLoaded(prev => ({
      ...prev,
      rideAnalytics: false,
    }));
    // Clear the data immediately when currency/period changes
    setInactiveDrivers([]);
    setUnpaidRides([]);
    setUnsettledDrivers([]);
  }, [period, selectedCurrency]);

  // Reset fault cases cache when date, minDistance, or currency changes
  useEffect(() => {
    setDataLoaded(prev => ({
      ...prev,
      faultCases: false,
    }));
    // Clear the data immediately when filters change
    setHighDistanceUnpaidRides([]);
    setRepeatCustomers([]);
    setNoTokenRides([]);
  }, [date, minDistance, selectedCurrency]);

  // Reset ecommerce analytics cache when period or currency changes
  useEffect(() => {
    setDataLoaded(prev => ({
      ...prev,
      ecommerceAnalytics: false,
    }));
    // Clear the data immediately when currency/period changes
    setUnpaidOrders([]);
    setSellersNoOrders([]);
    setUnsettledSellers([]);
  }, [period, selectedCurrency]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: selectedCurrency,
    }).format(amount);
  };

  const formatTransactionType = (type: string) => {
    const typeMap: Record<string, string> = {
      'ECOMEMRCE': 'E-commerce',
      'ECOMMERCE': 'E-commerce',
      'FEE': 'Fee',
      'SERVICE_FEE': 'Service Fee',
      'ORIGINAL': 'Original',
      'RIDES': 'Rides',
    };
    return typeMap[type] || type;
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      // Ride Status
      REQUESTED: { color: 'bg-blue-100 text-blue-800' },
      ACCEPTED: { color: 'bg-green-100 text-green-800' },
      ARRIVING: { color: 'bg-purple-100 text-purple-800' },
      ARRIVED: { color: 'bg-indigo-100 text-indigo-800' },
      IN_PROGRESS: { color: 'bg-orange-100 text-orange-800' },
      COMPLETED: { color: 'bg-emerald-100 text-emerald-800' },
      CANCELLED: { color: 'bg-red-100 text-red-800' },
      EXPIRED: { color: 'bg-gray-100 text-gray-800' },
      
      // Payment Status
      PENDING: { color: 'bg-yellow-100 text-yellow-800' },
      PAID: { color: 'bg-green-100 text-green-800' },
      FAILED: { color: 'bg-red-100 text-red-800' },
      REFUNDED: { color: 'bg-pink-100 text-pink-800' },
      SETTLED: { color: 'bg-teal-100 text-teal-800' },
      AUTHORIZED: { color: 'bg-cyan-100 text-cyan-800' },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || { color: 'bg-gray-100 text-gray-800' };

    return (
      <Badge className={config.color}>
        {status}
      </Badge>
    );
  };

  const handleDrillDown = (type: 'total' | 'ride' | 'ecommerce' | 'external', title: string) => {
    setDrillDownModal({
      isOpen: true,
      type,
      title,
    });
  };

  const closeDrillDownModal = () => {
    setDrillDownModal({
      isOpen: false,
      type: 'total',
      title: '',
    });
  };

  return (
    <AuthGuard>
      <PermissionGuard requiredPermission={{ entityType: 'ANALYTICS', permission: 'VIEW' }}>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
          <div className="max-w-7xl mx-auto space-y-8">
            {/* Header Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    Revenue Analysis
                  </h1>
                  <p className="text-gray-600 mt-2">Comprehensive analytics for informed decision making</p>
                </div>
                <Button
                  onClick={loadAllData}
                  disabled={loading}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  {loading ? 'Loading...' : 'Refresh Data'}
                </Button>
              </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Analysis Period (Days)</label>
                  <Select value={period} onValueChange={setPeriod}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7">Last 7 Days</SelectItem>
                      <SelectItem value="30">Last 30 Days</SelectItem>
                      <SelectItem value="90">Last 90 Days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Currency</label>
                  <Select value={selectedCurrency} onValueChange={setSelectedCurrency}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {availableCurrencies.map((currency) => (
                        <SelectItem key={currency} value={currency}>
                          {currency}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Date for Repeat Customers</label>
                  <Input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Min Distance (km)</label>
                  <Input
                    type="number"
                    value={minDistance}
                    onChange={(e) => setMinDistance(e.target.value)}
                    placeholder="10"
                  />
                </div>
              </div>
            </div>

            {/* Analytics Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="ride">Ride Analytics</TabsTrigger>
                <TabsTrigger value="fault-ride">Flagged - Ride</TabsTrigger>
                <TabsTrigger value="fault-ecommerce">Flagged - E-commerce</TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-6">
                {overviewLoading ? (
                  <div className="space-y-6">
                    <div className="flex items-center justify-center py-12">
                      <div className="flex items-center space-x-2">
                        <RefreshCw className="w-5 h-5 animate-spin text-blue-600" />
                        <span className="text-gray-600">Loading overview data...</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    {revenueOverview && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(revenueOverview.summary.totalRevenue)}</div>
                        <p className="text-xs text-muted-foreground">
                          Last {revenueOverview.period} days • {selectedCurrency}
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-3 w-full"
                          onClick={() => handleDrillDown('total', 'Total Revenue')}
                        >
                          Drill Down
                        </Button>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Ride Revenue</CardTitle>
                        <Car className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(revenueOverview.summary.rideRevenue)}</div>
                        <p className="text-xs text-muted-foreground">
                          From ride services • {selectedCurrency}
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-3 w-full"
                          onClick={() => handleDrillDown('ride', 'Ride Revenue')}
                        >
                          Drill Down
                        </Button>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">E-commerce Revenue</CardTitle>
                        <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(revenueOverview.summary.ecommerceRevenue)}</div>
                        <p className="text-xs text-muted-foreground">
                          From product sales • {selectedCurrency}
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-3 w-full"
                          onClick={() => handleDrillDown('ecommerce', 'E-commerce Revenue')}
                        >
                          Drill Down
                        </Button>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* External Transactions Section */}
                {externalTransactionsOverview && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-gray-900">External Transactions</h3>
                      <p className="text-sm text-gray-500">Success transactions only • {selectedCurrency}</p>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                      {/* Total External Transactions */}
                      <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">{formatCurrency(externalTransactionsOverview.summary.totalAmount)}</div>
                          <p className="text-xs text-muted-foreground">
                            {externalTransactionsOverview.summary.totalTransactions} transactions
                          </p>
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-3 w-full"
                            onClick={() => handleDrillDown('external', 'External Transactions')}
                          >
                            Drill Down
                          </Button>
                        </CardContent>
                      </Card>

                      {/* Transaction Types */}
                      {Object.entries(externalTransactionsOverview.summary.byTransactionType).map(([type, data]: [string, any]) => (
                        <Card key={type}>
                          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">{formatTransactionType(type)}</CardTitle>
                            <Badge variant="outline" className="text-xs">
                              {data.count}
                            </Badge>
                          </CardHeader>
                          <CardContent>
                            <div className="text-2xl font-bold">{formatCurrency(data.amount)}</div>
                            <p className="text-xs text-muted-foreground">
                              {data.count} transactions
                            </p>
                          </CardContent>
                        </Card>
                      ))}

                      {/* App Services */}
                      {Object.entries(externalTransactionsOverview.summary.byAppService).map(([service, data]: [string, any]) => (
                        <Card key={service}>
                          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">{formatTransactionType(service)}</CardTitle>
                            <Badge variant="outline" className="text-xs">
                              {data.count}
                            </Badge>
                          </CardHeader>
                          <CardContent>
                            <div className="text-2xl font-bold">{formatCurrency(data.amount)}</div>
                            <p className="text-xs text-muted-foreground">
                              {data.count} transactions
                            </p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>

                    {/* Fees by Service Types Section */}
                    {Object.keys(externalTransactionsOverview.summary.feesByService).length > 0 && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="text-md font-semibold text-gray-800">Fees by Service Types</h4>
                          <p className="text-sm text-gray-500">Transaction fees only • {selectedCurrency}</p>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {Object.entries(externalTransactionsOverview.summary.feesByService).map(([service, data]: [string, any]) => (
                            <Card key={`fee-${service}`}>
                              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">{formatTransactionType(service)} Fees</CardTitle>
                                <Badge variant="outline" className="text-xs">
                                  {data.count}
                                </Badge>
                              </CardHeader>
                              <CardContent>
                                <div className="text-2xl font-bold">{formatCurrency(data.amount)}</div>
                                <p className="text-xs text-muted-foreground">
                                  {data.count} fee transactions
                                </p>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Service Fees by Service Types Section */}
                    {Object.keys(externalTransactionsOverview.summary.serviceFeesByService).length > 0 && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="text-md font-semibold text-gray-800">Service Fees by Service Types</h4>
                          <p className="text-sm text-gray-500">Service fees only • {selectedCurrency}</p>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {Object.entries(externalTransactionsOverview.summary.serviceFeesByService).map(([service, data]: [string, any]) => (
                            <Card key={`service-fee-${service}`}>
                              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">{formatTransactionType(service)} Service Fees</CardTitle>
                                <Badge variant="outline" className="text-xs">
                                  {data.count}
                                </Badge>
                              </CardHeader>
                              <CardContent>
                                <div className="text-2xl font-bold">{formatCurrency(data.amount)}</div>
                                <p className="text-xs text-muted-foreground">
                                  {data.count} service fee transactions
                                </p>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </div>
                      )}
                    </div>
                  )}
                  </>
                )}
              </TabsContent>

              {/* Ride Analytics Tab */}
              <TabsContent value="ride" className="space-y-6">
                {rideAnalyticsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="flex items-center space-x-2">
                      <RefreshCw className="w-5 h-5 animate-spin text-blue-600" />
                      <span className="text-gray-600">Loading ride analytics...</span>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Inactive Drivers */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span>Inactive Drivers</span>
                        <Button variant="outline" size="sm">
                          <Download className="w-4 h-4 mr-2" />
                          Export
                        </Button>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="text-2xl font-bold text-red-600">{inactiveDrivers.length}</div>
                        <p className="text-sm text-gray-600">Drivers with no completed rides in {period} days</p>
                        <div className="max-h-60 overflow-y-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Driver</TableHead>
                                <TableHead>Phone</TableHead>
                                <TableHead>Status</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {inactiveDrivers.slice(0, 10).map((driver: any) => (
                                <TableRow key={driver.driverId}>
                                  <TableCell>{driver.firstName} {driver.lastName}</TableCell>
                                  <TableCell>{driver.phoneNumber}</TableCell>
                                  <TableCell>
                                    <Badge variant={driver.isActive ? "default" : "secondary"}>
                                      {driver.isActive ? "Active" : "Inactive"}
                                    </Badge>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Unpaid Rides */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span>Unpaid Rides</span>
                        <Button variant="outline" size="sm">
                          <Download className="w-4 h-4 mr-2" />
                          Export
                        </Button>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="text-2xl font-bold text-orange-600">{unpaidRides.length}</div>
                        <p className="text-sm text-gray-600">Rides with accepted/in-progress/completed status but not paid</p>
                        <div className="max-h-60 overflow-y-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Ride ID</TableHead>
                                <TableHead>Driver</TableHead>
                                <TableHead>Amount</TableHead>
                                <TableHead>Status</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {unpaidRides.slice(0, 10).map((ride: any) => (
                                <TableRow key={ride.rideId}>
                                  <TableCell className="font-mono text-sm">{ride.rideId}</TableCell>
                                  <TableCell>
                                    <div className="space-y-1">
                                      <div className="font-medium text-sm">{ride.driverName}</div>
                                      <div className="text-xs text-gray-500">{ride.driverPhone}</div>
                                    </div>
                                  </TableCell>
                                  <TableCell>{formatCurrency(ride.totalFare)}</TableCell>
                                  <TableCell>{getStatusBadge(ride.paymentStatus)}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Unsettled Drivers */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span>Unsettled Drivers</span>
                        <Button variant="outline" size="sm">
                          <Download className="w-4 h-4 mr-2" />
                          Export
                        </Button>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="text-2xl font-bold text-blue-600">{unsettledDrivers.length}</div>
                        <p className="text-sm text-gray-600">Drivers with paid rides but settlement status not SETTLED</p>
                        <div className="max-h-60 overflow-y-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Driver</TableHead>
                                <TableHead>Earnings</TableHead>
                                <TableHead>Rides</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {unsettledDrivers.slice(0, 10).map((driver: any) => (
                                <TableRow key={driver.driverId}>
                                  <TableCell>
                                    <div className="space-y-1">
                                      <div className="font-medium text-sm">{driver.driverName}</div>
                                      <div className="text-xs text-gray-500">{driver.phoneNumber}</div>
                                    </div>
                                  </TableCell>
                                  <TableCell>{formatCurrency(driver.totalEarnings)}</TableCell>
                                  <TableCell>{driver.totalRides}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  </div>
                )}
              </TabsContent>

              {/* Fault Cases - Ride Tab */}
              <TabsContent value="fault-ride" className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* High Distance Unpaid Rides */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span>High Distance Unpaid Rides</span>
                        <Button variant="outline" size="sm">
                          <Download className="w-4 h-4 mr-2" />
                          Export
                        </Button>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="text-2xl font-bold text-red-600">{highDistanceUnpaidRides.length}</div>
                        <p className="text-sm text-gray-600">Rides with distance ≥ {minDistance}km but not paid</p>
                        <div className="max-h-60 overflow-y-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Ride ID</TableHead>
                                <TableHead>Driver</TableHead>
                                <TableHead>Distance</TableHead>
                                <TableHead>Amount</TableHead>
                                <TableHead>Status</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {highDistanceUnpaidRides.slice(0, 10).map((ride: any) => (
                                <TableRow key={ride.rideId}>
                                  <TableCell className="font-mono text-sm">{ride.rideId}</TableCell>
                                  <TableCell>
                                    <div className="space-y-1">
                                      <div className="font-medium text-sm">{ride.driverName}</div>
                                      <div className="text-xs text-gray-500">{ride.driverPhone}</div>
                                    </div>
                                  </TableCell>
                                  <TableCell>{ride.distance}km</TableCell>
                                  <TableCell>{formatCurrency(ride.totalFare)}</TableCell>
                                  <TableCell>
                                    <div className="space-y-2">
                                      <div>
                                        <span className="text-xs text-gray-500 mr-1">Ride:</span>
                                        {getStatusBadge(ride.status)}
                                      </div>
                                      <div>
                                        <span className="text-xs text-gray-500 mr-1">Payment:</span>
                                        {getStatusBadge(ride.paymentStatus)}
                                      </div>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Repeat Customers */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span>Repeat Customers</span>
                        <Button variant="outline" size="sm">
                          <Download className="w-4 h-4 mr-2" />
                          Export
                        </Button>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="text-2xl font-bold text-purple-600">{repeatCustomers.length}</div>
                        <p className="text-sm text-gray-600">Driver-customer pairs with multiple rides on {date}</p>
                        <div className="max-h-60 overflow-y-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Driver</TableHead>
                                <TableHead>Customer</TableHead>
                                <TableHead>Rides</TableHead>
                                <TableHead>Total</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {repeatCustomers.slice(0, 10).map((pair: any) => (
                                <TableRow key={`${pair.driverId}-${pair.customerId}`}>
                                  <TableCell>
                                    <div className="space-y-1">
                                      <div className="font-medium text-sm">{pair.driverName}</div>
                                      <div className="text-xs text-gray-500">{pair.driverPhone}</div>
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <div className="space-y-1">
                                      <div className="font-medium text-sm">{pair.customerName}</div>
                                      <div className="text-xs text-gray-500">{pair.customerPhone}</div>
                                    </div>
                                  </TableCell>
                                  <TableCell>{pair.rideCount}</TableCell>
                                  <TableCell>{formatCurrency(pair.totalFare)}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* No Token Rides */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span>No Token Rides</span>
                        <Button variant="outline" size="sm">
                          <Download className="w-4 h-4 mr-2" />
                          Export
                        </Button>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="text-2xl font-bold text-red-600">{noTokenRides.length}</div>
                        <p className="text-sm text-gray-600">Accepted rides with no token records or unused tokens</p>
                        <div className="max-h-60 overflow-y-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Ride ID</TableHead>
                                <TableHead>Driver</TableHead>
                                <TableHead>Customer</TableHead>
                                <TableHead>Amount</TableHead>
                                <TableHead>Token Status</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {noTokenRides.slice(0, 10).map((ride: any) => (
                                <TableRow key={ride.rideId}>
                                  <TableCell className="font-mono text-sm">{ride.rideId}</TableCell>
                                  <TableCell>
                                    <div className="space-y-1">
                                      <div className="font-medium text-sm">{ride.driverName}</div>
                                      <div className="text-xs text-gray-500">{ride.driverPhone}</div>
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <div className="space-y-1">
                                      <div className="font-medium text-sm">{ride.customerName}</div>
                                      <div className="text-xs text-gray-500">{ride.customerPhone}</div>
                                    </div>
                                  </TableCell>
                                  <TableCell>{formatCurrency(ride.totalFare)}</TableCell>
                                  <TableCell>
                                    <Badge 
                                      variant={ride.tokenStatus === 'NO_TOKEN' ? 'destructive' : 
                                              ride.tokenStatus === 'UNUSED' ? 'secondary' : 'default'}
                                    >
                                      {ride.tokenStatus}
                                    </Badge>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Fault Cases - E-commerce Tab */}
              <TabsContent value="fault-ecommerce" className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Unpaid Orders */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span>Unpaid Orders</span>
                        <Button variant="outline" size="sm">
                          <Download className="w-4 h-4 mr-2" />
                          Export
                        </Button>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="text-2xl font-bold text-red-600">{unpaidOrders.length}</div>
                        <p className="text-sm text-gray-600">Orders that are not canceled and payment status is pending</p>
                        <div className="max-h-60 overflow-y-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Order ID</TableHead>
                                <TableHead>Amount</TableHead>
                                <TableHead>Status</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {unpaidOrders.slice(0, 10).map((order: any) => (
                                <TableRow key={order.orderId}>
                                  <TableCell className="font-mono text-sm">{order.orderId}</TableCell>
                                  <TableCell>{formatCurrency(order.totalAmount)}</TableCell>
                                  <TableCell>{getStatusBadge(order.paymentStatus)}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Sellers with No Orders */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span>Sellers with No Orders</span>
                        <Button variant="outline" size="sm">
                          <Download className="w-4 h-4 mr-2" />
                          Export
                        </Button>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="text-2xl font-bold text-orange-600">{sellersNoOrders.length}</div>
                        <p className="text-sm text-gray-600">Sellers with products but no orders in {period} days</p>
                        <div className="max-h-60 overflow-y-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Seller</TableHead>
                                <TableHead>Phone</TableHead>
                                <TableHead>Products</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {sellersNoOrders.slice(0, 10).map((seller: any) => (
                                <TableRow key={seller.sellerId}>
                                  <TableCell>{seller.firstName} {seller.lastName}</TableCell>
                                  <TableCell>{seller.phoneNumber}</TableCell>
                                  <TableCell>{seller.productCount}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Unsettled Sellers */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span>Unsettled Sellers</span>
                        <Button variant="outline" size="sm">
                          <Download className="w-4 h-4 mr-2" />
                          Export
                        </Button>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="text-2xl font-bold text-blue-600">{unsettledSellers.length}</div>
                        <p className="text-sm text-gray-600">Sellers with paid orders but no settlement requests or incomplete settlements</p>
                        <div className="max-h-60 overflow-y-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Seller</TableHead>
                                <TableHead>Amount</TableHead>
                                <TableHead>Orders</TableHead>
                                <TableHead>Settlement Status</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {unsettledSellers.slice(0, 10).map((seller: any) => (
                                <TableRow key={seller.sellerId}>
                                  <TableCell>{seller.sellerName}</TableCell>
                                  <TableCell>{formatCurrency(seller.totalAmount)}</TableCell>
                                  <TableCell>{seller.totalOrders}</TableCell>
                                  <TableCell>
                                    <Badge 
                                      variant={seller.settlementStatus === 'NO_SETTLEMENT_REQUEST' ? 'destructive' : 'secondary'}
                                    >
                                      {seller.settlementMessage}
                                    </Badge>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* Drill Down Modal */}
        <DrillDownModal
          isOpen={drillDownModal.isOpen}
          onClose={closeDrillDownModal}
          type={drillDownModal.type}
          period={period}
          currency={selectedCurrency}
          title={drillDownModal.title}
        />
      </PermissionGuard>
    </AuthGuard>
  );
}
