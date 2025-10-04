'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  MoreVertical, 
  Eye,
  Download,
  Filter,
  Calendar,
  DollarSign,
  CreditCard,
  User,
  Store,
  Package,
  ArrowLeft,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Copy,
  Check,
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
import { journalsApi } from '@/services/api';
import { exportStripeTransactionsToCSV, StripeTransactionForExport } from '@/utils/csvExport';

interface StripeTransaction {
  id: string;
  orderId: string;
  customerId: string;
  sellerId: string;
  paymentMethodId?: string;
  gatewayProvider: string;
  gatewayTransactionId?: string;
  paymentReference?: string;
  appTransactionId: string;
  transactionType: string;
  amount: number;
  currencyCode: string;
  gatewayChargeFees?: number;
  processedAmount?: number;
  paidThroughGateway: boolean;
  gatewayResponse?: any;
  gatewayRequest?: any;
  status: string;
  failureReason?: string;
  processedAt?: string;
  createdAt: string;
  updatedAt: string;
  appService: string;
  rideRequestId?: string;
  rideRequest?: {
    id: string;
    requestId: string;
    status: string;
    estimatedPrice: number;
    actualPrice?: number;
  };
  customer?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber: string;
  };
  seller?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber: string;
  };
  order?: {
    id: string;
    orderNumber: string;
    customerId: string;
    sellerId: string;
    productId: string;
    quantity: number;
    totalAmount: number;
    status: string;
    createdAt: string;
  };
  paymentMethod?: {
    id: string;
    type: string;
    provider: string;
    accountId: string;
    accountName: string;
    isDefault: boolean;
    status: string;
    metadata?: any;
  };
}

