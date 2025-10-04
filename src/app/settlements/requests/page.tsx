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
  Filter,
  Calendar,
  DollarSign,
  Package,
  ArrowLeft,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Copy,
  Check,
  Edit,
  X,
  AlertTriangle,
  FileText,
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { apiService } from '@/services/api';
import { Settlement, SettlementStatus } from '@/types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function SettlementRequestsPage() {
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [selectedSettlement, setSelectedSettlement] = useState<Settlement | null>(null);
  const [orderDetails, setOrderDetails] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
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
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showDetail, setShowDetail] = useState(false);
  const [showUpdateStatus, setShowUpdateStatus] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [newStatus, setNewStatus] = useState<SettlementStatus>(SettlementStatus.PENDING);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  
  // Bulk selection state
  const [selectedSettlements, setSelectedSettlements] = useState<Set<string>>(new Set());
  const [isSelectAll, setIsSelectAll] = useState(false);
  const [showBulkUpdate, setShowBulkUpdate] = useState(false);
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalSettlements, setTotalSettlements] = useState(0);
  const itemsPerPage = 10;

  // Load settlements
  useEffect(() => {
    loadSettlements();
  }, [currentPage]);

  // Bulk selection functions
  const handleSelectAll = () => {
    if (isSelectAll) {
      setSelectedSettlements(new Set());
      setIsSelectAll(false);
    } else {
      const allIds = new Set(settlements.map(s => s.id));
      setSelectedSettlements(allIds);
      setIsSelectAll(true);
    }
  };

  const handleSelectSettlement = (settlementId: string) => {
    const newSelected = new Set(selectedSettlements);
    if (newSelected.has(settlementId)) {
      newSelected.delete(settlementId);
    } else {
      newSelected.add(settlementId);
    }
    setSelectedSettlements(newSelected);
    
    // Update select all state
    if (newSelected.size === settlements.length) {
      setIsSelectAll(true);
    } else {
      setIsSelectAll(false);
    }
  };

  const handleBulkStatusUpdate = async () => {
    if (selectedSettlements.size === 0) return;
    
    try {
      setIsBulkUpdating(true);
      setError('');
      
      const response = await apiService.bulkUpdateSettlementStatus(
        Array.from(selectedSettlements),
        newStatus
      );
      
      if (response.success) {
        setSuccessMessage(`Successfully updated ${selectedSettlements.size} settlement(s) to ${newStatus}`);
        setSelectedSettlements(new Set());
        setIsSelectAll(false);
        setShowBulkUpdate(false);
        loadSettlements(); // Reload to get updated data
      } else {
        setError(response.error || 'Failed to update settlements');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update settlements');
    } finally {
      setIsBulkUpdating(false);
    }
  };

  const loadSettlements = async () => {
    try {
      setIsLoading(true);
      setError('');
      setSuccessMessage(''); // Clear success message on new search
      
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10',
        search: searchQuery,
        status: filterStatus !== 'all' ? filterStatus : '',
        dateFrom: dateFrom,
        dateTo: dateTo,
      });

      const response = await apiService.getSettlements(params);
      
      setSettlements(response.data || []);
      setTotalSettlements(response.pagination?.total || 0);
      setTotalPages(response.pagination?.totalPages || 1);
    } catch (error) {
      console.error('Error loading settlements:', error);
      setError('Failed to load settlements');
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewDetail = async (settlement: Settlement) => {
    try {
      const response = await apiService.getSettlementById(settlement.id);
      setSelectedSettlement(response.data);
      
      // Fetch order details for included orders
      if (response.data.includedOrderIds && response.data.includedOrderIds.length > 0) {
        const orderPromises = response.data.includedOrderIds.map(orderId => 
          apiService.getOrderById(orderId)
        );
        const orderResponses = await Promise.all(orderPromises);
        // Extract the actual order data from the API responses
        const orders = orderResponses.map(response => response.data);
        setOrderDetails(orders);
      } else {
        setOrderDetails([]);
      }
      
      setShowDetail(true);
    } catch (error) {
      console.error('Error loading settlement details:', error);
      setError('Failed to load settlement details');
    }
  };

  const handleUpdateStatus = (settlement: Settlement) => {
    setSelectedSettlement(settlement);
    setNewStatus(settlement.status);
    setShowUpdateStatus(true);
  };

  const handleStatusUpdate = async () => {
    if (!selectedSettlement) return;
    
    try {
      setIsUpdatingStatus(true);
      setError('');
      setSuccessMessage('');
      
      await apiService.updateSettlementStatus(selectedSettlement.id, newStatus);
      
      setSuccessMessage(`Settlement status updated to ${newStatus} successfully`);
      setShowUpdateStatus(false);
      setSelectedSettlement(null);
      
      // Refresh the list after a short delay to show success message
      setTimeout(() => {
        loadSettlements();
        setSuccessMessage('');
      }, 1000);
    } catch (error) {
      console.error('Error updating settlement status:', error);
      setError('Failed to update settlement status');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleBackToList = () => {
    setShowDetail(false);
    setShowUpdateStatus(false);
    setSelectedSettlement(null);
    setOrderDetails([]);
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

  const getStatusBadgeVariant = (status: SettlementStatus) => {
    switch (status) {
      case SettlementStatus.COMPLETED:
        return 'default';
      case SettlementStatus.PENDING:
        return 'secondary';
      case SettlementStatus.PROCESSING:
        return 'outline';
      case SettlementStatus.FAILED:
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const formatDate = (dateString: string | Date) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
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
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
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

  const handleSearch = () => {
    setCurrentPage(1);
    loadSettlements();
  };

  const handleReset = () => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59);
    
    setDateFrom(startOfMonth.toISOString().slice(0, 16));
    setDateTo(endOfDay.toISOString().slice(0, 16));
    setFilterStatus('all');
    setSearchQuery('');
    setCurrentPage(1);
    loadSettlements();
  };

  const generatePDF = async () => {
    if (!selectedSettlement) return;

    setIsGeneratingPDF(true);
    
    try {
      const doc = new jsPDF();
    
    // Set document properties
    doc.setProperties({
      title: `Snap Settlement Report - ${selectedSettlement.reference}`,
      subject: 'Settlement Payment Summary',
      author: 'Snap Admin Panel',
      creator: 'Snap Marketplace'
    });

    // Header
    doc.setFillColor(59, 130, 246); // Blue color
    doc.rect(0, 0, 210, 30, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('Snap Settlement Report', 105, 15, { align: 'center' });
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generated on ${new Date().toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })}`, 105, 25, { align: 'center' });

    // Reset text color
    doc.setTextColor(0, 0, 0);
    
    let yPosition = 45;

    // Settlement Information
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Settlement Information', 20, yPosition);
    yPosition += 10;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(`Reference: ${selectedSettlement.reference}`, 20, yPosition);
    yPosition += 7;
    doc.text(`Status: ${selectedSettlement.status}`, 20, yPosition);
    yPosition += 7;
    doc.text(`Type: ${selectedSettlement.type}`, 20, yPosition);
    yPosition += 7;
    doc.text(`Created: ${formatDate(selectedSettlement.createdAt)}`, 20, yPosition);
    yPosition += 7;
    if (selectedSettlement.processedAt) {
      doc.text(`Processed: ${formatDate(selectedSettlement.processedAt)}`, 20, yPosition);
      yPosition += 7;
    }
    yPosition += 5;

    // Financial Summary
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Financial Summary', 20, yPosition);
    yPosition += 10;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    
    // Create a summary table
    const summaryData = [
      ['Total Amount', formatAmount(selectedSettlement.amount, selectedSettlement.currency)],
      ['Net Amount (Before Fees)', formatAmount(selectedSettlement.netAmountBeforeFees, selectedSettlement.currency)],
      ['Service Fees Deducted', formatAmount(selectedSettlement.serviceFeesDeducted, selectedSettlement.currency)],
      ['Total Orders', selectedSettlement.totalOrdersCount.toString()],
    ];

    autoTable(doc, {
      startY: yPosition,
      head: [['Description', 'Amount']],
      body: summaryData,
      theme: 'grid',
      headStyles: { 
        fillColor: [59, 130, 246],
        textColor: [255, 255, 255],
        fontStyle: 'bold'
      },
      styles: {
        fontSize: 10,
        cellPadding: 5
      },
      columnStyles: {
        0: { fontStyle: 'bold' },
        1: { halign: 'right' }
      }
    });

    yPosition = (doc as any).lastAutoTable.finalY + 15;

    // Order Details Section
    if (orderDetails.length > 0) {
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('Included Orders', 20, yPosition);
      yPosition += 10;

      // Prepare order data for table
      const orderTableData = orderDetails.map((order: any) => {
        const originalTransaction = order.externalTransactions?.find((t: any) => t.transactionType === 'ORIGINAL');
        const serviceFeeTransaction = order.externalTransactions?.find((t: any) => t.transactionType === 'SERVICE_FEE');
        const feeTransaction = order.externalTransactions?.find((t: any) => t.transactionType === 'FEE');
        
        return [
          order.orderNumber,
          order.customerPhone || 'N/A',
          order.status,
          originalTransaction ? formatAmount(originalTransaction.amount, originalTransaction.currencyCode) : 'N/A',
          serviceFeeTransaction ? formatAmount(serviceFeeTransaction.amount, serviceFeeTransaction.currencyCode) : 'N/A',
          feeTransaction ? formatAmount(feeTransaction.amount, feeTransaction.currencyCode) : 'N/A'
        ];
      });

      autoTable(doc, {
        startY: yPosition,
        head: [['Order #', 'Customer Phone', 'Status', 'Paid Amount', 'Service Fee', 'Gateway Fee']],
        body: orderTableData,
        theme: 'grid',
        headStyles: { 
          fillColor: [59, 130, 246],
          textColor: [255, 255, 255],
          fontStyle: 'bold'
        },
        styles: {
          fontSize: 9,
          cellPadding: 3
        },
        columnStyles: {
          0: { fontStyle: 'bold' },
          3: { halign: 'right' },
          4: { halign: 'right' },
          5: { halign: 'right' }
        }
      });

      yPosition = (doc as any).lastAutoTable.finalY + 15;
    }

    // Footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(10);
      doc.setTextColor(128, 128, 128);
      doc.text(`Page ${i} of ${pageCount}`, 105, 290, { align: 'center' });
      doc.text('Snap - Settlement Report', 105, 295, { align: 'center' });
    }

    // Save the PDF
    doc.save(`Snap_Settlement_Report_${selectedSettlement.reference}_${new Date().toISOString().split('T')[0]}.pdf`);
    
    // Show success message
    setSuccessMessage('PDF report generated successfully');
    setTimeout(() => setSuccessMessage(''), 3001);
    } catch (error) {
      console.error('Error generating PDF:', error);
      setError('Failed to generate PDF report');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  if (isLoading && settlements.length === 0) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading settlements...</span>
        </div>
      </div>
    );
  }

  if (showDetail && selectedSettlement) {
    return (
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" onClick={handleBackToList}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to List
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Settlement Details</h1>
              <p className="text-gray-600">Settlement Reference: {selectedSettlement.reference}</p>
            </div>
          </div>
          <Button 
            onClick={generatePDF} 
            className="bg-blue-600 hover:bg-blue-700"
            disabled={!selectedSettlement || isGeneratingPDF}
          >
            {isGeneratingPDF ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating PDF...
              </>
            ) : (
              <>
                <FileText className="mr-2 h-4 w-4" />
                Export PDF
              </>
            )}
          </Button>
        </div>

        {/* Settlement Details */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <DollarSign className="h-5 w-5" />
                <span>Financial Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-500">Amount</Label>
                  <p className="text-lg font-semibold">
                    {formatAmount(selectedSettlement.amount, selectedSettlement.currency)}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Net Amount</Label>
                  <p className="text-lg font-semibold">
                    {formatAmount(selectedSettlement.netAmountBeforeFees, selectedSettlement.currency)}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Service Fees</Label>
                  <p className="text-sm">
                    {formatAmount(selectedSettlement.serviceFeesDeducted, selectedSettlement.currency)}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Status</Label>
                  <Badge variant={getStatusBadgeVariant(selectedSettlement.status)}>
                    {selectedSettlement.status}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Package className="h-5 w-5" />
                <span>Settlement Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <Label className="text-sm font-medium text-gray-500">Reference</Label>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-mono">{selectedSettlement.reference}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(selectedSettlement.reference, 'reference')}
                    >
                      {copiedField === 'reference' ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <Label className="text-sm font-medium text-gray-500">Type</Label>
                  <Badge variant="outline">{selectedSettlement.type}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <Label className="text-sm font-medium text-gray-500">Orders Count</Label>
                  <span className="text-sm">{selectedSettlement.totalOrdersCount}</span>
                </div>
                <div className="flex justify-between items-center">
                  <Label className="text-sm font-medium text-gray-500">Created</Label>
                  <span className="text-sm">{formatDate(selectedSettlement.createdAt)}</span>
                </div>
                {selectedSettlement.processedAt && (
                  <div className="flex justify-between items-center">
                    <Label className="text-sm font-medium text-gray-500">Processed</Label>
                    <span className="text-sm">{formatDate(selectedSettlement.processedAt)}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Order Details */}
        {orderDetails.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Included Orders</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {orderDetails.map((order, index) => {
                  const originalTransaction = order.externalTransactions?.find((t: any) => t.transactionType === 'ORIGINAL');
                  const feeTransaction = order.externalTransactions?.find((t: any) => t.transactionType === 'FEE');
                  const serviceFeeTransaction = order.externalTransactions?.find((t: any) => t.transactionType === 'SERVICE_FEE');
                  
                  return (
                    <div key={order.id} className="border rounded-lg p-4 bg-gray-50">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-gray-900">Order #{order.orderNumber}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(order.orderNumber, `order-${index}`)}
                          >
                            {copiedField === `order-${index}` ? (
                              <Check className="h-4 w-4 text-green-600" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                        <Badge variant="outline">{order.status}</Badge>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <Label className="text-xs font-medium text-gray-500">Paid Amount</Label>
                          <p className="font-semibold">
                            {originalTransaction ? formatAmount(originalTransaction.amount, originalTransaction.currencyCode) : 'N/A'}
                          </p>
                        </div>
                        <div>
                          <Label className="text-xs font-medium text-gray-500">Service Fee</Label>
                          <p className="font-semibold">
                            {serviceFeeTransaction ? formatAmount(serviceFeeTransaction.amount, serviceFeeTransaction.currencyCode) : 'N/A'}
                          </p>
                        </div>
                        <div>
                          <Label className="text-xs font-medium text-gray-500">Gateway Fee</Label>
                          <p className="font-semibold">
                            {feeTransaction ? formatAmount(feeTransaction.amount, feeTransaction.currencyCode) : 'N/A'}
                          </p>
                        </div>
                      </div>
                      
                      {order.externalTransactions && order.externalTransactions.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <Label className="text-xs font-medium text-gray-500">Transaction Details</Label>
                          <div className="space-y-1 mt-1">
                            {order.externalTransactions.map((transaction: any, tIndex: number) => (
                              <div key={transaction.id} className="flex justify-between text-xs">
                                <span className="text-gray-600">{formatTransactionType(transaction.transactionType)}</span>
                                <span className="font-mono">
                                  {formatAmount(transaction.amount, transaction.currencyCode)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Settlement Requests</h1>
          <p className="text-gray-600 mt-2">Manage and track settlement requests</p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Filter className="h-5 w-5" />
            <span>Filters</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-1">Start Date & Time</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="datetime-local"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-1">End Date & Time</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="datetime-local"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-1">Status</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value={SettlementStatus.PENDING}>Pending</SelectItem>
                  <SelectItem value={SettlementStatus.PROCESSING}>Processing</SelectItem>
                  <SelectItem value={SettlementStatus.COMPLETED}>Completed</SelectItem>
                  <SelectItem value={SettlementStatus.FAILED}>Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-1">Search</Label>
              <Input
                placeholder="Search by reference or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSearch} className="bg-blue-600 hover:bg-blue-700">
              <Search className="mr-2 h-4 w-4" />
              Search
            </Button>
            <Button variant="outline" onClick={handleReset}>
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-700">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Success Message Display */}
      {successMessage && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Check className="h-4 w-4 text-green-600" />
              <p className="text-green-700">{successMessage}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Settlements Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Settlements</CardTitle>
              <CardDescription>
                Showing {settlements.length} of {totalSettlements} settlements
              </CardDescription>
            </div>
            {selectedSettlements.size > 0 && (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">
                  {selectedSettlements.size} selected
                </span>
                <Button
                  onClick={() => setShowBulkUpdate(true)}
                  className="bg-blue-600 hover:bg-blue-700"
                  size="sm"
                >
                  <Edit className="mr-2 h-4 w-4" />
                  Update Status
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              <span>Loading settlements...</span>
            </div>
          ) : settlements.length === 0 ? (
            <div className="text-center py-8">
              <Package className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-4 text-lg font-medium text-gray-900">No settlements found</h3>
              <p className="mt-2 text-sm text-gray-500">
                Try adjusting your search criteria or date range.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Select All Row */}
              <div className="flex items-center space-x-4 p-4 border rounded-lg bg-gray-50">
                <Checkbox
                  checked={isSelectAll}
                  onCheckedChange={handleSelectAll}
                />
                <span className="text-sm font-medium text-gray-700">
                  Select All ({settlements.length})
                </span>
              </div>
              
              {settlements.map((settlement) => (
                <div
                  key={settlement.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-center space-x-4">
                    <Checkbox
                      checked={selectedSettlements.has(settlement.id)}
                      onCheckedChange={() => handleSelectSettlement(settlement.id)}
                    />
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <DollarSign className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">{settlement.reference}</h3>
                      <p className="text-sm text-gray-500">
                        {formatAmount(settlement.amount, settlement.currency)} • {settlement.type}
                      </p>
                      <p className="text-xs text-gray-400">
                        Created: {formatDate(settlement.createdAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant={getStatusBadgeVariant(settlement.status)}>
                      {settlement.status}
                    </Badge>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleViewDetail(settlement)}>
                          <Eye className="mr-2 h-4 w-4" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleUpdateStatus(settlement)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Update Status
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <div className="text-sm text-gray-500">
                Page {currentPage} of {totalPages}
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Update Status Sheet */}
      <Sheet open={showUpdateStatus} onOpenChange={setShowUpdateStatus}>
        <SheetContent side="right" className="w-[400px] sm:w-[500px] p-0">
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <SheetTitle className="text-xl font-semibold text-gray-900">
                  Update Settlement Status
                </SheetTitle>
                <SheetDescription className="text-sm text-gray-600 mt-1">
                  Settlement: {selectedSettlement?.reference}
                </SheetDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowUpdateStatus(false)}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Content */}
            <div className="flex-1 p-6 space-y-6">
              {/* Current Status Display */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Current Status</Label>
                    <p className="text-sm text-gray-500 mt-1">
                      {selectedSettlement?.status || 'Unknown'}
                    </p>
                  </div>
                  <Badge variant={getStatusBadgeVariant(selectedSettlement?.status || SettlementStatus.PENDING)}>
                    {selectedSettlement?.status || 'Unknown'}
                  </Badge>
                </div>
              </div>

              {/* Settlement Details */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Amount</Label>
                    <p className="text-lg font-semibold text-gray-900 mt-1">
                      {selectedSettlement ? formatAmount(selectedSettlement.amount, selectedSettlement.currency) : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Type</Label>
                    <Badge variant="outline" className="mt-1">
                      {selectedSettlement?.type || 'N/A'}
                    </Badge>
                  </div>
                </div>
                
                <div>
                  <Label className="text-sm font-medium text-gray-700">Created</Label>
                  <p className="text-sm text-gray-600 mt-1">
                    {selectedSettlement ? formatDate(selectedSettlement.createdAt) : 'N/A'}
                  </p>
                </div>
              </div>

              {/* Status Update Form */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="status" className="text-sm font-medium text-gray-700">
                    New Status
                  </Label>
                  <Select 
                    value={newStatus} 
                    onValueChange={(value) => setNewStatus(value as SettlementStatus)}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Select new status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={SettlementStatus.PENDING}>
                        <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                          <span>Pending</span>
                        </div>
                      </SelectItem>
                      <SelectItem value={SettlementStatus.PROCESSING}>
                        <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          <span>Processing</span>
                        </div>
                      </SelectItem>
                      <SelectItem value={SettlementStatus.COMPLETED}>
                        <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span>Completed</span>
                        </div>
                      </SelectItem>
                      <SelectItem value={SettlementStatus.FAILED}>
                        <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                          <span>Failed</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Status Change Warning */}
                {selectedSettlement && newStatus !== selectedSettlement.status && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      <AlertTriangle className="h-5 w-5 text-blue-600 mt-0.5" />
                      <div>
                        <h4 className="text-sm font-medium text-blue-900">Status Change</h4>
                        <p className="text-sm text-blue-700 mt-1">
                          You are about to change the status from{' '}
                          <span className="font-medium">{selectedSettlement.status}</span> to{' '}
                          <span className="font-medium">{newStatus}</span>.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-gray-200 p-6">
              <div className="flex space-x-3">
                <Button
                  onClick={handleStatusUpdate}
                  disabled={isUpdatingStatus || !selectedSettlement || newStatus === selectedSettlement?.status}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  {isUpdatingStatus ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      Update Status
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowUpdateStatus(false)}
                  disabled={isUpdatingStatus}
                  className="px-6"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Bulk Update Status Sheet */}
      <Sheet open={showBulkUpdate} onOpenChange={setShowBulkUpdate}>
        <SheetContent side="right" className="w-[400px] sm:w-[500px] p-0">
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <SheetTitle className="text-xl font-semibold text-gray-900">
                  Bulk Update Settlement Status
                </SheetTitle>
                <SheetDescription className="text-sm text-gray-600 mt-1">
                  {selectedSettlements.size} settlement(s) selected
                </SheetDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowBulkUpdate(false)}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Content */}
            <div className="flex-1 p-6 space-y-6">
              {/* Selected Settlements Info */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-medium text-blue-900">Bulk Update</h4>
                    <p className="text-sm text-blue-700 mt-1">
                      You are about to update the status of {selectedSettlements.size} settlement(s).
                      This action cannot be undone.
                    </p>
                  </div>
                </div>
              </div>

              {/* Status Update Form */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="bulk-status" className="text-sm font-medium text-gray-700">
                    New Status
                  </Label>
                  <Select 
                    value={newStatus} 
                    onValueChange={(value) => setNewStatus(value as SettlementStatus)}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Select new status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={SettlementStatus.PENDING}>
                        <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                          <span>Pending</span>
                        </div>
                      </SelectItem>
                      <SelectItem value={SettlementStatus.PROCESSING}>
                        <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          <span>Processing</span>
                        </div>
                      </SelectItem>
                      <SelectItem value={SettlementStatus.COMPLETED}>
                        <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span>Completed</span>
                        </div>
                      </SelectItem>
                      <SelectItem value={SettlementStatus.FAILED}>
                        <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                          <span>Failed</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-gray-200 p-6">
              <div className="flex space-x-3">
                <Button
                  onClick={handleBulkStatusUpdate}
                  disabled={isBulkUpdating || selectedSettlements.size === 0}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  {isBulkUpdating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      Update {selectedSettlements.size} Settlement(s)
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowBulkUpdate(false)}
                  disabled={isBulkUpdating}
                  className="px-6"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
} 