'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Download, X } from 'lucide-react';
import { analyticsApi } from '@/services/api';

interface DrillDownModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'total' | 'ride' | 'ecommerce' | 'external';
  period: string;
  currency: string;
  title: string;
}

interface Transaction {
  id: string;
  type?: string;
  rideId?: string;
  orderNumber?: string;
  amount: number;
  date: string;
  status: string;
  driver?: string;
  customer: string;
  driverPhone?: string;
  customerPhone: string;
  pickupLocation?: any;
  destinationLocation?: any;
  seller?: string;
  sellerPhone?: string;
  productCount?: number;
  distance?: number;
  duration?: number;
  baseFare?: number;
  distanceFare?: number;
  timeFare?: number;
  surgeFare?: number;
  driverEarnings?: number;
  platformFee?: number;
  subtotal?: number;
  taxAmount?: number;
  shippingAmount?: number;
  discountAmount?: number;
  currencyCode?: string;
  // External transaction fields
  appTransactionId?: string;
  transactionType?: string;
  appService?: string;
  gatewayProvider?: string;
  gatewayTransactionId?: string;
  paymentReference?: string;
  processedAt?: string;
}

interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
}

export function DrillDownModal({ isOpen, onClose, type, period, currency, title }: DrillDownModalProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      PENDING: { color: 'bg-yellow-100 text-yellow-800' },
      PAID: { color: 'bg-green-100 text-green-800' },
      SETTLED: { color: 'bg-green-100 text-green-800' },
      CONFIRMED: { color: 'bg-blue-100 text-blue-800' },
      COMPLETED: { color: 'bg-green-100 text-green-800' },
      FAILED: { color: 'bg-red-100 text-red-800' },
      CANCELLED: { color: 'bg-gray-100 text-gray-800' },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || { color: 'bg-gray-100 text-gray-800' };

    return (
      <Badge className={config.color}>
        {status}
      </Badge>
    );
  };

  const loadData = async (page: number = 1) => {
    setLoading(true);
    try {
      let response;
      switch (type) {
        case 'total':
          response = await analyticsApi.getTotalRevenueDetails(period, page.toString(), '10', currency);
          break;
        case 'ride':
          response = await analyticsApi.getRideRevenueDetails(period, page.toString(), '10', currency);
          break;
        case 'ecommerce':
          response = await analyticsApi.getEcommerceRevenueDetails(period, page.toString(), '10', currency);
          break;
        case 'external':
          response = await analyticsApi.getExternalTransactionsDetails(period, page.toString(), '10', currency);
          break;
        default:
          throw new Error('Invalid type');
      }

      setTransactions(response.transactions || []);
      setPagination(response.pagination || null);
    } catch (error) {
      console.error('Error loading drill-down data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setCurrentPage(1);
      loadData(1);
    }
  }, [isOpen, type, period]);

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    loadData(newPage);
  };

  const handleExport = () => {
    // TODO: Implement export functionality
    console.log('Export functionality to be implemented');
  };

  const renderTableHeaders = () => {
    switch (type) {
      case 'total':
        return (
          <>
            <TableHead className="w-[80px]">Type</TableHead>
            <TableHead className="w-[120px]">ID</TableHead>
            <TableHead className="w-[100px]">Amount</TableHead>
            <TableHead className="w-[140px]">Date</TableHead>
            <TableHead className="w-[80px]">Status</TableHead>
            <TableHead className="w-[180px]">Driver/Seller</TableHead>
            <TableHead className="w-[180px]">Customer</TableHead>
          </>
        );
      case 'ride':
        return (
          <>
            <TableHead className="w-[150px]">Ride ID</TableHead>
            <TableHead className="w-[120px]">Amount</TableHead>
            <TableHead className="w-[160px]">Date</TableHead>
            <TableHead className="w-[100px]">Status</TableHead>
            <TableHead className="w-[220px]">Driver</TableHead>
            <TableHead className="w-[220px]">Customer</TableHead>
            <TableHead className="w-[100px]">Distance</TableHead>
            <TableHead className="w-[100px]">Duration</TableHead>
          </>
        );
      case 'ecommerce':
        return (
          <>
            <TableHead className="w-[120px]">Order #</TableHead>
            <TableHead className="w-[100px]">Amount</TableHead>
            <TableHead className="w-[140px]">Date</TableHead>
            <TableHead className="w-[80px]">Status</TableHead>
            <TableHead className="w-[180px]">Seller</TableHead>
            <TableHead className="w-[180px]">Customer</TableHead>
            <TableHead className="w-[80px]">Products</TableHead>
          </>
        );
      case 'external':
        return (
          <>
            <TableHead className="w-[150px]">App Transaction ID</TableHead>
            <TableHead className="w-[100px]">Amount</TableHead>
            <TableHead className="w-[140px]">Date</TableHead>
            <TableHead className="w-[100px]">Type</TableHead>
            <TableHead className="w-[100px]">Service</TableHead>
            <TableHead className="w-[120px]">Gateway</TableHead>
            <TableHead className="w-[180px]">Customer</TableHead>
          </>
        );
      default:
        return null;
    }
  };

  const renderTableRow = (transaction: Transaction) => {
    switch (type) {
      case 'total':
        return (
          <TableRow key={transaction.id}>
            <TableCell>
              <Badge variant={transaction.type === 'RIDE' ? 'default' : 'secondary'} className="text-xs">
                {transaction.type}
              </Badge>
            </TableCell>
            <TableCell className="font-mono text-xs">
              {transaction.type === 'RIDE' ? transaction.rideId : transaction.orderNumber}
            </TableCell>
            <TableCell className="font-medium text-sm">{formatCurrency(transaction.amount)}</TableCell>
            <TableCell className="text-sm">{formatDate(transaction.date)}</TableCell>
            <TableCell>{getStatusBadge(transaction.status)}</TableCell>
            <TableCell>
              <div className="space-y-1">
                <div className="font-medium text-sm">{transaction.driver || transaction.seller}</div>
                <div className="text-xs text-gray-500">{transaction.driverPhone || transaction.sellerPhone}</div>
              </div>
            </TableCell>
            <TableCell>
              <div className="space-y-1">
                <div className="font-medium text-sm">{transaction.customer}</div>
                <div className="text-xs text-gray-500">{transaction.customerPhone}</div>
              </div>
            </TableCell>
          </TableRow>
        );
      case 'ride':
        return (
          <TableRow key={transaction.id}>
            <TableCell className="font-mono text-xs">{transaction.rideId}</TableCell>
            <TableCell className="font-medium text-sm">{formatCurrency(transaction.amount)}</TableCell>
            <TableCell className="text-sm">{formatDate(transaction.date)}</TableCell>
            <TableCell>{getStatusBadge(transaction.status)}</TableCell>
            <TableCell>
              <div className="space-y-1">
                <div className="font-medium text-sm">{transaction.driver}</div>
                <div className="text-xs text-gray-500">{transaction.driverPhone}</div>
              </div>
            </TableCell>
            <TableCell>
              <div className="space-y-1">
                <div className="font-medium text-sm">{transaction.customer}</div>
                <div className="text-xs text-gray-500">{transaction.customerPhone}</div>
              </div>
            </TableCell>
            <TableCell className="text-sm">{transaction.distance ? `${transaction.distance.toFixed(1)} km` : '-'}</TableCell>
            <TableCell className="text-sm">{transaction.duration ? `${Math.round(transaction.duration / 60)} min` : '-'}</TableCell>
          </TableRow>
        );
      case 'ecommerce':
        return (
          <TableRow key={transaction.id}>
            <TableCell className="font-mono text-xs">{transaction.orderNumber}</TableCell>
            <TableCell className="font-medium text-sm">{formatCurrency(transaction.amount)}</TableCell>
            <TableCell className="text-sm">{formatDate(transaction.date)}</TableCell>
            <TableCell>{getStatusBadge(transaction.status)}</TableCell>
            <TableCell>
              <div className="space-y-1">
                <div className="font-medium text-sm">{transaction.seller}</div>
                <div className="text-xs text-gray-500">{transaction.sellerPhone}</div>
              </div>
            </TableCell>
            <TableCell>
              <div className="space-y-1">
                <div className="font-medium text-sm">{transaction.customer}</div>
                <div className="text-xs text-gray-500">{transaction.customerPhone}</div>
              </div>
            </TableCell>
            <TableCell className="text-sm">{transaction.productCount || 0}</TableCell>
          </TableRow>
        );
      case 'external':
        return (
          <TableRow key={transaction.id}>
            <TableCell className="font-mono text-xs">{transaction.appTransactionId}</TableCell>
            <TableCell className="font-medium text-sm">{formatCurrency(transaction.amount)}</TableCell>
            <TableCell className="text-sm">{formatDate(transaction.date)}</TableCell>
            <TableCell>
              <Badge variant="outline" className="text-xs">
                {formatTransactionType(transaction.transactionType || '')}
              </Badge>
            </TableCell>
            <TableCell>
              <Badge variant="secondary" className="text-xs">
                {formatTransactionType(transaction.appService || '')}
              </Badge>
            </TableCell>
            <TableCell className="text-sm">{transaction.gatewayProvider}</TableCell>
            <TableCell>
              <div className="space-y-1">
                <div className="font-medium text-sm">{transaction.customer}</div>
                <div className="text-xs text-gray-500">{transaction.customerPhone}</div>
              </div>
            </TableCell>
          </TableRow>
        );
      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[98vw] w-[1800px] max-h-[95vh] overflow-hidden">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-bold">{title} - Detailed Breakdown</DialogTitle>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" onClick={handleExport}>
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
              <Button variant="outline" size="sm" onClick={onClose}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-lg text-gray-600">Loading detailed data...</div>
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-auto border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      {renderTableHeaders()}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map(renderTableRow)}
                  </TableBody>
                </Table>
              </div>

              {pagination && (
                <div className="flex items-center justify-between border-t pt-4 mt-4">
                  <div className="text-sm text-gray-600">
                    Showing {((pagination.currentPage - 1) * pagination.itemsPerPage) + 1} to{' '}
                    {Math.min(pagination.currentPage * pagination.itemsPerPage, pagination.totalItems)} of{' '}
                    {pagination.totalItems} results
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage <= 1}
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Previous
                    </Button>
                    <div className="text-sm">
                      Page {pagination.currentPage} of {pagination.totalPages}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage >= pagination.totalPages}
                    >
                      Next
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