export default function StripePaymentReportPage() {
  const [transactions, setTransactions] = useState<StripeTransaction[]>([]);
  const [selectedTransaction, setSelectedTransaction] = useState<StripeTransaction | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [dateFrom, setDateFrom] = useState(() => {
    const now = new Date();
    return now.toISOString().slice(0, 16); // Format: YYYY-MM-DDTHH:MM
  });
  const [dateTo, setDateTo] = useState(() => {
    const now = new Date();
    return now.toISOString().slice(0, 16); // Format: YYYY-MM-DDTHH:MM
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showDetail, setShowDetail] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalTransactions, setTotalTransactions] = useState(0);
  const itemsPerPage = 10;

  // Load transactions
  useEffect(() => {
    loadTransactions();
  }, [currentPage]);

  const loadTransactions = async () => {
    try {
      setIsLoading(true);
      setError('');
      
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10',
        search: searchQuery,
        status: filterStatus,
        transactionType: filterType,
        dateFrom: dateFrom,
        dateTo: dateTo,
      });

      const response = await journalsApi.getStripePayments(params);
      
      setTransactions(response.data || []);
      setTotalTransactions(response.pagination?.total || 0);
      setTotalPages(response.pagination?.totalPages || 1);
    } catch (error) {
      console.error('Error loading transactions:', error);
      setError('Failed to load transactions');
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewDetail = async (transaction: StripeTransaction) => {
    try {
      const response = await journalsApi.getStripePaymentById(transaction.id);
      setSelectedTransaction(response.data);
      setShowDetail(true);
    } catch (error) {
      console.error('Error loading transaction details:', error);
      setError('Failed to load transaction details');
    }
  };

  const handleBackToList = () => {
    setShowDetail(false);
    setSelectedTransaction(null);
  };

  const copyToClipboard = async (text: string, fieldName: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (error) {
      console.error('Failed to copy text:', error);
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status.toLowerCase()) {
      case 'success':
        return 'default';
      case 'pending':
        return 'secondary';
      case 'failed':
      case 'cancelled':
        return 'destructive';
      case 'refunded':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const getTypeBadgeVariant = (type: string) => {
    switch (type.toLowerCase()) {
      case 'original':
        return 'default';
      case 'fee':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getAccessChannelBadgeVariant = (appService: string) => {
    switch (appService) {
      case 'ECOMMERCE':
        return 'default';
      case 'RIDES':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
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

  const handleExport = async () => {
    try {
      console.log('🚀 Export started');
      
      // Check authentication first
      const token = localStorage.getItem('auth-storage');
      console.log('🔐 Auth storage:', token ? 'Present' : 'Missing');
      
      if (!token) {
        setError('Please log in to export data');
        return;
      }
      
      setIsExporting(true);
      setError('');
      
      const params = new URLSearchParams({
        search: searchQuery,
        status: filterStatus,
        transactionType: filterType,
        dateFrom: dateFrom,
        dateTo: dateTo,
      });

      const response = await journalsApi.exportStripePayments(params);
      
      if (response.success) {
        // Transform the data for CSV export
        const exportData: StripeTransactionForExport[] = response.data.map((transaction: StripeTransaction) => ({
          id: transaction.id,
          appTransactionId: transaction.appTransactionId,
          orderId: transaction.orderId,
          rideRequestId: transaction.rideRequestId,
          orderNumber: transaction.order?.orderNumber,
          requestId: transaction.rideRequest?.requestId,
          customerName: transaction.customer ? `${transaction.customer.firstName} ${transaction.customer.lastName}` : undefined,
          customerEmail: transaction.customer?.email,
          sellerName: transaction.seller ? `${transaction.seller.firstName} ${transaction.seller.lastName}` : undefined,
          sellerEmail: transaction.seller?.email,
          amount: transaction.amount,
          currencyCode: transaction.currencyCode,
          gatewayChargeFees: transaction.gatewayChargeFees,
          processedAmount: transaction.processedAmount,
          status: transaction.status,
          transactionType: transaction.transactionType,
          gatewayProvider: transaction.gatewayProvider,
          appService: transaction.appService,
          gatewayTransactionId: transaction.gatewayTransactionId,
          paymentReference: transaction.paymentReference,
          paidThroughGateway: transaction.paidThroughGateway,
          failureReason: transaction.failureReason,
          createdAt: transaction.createdAt,
          updatedAt: transaction.updatedAt,
          processedAt: transaction.processedAt,
        }));

        // Generate filename based on filters
        let filename = 'stripe-payments-report';
        if (filterStatus !== 'all') filename += `-${filterStatus.toLowerCase()}`;
        if (filterType !== 'all') filename += `-${filterType.toLowerCase()}`;
        if (searchQuery) filename += `-search-${searchQuery.substring(0, 20)}`;

        exportStripeTransactionsToCSV(exportData, filename);
        setExportSuccess(true);
        setTimeout(() => setExportSuccess(false), 3001);
      } else {
        setError(response.error || 'Failed to export transactions');
      }
    } catch (err: any) {
      console.error('Export error:', err);
      setError(err.message || 'Failed to export transactions');
    } finally {
      setIsExporting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading Stripe payment transactions...</span>
        </div>
      </div>
    );
  }

  if (showDetail && selectedTransaction) {
    return (
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              onClick={handleBackToList}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to List
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Transaction Details</h1>
              <p className="text-gray-600">Stripe Payment Report</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Main Content - 75% */}
          <div className="col-span-2 space-y-6">
            {/* Transaction Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <CreditCard className="h-5 w-5" />
                  <span>Transaction Information</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {/* Basic Transaction Info */}
                  <div>
                    <label className="text-sm font-medium text-gray-700">App Transaction ID</label>
                    <p className="text-sm text-gray-900 mt-1 font-mono">{selectedTransaction.appTransactionId}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Gateway Transaction ID</label>
                    <p className="text-sm text-gray-900 mt-1 font-mono">{selectedTransaction.gatewayTransactionId || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Payment Reference</label>
                    <p className="text-sm text-gray-900 mt-1 font-mono">{selectedTransaction.paymentReference || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Order ID</label>
                    <p className="text-sm text-gray-900 mt-1">{selectedTransaction.orderId}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Order Number</label>
                    <p className="text-sm text-gray-900 mt-1 font-mono">{selectedTransaction.order?.orderNumber || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Transaction Type</label>
                                <Badge variant={getTypeBadgeVariant(selectedTransaction.transactionType)} className="mt-1">
              {formatTransactionType(selectedTransaction.transactionType)}
            </Badge>
                  </div>
                  
                  {/* Financial Information */}
                  <div>
                    <label className="text-sm font-medium text-gray-700">Amount</label>
                    <p className="text-sm text-gray-900 mt-1">
                      {formatAmount(selectedTransaction.amount, selectedTransaction.currencyCode)}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Gateway Charge Fees</label>
                    <p className="text-sm text-gray-900 mt-1">
                      {selectedTransaction.gatewayChargeFees ? 
                        formatAmount(selectedTransaction.gatewayChargeFees, selectedTransaction.currencyCode) : 
                        'N/A'
                      }
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Processed Amount</label>
                    <p className="text-sm text-gray-900 mt-1">
                      {selectedTransaction.processedAmount ? 
                        formatAmount(selectedTransaction.processedAmount, selectedTransaction.currencyCode) : 
                        'N/A'
                      }
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Currency</label>
                    <p className="text-sm text-gray-900 mt-1">{selectedTransaction.currencyCode}</p>
                  </div>
                  
                  {/* Status and Processing */}
                  <div>
                    <label className="text-sm font-medium text-gray-700">Status</label>
                    <Badge variant={getStatusBadgeVariant(selectedTransaction.status)} className="mt-1">
                      {selectedTransaction.status}
                    </Badge>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Paid Through Gateway</label>
                    <Badge variant={selectedTransaction.paidThroughGateway ? "default" : "secondary"} className="mt-1">
                      {selectedTransaction.paidThroughGateway ? 'Yes' : 'No'}
                    </Badge>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Gateway Provider</label>
                    <p className="text-sm text-gray-900 mt-1">{selectedTransaction.gatewayProvider}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Failure Reason</label>
                    <p className="text-sm text-gray-900 mt-1">{selectedTransaction.failureReason || 'N/A'}</p>
                  </div>
                  
                  {/* Timestamps */}
                  <div>
                    <label className="text-sm font-medium text-gray-700">Created</label>
                    <p className="text-sm text-gray-900 mt-1">{formatDate(selectedTransaction.createdAt)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Updated</label>
                    <p className="text-sm text-gray-900 mt-1">{formatDate(selectedTransaction.updatedAt)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Processed At</label>
                    <p className="text-sm text-gray-900 mt-1">
                      {selectedTransaction.processedAt ? formatDate(selectedTransaction.processedAt) : 'N/A'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Order Details */}
            {selectedTransaction.order && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Package className="h-5 w-5" />
                    <span>Order Information</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Order ID</label>
                      <p className="text-sm text-gray-900 mt-1">{selectedTransaction.order.id}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Order Number</label>
                      <p className="text-sm text-gray-900 mt-1 font-mono">{selectedTransaction.order.orderNumber}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Quantity</label>
                      <p className="text-sm text-gray-900 mt-1">{selectedTransaction.order.quantity}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Total Amount</label>
                      <p className="text-sm text-gray-900 mt-1">
                        {formatAmount(selectedTransaction.order.totalAmount, selectedTransaction.currencyCode)}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Order Status</label>
                      <Badge variant={getStatusBadgeVariant(selectedTransaction.order.status)} className="mt-1">
                        {selectedTransaction.order.status}
                      </Badge>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Order Date</label>
                      <p className="text-sm text-gray-900 mt-1">{formatDate(selectedTransaction.order.createdAt)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar - 25% */}
          <div className="space-y-6">
            {/* Gateway Metadata */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <CreditCard className="h-5 w-5" />
                  <span>Gateway Metadata</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Gateway Response */}
                {selectedTransaction.gatewayResponse && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium text-gray-700">Gateway Response</label>
                      <button
                        onClick={() => copyToClipboard(JSON.stringify(selectedTransaction.gatewayResponse, null, 2), 'gateway-response')}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                        title="Copy to clipboard"
                      >
                        {copiedField === 'gateway-response' ? (
                          <Check className="h-3 w-3 text-green-600" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </button>
                    </div>
                    <div className="bg-gray-50 rounded-md p-3 max-h-60 overflow-y-auto">
                      <pre className="text-xs text-gray-800 whitespace-pre-wrap">
                        {JSON.stringify(selectedTransaction.gatewayResponse, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}

                {/* Gateway Request */}
                {selectedTransaction.gatewayRequest && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium text-gray-700">Gateway Request</label>
                      <button
                        onClick={() => copyToClipboard(JSON.stringify(selectedTransaction.gatewayRequest, null, 2), 'gateway-request')}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                        title="Copy to clipboard"
                      >
                        {copiedField === 'gateway-request' ? (
                          <Check className="h-3 w-3 text-green-600" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </button>
                    </div>
                    <div className="bg-gray-50 rounded-md p-3 max-h-60 overflow-y-auto">
                      <pre className="text-xs text-gray-800 whitespace-pre-wrap">
                        {JSON.stringify(selectedTransaction.gatewayRequest, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}

                {/* Payment Method Details */}
                {selectedTransaction.paymentMethod && (
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2">Payment Method</label>
                    <div className="space-y-2">
                      <div>
                        <span className="text-xs text-gray-500">Type:</span>
                        <p className="text-sm text-gray-900">{selectedTransaction.paymentMethod.type}</p>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500">Provider:</span>
                        <p className="text-sm text-gray-900">{selectedTransaction.paymentMethod.provider}</p>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500">Account Name:</span>
                        <p className="text-sm text-gray-900">{selectedTransaction.paymentMethod.accountName}</p>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500">Status:</span>
                        <Badge variant={selectedTransaction.paymentMethod.status === 'ACTIVE' ? 'default' : 'secondary'} className="text-xs">
                          {selectedTransaction.paymentMethod.status}
                        </Badge>
                      </div>
                      {selectedTransaction.paymentMethod.metadata && (
                        <div>
                          <span className="text-xs text-gray-500">Metadata:</span>
                          <div className="bg-gray-50 rounded-md p-2 mt-1">
                            <pre className="text-xs text-gray-800 whitespace-pre-wrap">
                              {JSON.stringify(selectedTransaction.paymentMethod.metadata, null, 2)}
                            </pre>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {!selectedTransaction.gatewayResponse && !selectedTransaction.gatewayRequest && !selectedTransaction.paymentMethod && (
                  <div className="text-center py-4">
                    <p className="text-sm text-gray-500">No gateway metadata available</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Customer Details */}
            {selectedTransaction.customer && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <User className="h-5 w-5" />
                    <span>Customer Details</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Name</label>
                    <p className="text-sm text-gray-900 mt-1">
                      {selectedTransaction.customer.firstName} {selectedTransaction.customer.lastName}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Email</label>
                    <p className="text-sm text-gray-900 mt-1">{selectedTransaction.customer.email}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Phone</label>
                    <p className="text-sm text-gray-900 mt-1">{selectedTransaction.customer.phoneNumber}</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Seller Details */}
            {selectedTransaction.seller && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Store className="h-5 w-5" />
                    <span>Seller Details</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Name</label>
                    <p className="text-sm text-gray-900 mt-1">
                      {selectedTransaction.seller.firstName} {selectedTransaction.seller.lastName}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Email</label>
                    <p className="text-sm text-gray-900 mt-1">{selectedTransaction.seller.email}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Phone</label>
                    <p className="text-sm text-gray-900 mt-1">{selectedTransaction.seller.phoneNumber}</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <CreditCard className="h-5 w-5" />
                <span>Stripe Payment Report</span>
              </CardTitle>
              <CardDescription>
                View and manage Stripe payment transactions
              </CardDescription>
            </div>
            <Button 
              onClick={() => {
                console.log('🔘 Export button clicked!');
                handleExport();
              }} 
              disabled={isExporting}
              className="bg-green-600 hover:bg-green-700 disabled:bg-green-400"
            >
              {isExporting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Export Report
                </>
              )}
            </Button>

          </div>
        </CardHeader>
        <CardContent>
          {/* Filters and Search */}
          <div className="bg-gray-50 rounded-lg p-6 mb-6">
            <div className="space-y-4">
              {/* Search Bar */}
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search by transaction ID, order ID, order number, or amount..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <Button
                  onClick={() => {
                    setCurrentPage(1);
                    loadTransactions();
                  }}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Search
                </Button>
              </div>

              {/* Inline Filters Row */}
              <div className="flex items-end gap-4">
                {/* Status Filter */}
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <Select
                    value={filterStatus}
                    onValueChange={setFilterStatus}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="All Statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="SUCCESS">Success</SelectItem>
                      <SelectItem value="FAILED">Failed</SelectItem>
                      <SelectItem value="PENDING">Pending</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Type Filter */}
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Type
                  </label>
                  <Select
                    value={filterType}
                    onValueChange={setFilterType}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="ORIGINAL">Original</SelectItem>
                      <SelectItem value="FEE">Fee</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Start Date & Time */}
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date & Time</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      type="datetime-local"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="pl-10 bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* End Date & Time */}
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date & Time</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      type="datetime-local"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className="pl-10 bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Reset Button */}
                <Button
                  variant="outline"
                  onClick={() => {
                    const now = new Date();
                    setDateFrom(now.toISOString().slice(0, 16));
                    setDateTo(now.toISOString().slice(0, 16));
                    setFilterStatus('all');
                    setFilterType('all');
                    setSearchQuery('');
                    setCurrentPage(1);
                  }}
                  className="bg-white border-gray-300 hover:bg-gray-50"
                >
                  Reset
                </Button>
              </div>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Success Display */}
          {exportSuccess && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-green-800">Stripe payments report exported successfully!</p>
                </div>
              </div>
            </div>
          )}

          {/* Transactions Table */}
          <div className="overflow-x-auto border border-gray-200 rounded-lg">
            <table className="w-full min-w-[1300px] border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">
                    App Transaction ID
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">
                    Order Number/Request ID
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">
                    Customer
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">
                    Seller
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">
                    Amount
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">
                    Type
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">
                    Access Channel
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">
                    Date
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 whitespace-nowrap sticky right-0 bg-gray-50">
                    Order/Ride Request ID
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 whitespace-nowrap sticky right-0 bg-gray-50">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {transactions.map((transaction) => (
                  <tr key={transaction.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <div className="font-mono text-xs truncate max-w-[120px]" title={transaction.appTransactionId}>
                          {transaction.appTransactionId}
                        </div>
                        <button
                          onClick={() => copyToClipboard(transaction.appTransactionId, `app-${transaction.id}`)}
                          className="text-gray-400 hover:text-gray-600 transition-colors"
                          title="Copy to clipboard"
                        >
                          {copiedField === `app-${transaction.id}` ? (
                            <Check className="h-3 w-3 text-green-600" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <div className="font-mono text-xs truncate max-w-[100px]" title={transaction.appService === 'RIDES' ? transaction.rideRequest?.requestId : transaction.order?.orderNumber}>
                          {transaction.appService === 'RIDES' ? transaction.rideRequest?.requestId : transaction.order?.orderNumber || 'N/A'}
                        </div>
                        {(transaction.appService === 'RIDES' ? transaction.rideRequest?.requestId : transaction.order?.orderNumber) && (
                          <button
                            onClick={() => copyToClipboard(transaction.appService === 'RIDES' ? transaction.rideRequest?.requestId : transaction.order?.orderNumber, `orderNumber-${transaction.id}`)}
                            className="text-gray-400 hover:text-gray-600 transition-colors"
                            title="Copy to clipboard"
                          >
                            {copiedField === `orderNumber-${transaction.id}` ? (
                              <Check className="h-3 w-3 text-green-600" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <div className="truncate max-w-[150px]" title={`${transaction.customer?.firstName} ${transaction.customer?.lastName}`}>
                          <div className="font-medium">
                            {transaction.customer ? 
                              `${transaction.customer.firstName} ${transaction.customer.lastName}` : 
                              'N/A'
                            }
                          </div>
                        </div>
                        {transaction.customer && (
                          <button
                            onClick={() => copyToClipboard(`${transaction.customer.firstName} ${transaction.customer.lastName}`, `customer-${transaction.id}`)}
                            className="text-gray-400 hover:text-gray-600 transition-colors"
                            title="Copy to clipboard"
                          >
                            {copiedField === `customer-${transaction.id}` ? (
                              <Check className="h-3 w-3 text-green-600" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <div className="truncate max-w-[150px]" title={`${transaction.seller?.firstName} ${transaction.seller?.lastName}`}>
                          <div className="font-medium">
                            {transaction.seller ? 
                              `${transaction.seller.firstName} ${transaction.seller.lastName}` : 
                              'N/A'
                            }
                          </div>
                        </div>
                        {transaction.seller && (
                          <button
                            onClick={() => copyToClipboard(`${transaction.seller.firstName} ${transaction.seller.lastName}`, `seller-${transaction.id}`)}
                            className="text-gray-400 hover:text-gray-600 transition-colors"
                            title="Copy to clipboard"
                          >
                            {copiedField === `seller-${transaction.id}` ? (
                              <Check className="h-3 w-3 text-green-600" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">
                      <div className="font-semibold">
                        {formatAmount(transaction.amount, transaction.currencyCode)}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm whitespace-nowrap">
                      <Badge variant={getStatusBadgeVariant(transaction.status)}>
                        {transaction.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-sm whitespace-nowrap">
                                  <Badge variant={getTypeBadgeVariant(transaction.transactionType)}>
              {formatTransactionType(transaction.transactionType)}
            </Badge>
                    </td>
                    <td className="px-6 py-4 text-sm whitespace-nowrap">
                      <Badge variant={getAccessChannelBadgeVariant(transaction.appService)}>
                        {transaction.appService}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">
                      <div>
                        {formatDate(transaction.createdAt)}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 sticky right-0 bg-white hover:bg-gray-50 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <div className="font-mono text-xs truncate max-w-[100px]" title={transaction.appService === 'RIDES' ? transaction.rideRequestId : transaction.orderId}>
                          {transaction.appService === 'RIDES' ? transaction.rideRequestId : transaction.orderId}
                        </div>
                        <button
                          onClick={() => copyToClipboard(transaction.appService === 'RIDES' ? transaction.rideRequestId : transaction.orderId, `order-${transaction.id}`)}
                          className="text-gray-400 hover:text-gray-600 transition-colors"
                          title="Copy to clipboard"
                        >
                          {copiedField === `order-${transaction.id}` ? (
                            <Check className="h-3 w-3 text-green-600" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm sticky right-0 bg-white hover:bg-gray-50 whitespace-nowrap">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleViewDetail(transaction)}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Download className="mr-2 h-4 w-4" />
                            Download Receipt
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalTransactions > 0 && (
            <div className="flex items-center justify-between mt-6">
              <div className="text-sm text-gray-700">
                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalTransactions)} of {totalTransactions} results
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

          {transactions.length === 0 && (
            <div className="text-center py-12">
              <CreditCard className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-4 text-lg font-medium text-gray-900">No Stripe transactions found</h3>
              <p className="mt-2 text-sm text-gray-500">
                No Stripe payment transactions match your current filters.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 