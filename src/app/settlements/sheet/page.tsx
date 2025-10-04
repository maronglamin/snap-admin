'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  Filter,
  Calendar,
  Download,
  Loader2,
  FileSpreadsheet,
  DollarSign,
  User,
  CreditCard,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { apiService } from '@/services/api';
import { Settlement, SettlementStatus, SettlementType } from '@/types';

interface SettlementSheetItem {
  id: string;
  sellerName: string;
  walletNumber: string;
  bankName?: string;
  walletAddress?: string;
  amountToSettle: number;
  currency: string;
  transferMethod: 'BANK_TRANSFER' | 'WALLET_TRANSFER';
  description: string;
  status: SettlementStatus;
  createdAt: Date;
}

// Extended Settlement interface for API response
interface SettlementWithDetails extends Settlement {
  user?: {
    firstName: string;
    lastName: string;
  };
  wallet?: {
    account: string;
    walletAddress?: string;
  };
  bankAccount?: {
    accountNumber: string;
    bankName?: string;
  };
}

export default function SettlementSheetPage() {
  const [settlements, setSettlements] = useState<SettlementSheetItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterMethod, setFilterMethod] = useState('all');
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
  const [isExporting, setIsExporting] = useState(false);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalSettlements, setTotalSettlements] = useState(0);
  const itemsPerPage = 10;

  // Load settlements
  useEffect(() => {
    loadSettlements();
  }, [currentPage]);

  const loadSettlements = async () => {
    try {
      setIsLoading(true);
      setError('');
      
      const params: any = {
        page: currentPage,
        limit: 10,
        search: searchQuery,
        dateFrom: dateFrom,
        dateTo: dateTo,
      };

      // Only add status if it's not 'all'
      if (filterStatus !== 'all') {
        params.status = filterStatus as SettlementStatus;
      }

      const response = await apiService.getSettlements(params);
      
      // Transform the data to match our SettlementSheetItem interface
      const transformedSettlements: SettlementSheetItem[] = (response.data || []).map((settlement: SettlementWithDetails) => ({
        id: settlement.id,
        sellerName: `${settlement.user?.firstName || ''} ${settlement.user?.lastName || ''}`.trim() || 'Unknown Seller',
        walletNumber: settlement.bankAccount?.accountNumber || settlement.wallet?.account || 'N/A',
        bankName: settlement.bankAccount?.bankName,
        walletAddress: settlement.wallet?.walletAddress,
        amountToSettle: Number(settlement.amount),
        currency: settlement.currency,
        transferMethod: settlement.type === SettlementType.BANK_TRANSFER ? 'BANK_TRANSFER' : 'WALLET_TRANSFER',
        description: `Being settlement to be paid through ${settlement.type === SettlementType.BANK_TRANSFER ? 'bank' : 'wallet'}`,
        status: settlement.status,
        createdAt: new Date(settlement.createdAt),
      }));

      // Apply transfer method filter
      let filteredSettlements = transformedSettlements;
      if (filterMethod !== 'all') {
        filteredSettlements = transformedSettlements.filter(item => item.transferMethod === filterMethod);
      }
      
      setSettlements(filteredSettlements);
      setTotalSettlements(response.pagination?.total || 0);
      setTotalPages(response.pagination?.totalPages || 1);
    } catch (error) {
      console.error('Error loading settlements:', error);
      setError('Failed to load settlements');
    } finally {
      setIsLoading(false);
    }
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
    setFilterMethod('all');
    setSearchQuery('');
    setCurrentPage(1);
    loadSettlements();
  };

  const exportToCSV = async () => {
    try {
      setIsExporting(true);
      
      // Get all settlements for export (without pagination)
      const params: any = {
        limit: 1000, // Get all records
        search: searchQuery,
        dateFrom: dateFrom,
        dateTo: dateTo,
      };

      // Only add status if it's not 'all'
      if (filterStatus !== 'all') {
        params.status = filterStatus as SettlementStatus;
      }

      const response = await apiService.getSettlements(params);
      
      // Transform the data
      const exportData: SettlementSheetItem[] = (response.data || []).map((settlement: SettlementWithDetails) => ({
        id: settlement.id,
        sellerName: `${settlement.user?.firstName || ''} ${settlement.user?.lastName || ''}`.trim() || 'Unknown Seller',
        walletNumber: settlement.bankAccount?.accountNumber || settlement.wallet?.account || 'N/A',
        bankName: settlement.bankAccount?.bankName,
        walletAddress: settlement.wallet?.walletAddress,
        amountToSettle: Number(settlement.amount),
        currency: settlement.currency,
        transferMethod: settlement.type === SettlementType.BANK_TRANSFER ? 'BANK_TRANSFER' : 'WALLET_TRANSFER',
        description: `Being settlement to be paid through ${settlement.type === SettlementType.BANK_TRANSFER ? 'bank' : 'wallet'}`,
        status: settlement.status,
        createdAt: new Date(settlement.createdAt),
      }));

      // Apply transfer method filter
      let filteredData = exportData;
      if (filterMethod !== 'all') {
        filteredData = exportData.filter(item => item.transferMethod === filterMethod);
      }

      // Create CSV content
      const headers = ['Seller Name', 'Wallet/Bank Number', 'Bank Name', 'Wallet Address', 'Amount to Settle', 'Currency', 'Transfer Method', 'Description', 'Status', 'Created Date'];
      const csvContent = [
        headers.join(','),
        ...filteredData.map(item => [
          `"${item.sellerName}"`,
          `"${item.walletNumber}"`,
          `"${item.bankName || ''}"`,
          `"${item.walletAddress || ''}"`,
          item.amountToSettle.toFixed(2),
          item.currency,
          item.transferMethod,
          `"${item.description}"`,
          item.status,
          item.createdAt.toLocaleDateString('en-US')
        ].join(','))
      ].join('\n');

      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `settlement-sheet-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error exporting CSV:', error);
      setError('Failed to export CSV');
    } finally {
      setIsExporting(false);
    }
  };

  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
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

  const getTransferMethodIcon = (method: string) => {
    return method === 'BANK_TRANSFER' ? <CreditCard className="h-4 w-4" /> : <User className="h-4 w-4" />;
  };

  if (isLoading && settlements.length === 0) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading settlement sheet...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Settlement Sheet</h1>
          <p className="text-gray-600 mt-2">View and export settlement information</p>
        </div>
        <Button 
          onClick={exportToCSV} 
          disabled={isExporting || settlements.length === 0}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {isExporting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Exporting...
            </>
          ) : (
            <>
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </>
          )}
        </Button>
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
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
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
              <Label className="text-sm font-medium text-gray-700 mb-1">Transfer Method</Label>
              <Select value={filterMethod} onValueChange={setFilterMethod}>
                <SelectTrigger>
                  <SelectValue placeholder="All Methods" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Methods</SelectItem>
                  <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                  <SelectItem value="WALLET_TRANSFER">Wallet Transfer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-1">Search</Label>
              <Input
                placeholder="Search by seller name..."
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

      {/* Settlement Sheet Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Settlement Sheet</CardTitle>
              <CardDescription>
                Showing {settlements.length} of {totalSettlements} settlements
              </CardDescription>
            </div>
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
              <FileSpreadsheet className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-4 text-lg font-medium text-gray-900">No settlements found</h3>
              <p className="mt-2 text-sm text-gray-500">
                Try adjusting your search criteria or date range.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-gray-700 whitespace-nowrap">Seller Name</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700 whitespace-nowrap">Wallet/Bank Number</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700 whitespace-nowrap">Bank Name</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700 whitespace-nowrap">Wallet Address</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700 whitespace-nowrap">Amount to Settle</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700 whitespace-nowrap">Transfer Method</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700 whitespace-nowrap">Description</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700 whitespace-nowrap">Status</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700 whitespace-nowrap">Created Date</th>
                  </tr>
                </thead>
                <tbody>
                  {settlements.map((settlement) => (
                    <tr key={settlement.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <User className="h-4 w-4 text-gray-400 flex-shrink-0" />
                          <span className="font-medium text-gray-900">{settlement.sellerName}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="font-mono text-sm text-gray-600">{settlement.walletNumber}</span>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="text-sm text-gray-600">
                          {settlement.transferMethod === 'BANK_TRANSFER' ? (settlement.bankName || 'N/A') : '-'}
                        </span>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="text-sm text-gray-600">
                          {settlement.transferMethod === 'WALLET_TRANSFER' ? (settlement.walletAddress || 'N/A') : '-'}
                        </span>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="font-semibold text-gray-900">
                          {formatAmount(settlement.amountToSettle, settlement.currency)}
                        </span>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          {getTransferMethodIcon(settlement.transferMethod)}
                          <Badge variant="outline">
                            {settlement.transferMethod === 'BANK_TRANSFER' ? 'Bank' : 'Wallet'}
                          </Badge>
                        </div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="text-sm text-gray-600">{settlement.description}</span>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <Badge variant={getStatusBadgeVariant(settlement.status)}>
                          {settlement.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="text-sm text-gray-500">{formatDate(settlement.createdAt)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 