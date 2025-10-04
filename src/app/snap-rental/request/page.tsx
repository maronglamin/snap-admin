'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Search,
  MoreVertical,
  Eye,
  Download,
  Calendar,
  Car,
  User,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  Edit,
  MessageSquare,
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
import { rentalRequestsApi } from '@/services/api';

interface RentalRequest {
  id: string;
  requestId: string;
  customerId: string;
  driverId?: string;
  rideServiceId: string;
  status: string;
  pickupAddress: string;
  startDate: string;
  endDate: string;
  days: number;
  proposedPrice?: number;
  agreedPrice?: number;
  currency: string;
  createdAt: string;
  customer: {
    firstName: string;
    lastName: string;
    phoneNumber: string;
  };
  driver?: {
    driverId: string;
    user: {
      firstName: string;
      lastName: string;
      phoneNumber: string;
    };
  };
  rideService: {
    name: string;
    vehicleType: string;
  };
}

export default function RentalRequestPage() {
  const router = useRouter();
  const [rentalRequests, setRentalRequests] = useState<RentalRequest[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [dateFrom, setDateFrom] = useState(() => {
    const now = new Date();
    now.setDate(now.getDate() - 30); // Show last 30 days
    return now.toISOString().slice(0, 16);
  });
  const [dateTo, setDateTo] = useState(() => {
    const now = new Date();
    return now.toISOString().slice(0, 16);
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRequests, setTotalRequests] = useState(0);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    loadRentalRequests();
  }, [currentPage]);

  const loadRentalRequests = async () => {
    try {
      setIsLoading(true);
      setError('');
      
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20', // Increased limit to show more results
        search: searchQuery,
        status: filterStatus,
        startDate: dateFrom,
        endDate: dateTo,
      });

      const response = await rentalRequestsApi.getAll(params);
      
      setRentalRequests(response.rentalRequests || []);
      setTotalRequests(response.pagination?.total || 0);
      setTotalPages(response.pagination?.totalPages || 1);
    } catch (error) {
      console.error('Error loading rental requests:', error);
      setError('Failed to load rental requests');
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewDetail = (rentalRequest: RentalRequest) => {
    console.log('🔍 View Detail clicked for rental request:', rentalRequest.id);
    router.push(`/snap-rental/request/${rentalRequest.id}`);
  };



  const handleExport = async () => {
    try {
      setIsExporting(true);
      setError('');

      const params = new URLSearchParams({
        search: searchQuery,
        status: filterStatus,
        startDate: dateFrom,
        endDate: dateTo,
      });

      const response = await rentalRequestsApi.exportCSV(params);
      
      // Create blob and download
      const blob = new Blob([response], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `rental-requests-export-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error: any) {
      console.error('Error exporting rental requests:', error);
      setError('Failed to export rental requests');
    } finally {
      setIsExporting(false);
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'PENDING_QUOTE':
        return 'secondary';
      case 'QUOTED':
        return 'outline';
      case 'ACCEPTED':
        return 'default';
      case 'PAID':
        return 'default';
      case 'REJECTED':
      case 'CANCELLED':
        return 'destructive';
      case 'EXPIRED':
        return 'outline';
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

  const formatPrice = (price: number | undefined, currency: string) => {
    if (price === undefined || price === null) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'GMD',
    }).format(price);
  };

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading rental requests...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <Car className="h-5 w-5" />
                <span>Rental Requests</span>
              </CardTitle>
              <CardDescription>
                View and manage rental requests from customers
              </CardDescription>
            </div>
            <Button 
              className="bg-green-600 hover:bg-green-700" 
              onClick={handleExport}
              disabled={isExporting}
            >
              {isExporting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              {isExporting ? 'Exporting...' : 'Export Report'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="bg-gray-50 rounded-lg p-6 mb-6">
            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search by request ID, customer name, or pickup address..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <Button
                  onClick={() => {
                    setCurrentPage(1);
                    loadRentalRequests();
                  }}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Search
                </Button>
              </div>

              <div className="flex items-end gap-4">
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
                      <SelectItem value="PENDING_QUOTE">Pending Quote</SelectItem>
                      <SelectItem value="QUOTED">Quoted</SelectItem>
                      <SelectItem value="ACCEPTED">Accepted</SelectItem>
                      <SelectItem value="PAID">Paid</SelectItem>
                      <SelectItem value="REJECTED">Rejected</SelectItem>
                      <SelectItem value="CANCELLED">Cancelled</SelectItem>
                      <SelectItem value="EXPIRED">Expired</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
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

                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
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

                <Button
                  variant="outline"
                  onClick={() => {
                    const now = new Date();
                    setDateFrom(now.toISOString().slice(0, 16));
                    setDateTo(now.toISOString().slice(0, 16));
                    setFilterStatus('all');
                    setSearchQuery('');
                    setCurrentPage(1);
                  }}
                  className="bg-white border-gray-300 hover:bg-gray-50"
                >
                  Reset
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setDateFrom('');
                    setDateTo('');
                    setFilterStatus('all');
                    setSearchQuery('');
                    setCurrentPage(1);
                    loadRentalRequests();
                  }}
                  className="bg-white border-gray-300 hover:bg-gray-50"
                >
                  Show All
                </Button>
              </div>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}



          {/* Rental Requests Table */}
          <div className="overflow-x-auto border border-gray-200 rounded-lg">
            <table className="w-full min-w-[1200px] border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">Request ID</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">Customer</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">Driver</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">Service</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">Pickup Address</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">Duration</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">Price</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">Status</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">Created</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {rentalRequests.map((request) => (
                  <tr key={request.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm text-gray-900 font-mono whitespace-nowrap">
                      {request.requestId}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">
                      <div>
                        <div className="font-medium">
                          {request.customer.firstName} {request.customer.lastName}
                        </div>
                        <div className="text-gray-500 text-xs">{request.customer.phoneNumber}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">
                      {request.driver ? (
                        <div>
                          <div className="font-medium">
                            {request.driver.user.firstName} {request.driver.user.lastName}
                          </div>
                          <div className="text-gray-500 text-xs">{request.driver.driverId}</div>
                        </div>
                      ) : (
                        <span className="text-gray-400">Not assigned</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">
                      <div>
                        <div className="font-medium">{request.rideService.name}</div>
                        <div className="text-gray-500 text-xs">{request.rideService.vehicleType}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">
                      <div className="truncate max-w-[200px]" title={request.pickupAddress}>
                        {request.pickupAddress}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">
                      {request.days} days
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">
                      {formatPrice(request.agreedPrice || request.proposedPrice, request.currency)}
                    </td>
                    <td className="px-6 py-4 text-sm whitespace-nowrap">
                      <Badge variant={getStatusBadgeVariant(request.status)}>
                        {request.status.replace('_', ' ')}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">
                      {formatDate(request.createdAt)}
                    </td>
                    <td className="px-6 py-4 text-sm whitespace-nowrap">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => {
                            console.log('🔍 View Details clicked!');
                            handleViewDetail(request);
                          }}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
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
          {totalRequests > 0 && (
            <div className="flex items-center justify-between mt-6">
              <div className="text-sm text-gray-700">
                Showing {((currentPage - 1) * 10) + 1} to {Math.min(currentPage * 10, totalRequests)} of {totalRequests} results
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

          {rentalRequests.length === 0 && (
            <div className="text-center py-12">
              <Car className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-4 text-lg font-medium text-gray-900">No rental requests found</h3>
              <p className="mt-2 text-sm text-gray-500">
                No rental requests match your current filters.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );


}
