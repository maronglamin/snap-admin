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
  ShoppingCart,
  User,
  Store,
  Package,
  ArrowLeft,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Copy,
  Check,
  Truck,
  MapPin,
  Phone,
  Mail,
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
import { ordersApi } from '@/services/api';
import { Order, OrderStatus, PaymentStatus } from '@/types';
import { exportOrdersToCSV, OrderForExport } from '@/utils/csvExport';

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPaymentStatus, setFilterPaymentStatus] = useState('all');
  const [dateFrom, setDateFrom] = useState(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    return startOfMonth.toISOString().slice(0, 16);
  });
  const [dateTo, setDateTo] = useState(() => {
    const now = new Date();
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59);
    return endOfDay.toISOString().slice(0, 16);
  });
  const [showDetail, setShowDetail] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [isGeneratingInvoice, setIsGeneratingInvoice] = useState(false);
  const itemsPerPage = 10;

  // Load orders
  useEffect(() => {
    loadOrders();
  }, [currentPage]);

  const loadOrders = async () => {
    try {
      setIsLoading(true);
      setError('');
      
      // Debug: Get total count first
      try {
        const countResponse = await ordersApi.getOrdersCount();
        console.log('Total Orders in Database:', countResponse.total);
      } catch (err) {
        console.log('Could not get total count:', err);
      }
      
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10',
        search: searchQuery,
        status: filterStatus,
        paymentStatus: filterPaymentStatus,
        dateFrom: dateFrom,
        dateTo: dateTo,
      });

      console.log('Orders API Parameters:', Object.fromEntries(params));

      const response = await ordersApi.getOrders(params);
      
      if (response.success) {
        setOrders(response.data);
        setTotalOrders(response.pagination.total);
        setTotalPages(response.pagination.totalPages);
        console.log('Orders Response:', {
          total: response.pagination.total,
          totalPages: response.pagination.totalPages,
          ordersCount: response.data.length,
          dateFrom,
          dateTo
        });
      } else {
        setError(response.error || 'Failed to load orders');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load orders');
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewDetail = async (order: Order) => {
    try {
      const response = await ordersApi.getOrderById(order.id);
      if (response.success) {
        setSelectedOrder(response.data);
        setShowDetail(true);
      } else {
        setError(response.error || 'Failed to load order details');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load order details');
    }
  };

  const handleDownloadInvoice = async (orderId: string) => {
    try {
      setIsGeneratingInvoice(true);
      const blob = await ordersApi.downloadInvoice(orderId);
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice-${orderId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading invoice:', error);
      // You could add a toast notification here
    } finally {
      setIsGeneratingInvoice(false);
    }
  };

  const handleBackToList = () => {
    setShowDetail(false);
    setSelectedOrder(null);
  };

  const copyToClipboard = async (text: string, fieldName: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'DELIVERED':
      case 'COMPLETED':
        return 'default';
      case 'SHIPPED':
        return 'secondary';
      case 'PENDING':
      case 'CONFIRMED':
        return 'outline';
      case 'CANCELLED':
      case 'REFUNDED':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getPaymentStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'PAID':
      case 'AUTHORIZED':
        return 'default';
      case 'PENDING':
        return 'outline';
      case 'FAILED':
      case 'CANCELLED':
        return 'destructive';
      case 'REFUNDED':
        return 'secondary';
      default:
        return 'outline';
    }
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

  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
    }).format(amount);
  };

  const formatShippingAddress = (address: string) => {
    try {
      // Try to parse as JSON first
      const parsed = JSON.parse(address);
      if (typeof parsed === 'object' && parsed !== null) {
        // If it's an object, format it nicely
        const parts = [];
        if (parsed.street) parts.push(parsed.street);
        if (parsed.city) parts.push(parsed.city);
        if (parsed.state) parts.push(parsed.state);
        if (parsed.postalCode) parts.push(parsed.postalCode);
        if (parsed.country) parts.push(parsed.country);
        return parts.join(', ');
      }
    } catch (e) {
      // If it's not JSON, return as is
    }
    return address;
  };

  const getTotalItemsCount = (orderItems: any[]) => {
    if (!orderItems || orderItems.length === 0) return 0;
    return orderItems.reduce((total, item) => total + (item.quantity || 0), 0);
  };

  const handleExport = async () => {
    try {
      setIsExporting(true);
      setError('');
      
      const params = new URLSearchParams({
        search: searchQuery,
        status: filterStatus,
        paymentStatus: filterPaymentStatus,
        dateFrom: dateFrom,
        dateTo: dateTo,
      });

      const response = await ordersApi.exportOrders(params);
      
      if (response.success) {
        // Transform the data for CSV export
        const exportData: OrderForExport[] = response.data.map((order: Order) => {
          // Parse shipping address properly
          let shippingAddress = '';
          let shippingCity = '';
          let shippingState = '';
          let shippingCountry = '';
          let shippingPostalCode = '';
          
          if (order.shippingAddress) {
            try {
              const parsed = JSON.parse(order.shippingAddress);
              if (typeof parsed === 'object' && parsed !== null) {
                shippingAddress = parsed.address || parsed.street || '';
                shippingCity = parsed.city || '';
                shippingState = parsed.state || '';
                shippingCountry = parsed.country || '';
                shippingPostalCode = parsed.postalCode || '';
              } else {
                shippingAddress = order.shippingAddress;
              }
            } catch (e) {
              shippingAddress = order.shippingAddress;
            }
          }

          return {
            id: order.id,
            orderNumber: order.orderNumber,
            customerName: order.customerName,
            customerEmail: order.customerEmail || '',
            customerPhone: order.customerPhone,
            sellerName: order.seller ? `${order.seller.firstName} ${order.seller.lastName}` : '',
            sellerEmail: '',
            sellerPhone: order.seller?.phoneNumber || '',
            totalAmount: order.totalAmount,
            currencyCode: order.currencyCode,
            status: order.status,
            paymentStatus: order.paymentStatus,
            shippingAddress,
            shippingCity,
            shippingState,
            shippingCountry,
            shippingPostalCode,
            itemsCount: getTotalItemsCount(order.orderItems ?? []),
            createdAt: order.createdAt,
            updatedAt: order.updatedAt,
            shippedAt: order.shippedAt,
            deliveredAt: order.deliveredAt,
            cancelledAt: order.cancelledAt,
          };
        });

        // Generate filename based on filters
        let filename = 'orders-report';
        if (filterStatus !== 'all') filename += `-${filterStatus.toLowerCase()}`;
        if (filterPaymentStatus !== 'all') filename += `-${filterPaymentStatus.toLowerCase()}`;
        if (searchQuery) filename += `-search-${searchQuery.substring(0, 20)}`;

        exportOrdersToCSV(exportData, filename);
        setExportSuccess(true);
        setTimeout(() => setExportSuccess(false), 3001);
      } else {
        setError(response.error || 'Failed to export orders');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to export orders');
    } finally {
      setIsExporting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading orders...</span>
        </div>
      </div>
    );
  }

  if (showDetail && selectedOrder) {
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
              <h1 className="text-2xl font-bold text-gray-900">Order Details</h1>
              <p className="text-gray-600">Order Management</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Main Content - 75% */}
          <div className="col-span-2 space-y-6">
            {/* Order Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <ShoppingCart className="h-5 w-5" />
                  <span>Order Information</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {/* Basic Order Info */}
                  <div>
                    <label className="text-sm font-medium text-gray-700">Order Number</label>
                    <p className="text-sm text-gray-900 mt-1 font-mono">{selectedOrder.orderNumber}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Order ID</label>
                    <p className="text-sm text-gray-900 mt-1 font-mono">{selectedOrder.id}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Status</label>
                    <Badge variant={getStatusBadgeVariant(selectedOrder.status)} className="mt-1">
                      {selectedOrder.status}
                    </Badge>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Payment Status</label>
                    <Badge variant={getPaymentStatusBadgeVariant(selectedOrder.paymentStatus)} className="mt-1">
                      {selectedOrder.paymentStatus}
                    </Badge>
                  </div>
                  
                  {/* Financial Information */}
                  <div>
                    <label className="text-sm font-medium text-gray-700">Subtotal</label>
                    <p className="text-sm text-gray-900 mt-1">
                      {formatAmount(selectedOrder.subtotal, selectedOrder.currencyCode)}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Tax Amount</label>
                    <p className="text-sm text-gray-900 mt-1">
                      {formatAmount(selectedOrder.taxAmount, selectedOrder.currencyCode)}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Shipping Amount</label>
                    <p className="text-sm text-gray-900 mt-1">
                      {formatAmount(selectedOrder.shippingAmount, selectedOrder.currencyCode)}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Discount Amount</label>
                    <p className="text-sm text-gray-900 mt-1">
                      {formatAmount(selectedOrder.discountAmount, selectedOrder.currencyCode)}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Total Amount</label>
                    <p className="text-sm text-gray-900 mt-1 font-semibold">
                      {formatAmount(selectedOrder.totalAmount, selectedOrder.currencyCode)}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Currency</label>
                    <p className="text-sm text-gray-900 mt-1">{selectedOrder.currencyCode}</p>
                  </div>
                  
                  {/* Customer Information */}
                  <div>
                    <label className="text-sm font-medium text-gray-700">Customer Name</label>
                    <p className="text-sm text-gray-900 mt-1">{selectedOrder.customerName}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Customer Phone</label>
                    <p className="text-sm text-gray-900 mt-1">{selectedOrder.customerPhone}</p>
                  </div>
                  {selectedOrder.customerEmail && (
                    <div>
                      <label className="text-sm font-medium text-gray-700">Customer Email</label>
                      <p className="text-sm text-gray-900 mt-1">{selectedOrder.customerEmail}</p>
                    </div>
                  )}
                  
                  {/* Shipping Information */}
                  <div>
                    <label className="text-sm font-medium text-gray-700">Shipping Address</label>
                    <p className="text-sm text-gray-900 mt-1">{formatShippingAddress(selectedOrder.shippingAddress)}</p>
                  </div>
                  {selectedOrder.billingAddress && (
                    <div>
                      <label className="text-sm font-medium text-gray-700">Billing Address</label>
                      <p className="text-sm text-gray-900 mt-1">{formatShippingAddress(selectedOrder.billingAddress)}</p>
                    </div>
                  )}
                  {selectedOrder.shippingMethod && (
                    <div>
                      <label className="text-sm font-medium text-gray-700">Shipping Method</label>
                      <p className="text-sm text-gray-900 mt-1">{selectedOrder.shippingMethod}</p>
                    </div>
                  )}
                  {selectedOrder.trackingNumber && (
                    <div>
                      <label className="text-sm font-medium text-gray-700">Tracking Number</label>
                      <p className="text-sm text-gray-900 mt-1 font-mono">{selectedOrder.trackingNumber}</p>
                    </div>
                  )}
                  
                  {/* Timestamps */}
                  <div>
                    <label className="text-sm font-medium text-gray-700">Created</label>
                    <p className="text-sm text-gray-900 mt-1">{formatDate(selectedOrder.createdAt)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Updated</label>
                    <p className="text-sm text-gray-900 mt-1">{formatDate(selectedOrder.updatedAt)}</p>
                  </div>
                  {selectedOrder.paidAt && (
                    <div>
                      <label className="text-sm font-medium text-gray-700">Paid At</label>
                      <p className="text-sm text-gray-900 mt-1">{formatDate(selectedOrder.paidAt)}</p>
                    </div>
                  )}
                  {selectedOrder.shippedAt && (
                    <div>
                      <label className="text-sm font-medium text-gray-700">Shipped At</label>
                      <p className="text-sm text-gray-900 mt-1">{formatDate(selectedOrder.shippedAt)}</p>
                    </div>
                  )}
                  {selectedOrder.deliveredAt && (
                    <div>
                      <label className="text-sm font-medium text-gray-700">Delivered At</label>
                      <p className="text-sm text-gray-900 mt-1">{formatDate(selectedOrder.deliveredAt)}</p>
                    </div>
                  )}
                  {selectedOrder.cancelledAt && (
                    <div>
                      <label className="text-sm font-medium text-gray-700">Cancelled At</label>
                      <p className="text-sm text-gray-900 mt-1">{formatDate(selectedOrder.cancelledAt)}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Order Items */}
            {selectedOrder.orderItems && selectedOrder.orderItems.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Package className="h-5 w-5" />
                    <span>Order Items</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {selectedOrder.orderItems.map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center space-x-4">
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900">{item.product?.title || 'Product'}</h4>
                            <p className="text-sm text-gray-500">Quantity: {item.quantity}</p>
                            <p className="text-sm text-gray-500">Unit Price: {formatAmount(item.unitPrice, selectedOrder.currencyCode)}</p>
                            <p className="text-sm text-gray-500">Status: {item.status}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-gray-900">
                            {formatAmount(item.totalPrice, selectedOrder.currencyCode)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Transactions */}
            {selectedOrder.externalTransactions && selectedOrder.externalTransactions.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <DollarSign className="h-5 w-5" />
                    <span>Payment Transactions</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {selectedOrder.externalTransactions.map((transaction) => (
                      <div key={transaction.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <h4 className="font-medium text-gray-900">{transaction.appTransactionId}</h4>
                            <Badge variant={getStatusBadgeVariant(transaction.status)}>
                              {transaction.status}
                            </Badge>
                            <Badge variant="outline">{transaction.transactionType}</Badge>
                          </div>
                          <p className="text-sm text-gray-500">Gateway: {transaction.gatewayProvider}</p>
                          <p className="text-sm text-gray-500">Amount: {formatAmount(transaction.amount, transaction.currencyCode)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar - 25% */}
          <div className="space-y-6">
            {/* Customer Details */}
            {selectedOrder.user && (
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
                      {selectedOrder.user.firstName} {selectedOrder.user.lastName}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Phone</label>
                    <p className="text-sm text-gray-900 mt-1">{selectedOrder.user.phoneNumber}</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Seller Details */}
            {selectedOrder.seller && (
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
                      {selectedOrder.seller.firstName} {selectedOrder.seller.lastName}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Phone</label>
                    <p className="text-sm text-gray-900 mt-1">{selectedOrder.seller.phoneNumber}</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Notes */}
            {(selectedOrder.notes || selectedOrder.sellerNotes) && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Package className="h-5 w-5" />
                    <span>Notes</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {selectedOrder.notes && (
                    <div>
                      <label className="text-sm font-medium text-gray-700">Customer Notes</label>
                      <p className="text-sm text-gray-900 mt-1">{selectedOrder.notes}</p>
                    </div>
                  )}
                  {selectedOrder.sellerNotes && (
                    <div>
                      <label className="text-sm font-medium text-gray-700">Seller Notes</label>
                      <p className="text-sm text-gray-900 mt-1">{selectedOrder.sellerNotes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Product Snapshots */}
            {selectedOrder.orderItems && selectedOrder.orderItems.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Package className="h-5 w-5" />
                    <span>Product Snapshots</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {selectedOrder.orderItems.map((item, index) => (
                    <div key={item.id} className="border rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-medium text-gray-900">
                          Item {index + 1}: {item.product?.title || 'Product'}
                        </h4>
                        <Badge variant="outline" className="text-xs">
                          Qty: {item.quantity}
                        </Badge>
                      </div>
                      
                      {item.productSnapshot && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-500">Unit Price:</span>
                            <span className="text-xs font-medium">
                              {formatAmount(item.unitPrice, selectedOrder.currencyCode)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-500">Total Price:</span>
                            <span className="text-xs font-medium">
                              {formatAmount(item.totalPrice, selectedOrder.currencyCode)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-500">Status:</span>
                            <Badge variant={getStatusBadgeVariant(item.status)} className="text-xs">
                              {item.status}
                            </Badge>
                          </div>
                          
                          {/* Product Snapshot Details */}
                          <div className="mt-3 pt-2 border-t">
                            <details className="text-xs">
                              <summary className="cursor-pointer text-gray-600 hover:text-gray-800">
                                View Product Snapshot
                              </summary>
                              <div className="mt-2 bg-gray-50 rounded p-2">
                                <pre className="text-xs text-gray-800 whitespace-pre-wrap overflow-x-auto">
                                  {JSON.stringify(item.productSnapshot, null, 2)}
                                </pre>
                              </div>
                            </details>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
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
                <ShoppingCart className="h-5 w-5" />
                <span>Order Management</span>
              </CardTitle>
              <CardDescription>
                View and manage all orders with comprehensive filtering and search
              </CardDescription>
            </div>
            <Button 
              onClick={handleExport} 
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
                  Export Orders
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
                    placeholder="Search by order number, customer name, phone, or amount..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <Button
                  onClick={() => {
                    setCurrentPage(1);
                    loadOrders();
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
                    Order Status
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
                      <SelectItem value="PENDING">Pending</SelectItem>
                      <SelectItem value="CONFIRMED">Confirmed</SelectItem>
                      <SelectItem value="SHIPPED">Shipped</SelectItem>
                      <SelectItem value="DELIVERED">Delivered</SelectItem>
                      <SelectItem value="CANCELLED">Cancelled</SelectItem>
                      <SelectItem value="REFUNDED">Refunded</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Payment Status Filter */}
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Payment Status
                  </label>
                  <Select
                    value={filterPaymentStatus}
                    onValueChange={setFilterPaymentStatus}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="All Payment Statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Payment Statuses</SelectItem>
                      <SelectItem value="PENDING">Pending</SelectItem>
                      <SelectItem value="AUTHORIZED">Authorized</SelectItem>
                      <SelectItem value="PAID">Paid</SelectItem>
                      <SelectItem value="FAILED">Failed</SelectItem>
                      <SelectItem value="REFUNDED">Refunded</SelectItem>
                      <SelectItem value="CANCELLED">Cancelled</SelectItem>
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
                    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
                    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59);
                    setDateFrom(startOfMonth.toISOString().slice(0, 16));
                    setDateTo(endOfDay.toISOString().slice(0, 16));
                    setFilterStatus('all');
                    setFilterPaymentStatus('all');
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
                  <p className="text-sm text-green-800">Orders report exported successfully!</p>
                </div>
              </div>
            </div>
          )}
          
          {/* Generating Invoice Feedback */}
          {isGeneratingInvoice && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                <p className="text-sm text-blue-800">Generating invoice file...</p>
              </div>
            </div>
          )}

          {/* Orders Table */}
          <div className="overflow-x-auto border border-gray-200 rounded-lg">
            <table className="w-full min-w-[1200px] border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">
                    Order Number
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">
                    Customer
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">
                    Seller
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">
                    Total Amount
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">
                    Order Status
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">
                    Payment Status
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">
                    Items
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">
                    Date
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 whitespace-nowrap sticky right-0 bg-gray-50">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <div className="font-mono text-xs truncate max-w-[120px]" title={order.orderNumber}>
                          {order.orderNumber}
                        </div>
                        <button
                          onClick={() => copyToClipboard(order.orderNumber, `order-${order.id}`)}
                          className="text-gray-400 hover:text-gray-600 transition-colors"
                          title="Copy to clipboard"
                        >
                          {copiedField === `order-${order.id}` ? (
                            <Check className="h-3 w-3 text-green-600" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <div className="truncate max-w-[150px]" title={order.customerName}>
                          <div className="font-medium">{order.customerName}</div>
                          <div className="text-xs text-gray-500">{order.customerPhone}</div>
                        </div>
                        <button
                          onClick={() => copyToClipboard(order.customerName, `customer-${order.id}`)}
                          className="text-gray-400 hover:text-gray-600 transition-colors"
                          title="Copy to clipboard"
                        >
                          {copiedField === `customer-${order.id}` ? (
                            <Check className="h-3 w-3 text-green-600" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">
                      <div className="truncate max-w-[150px]" title={`${order.seller?.firstName} ${order.seller?.lastName}`}>
                        <div className="font-medium">
                          {order.seller ? 
                            `${order.seller.firstName} ${order.seller.lastName}` : 
                            'N/A'
                          }
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">
                      <div className="font-semibold">
                        {formatAmount(order.totalAmount, order.currencyCode)}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm whitespace-nowrap">
                      <Badge variant={getStatusBadgeVariant(order.status)}>
                        {order.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-sm whitespace-nowrap">
                      <Badge variant={getPaymentStatusBadgeVariant(order.paymentStatus)}>
                        {order.paymentStatus}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">
                      <div className="flex items-center space-x-1">
                        <Package className="h-4 w-4" />
                        <span>{getTotalItemsCount(order.orderItems ?? [])} items</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">
                      <div>
                        {formatDate(order.createdAt)}
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
                          <DropdownMenuItem onClick={() => handleViewDetail(order)}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDownloadInvoice(order.id)}>
                            <Download className="mr-2 h-4 w-4" />
                            Download Invoice
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
          {totalOrders > 0 && (
            <div className="flex items-center justify-between mt-6">
              <div className="text-sm text-gray-700">
                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalOrders)} of {totalOrders} results
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

          {orders.length === 0 && (
            <div className="text-center py-12">
              <ShoppingCart className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-4 text-lg font-medium text-gray-900">No orders found</h3>
              <p className="mt-2 text-sm text-gray-500">
                No orders match your current filters.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 