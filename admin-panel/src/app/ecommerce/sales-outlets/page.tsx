'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Store, 
  Eye,
  Search,
  Calendar,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Link from 'next/link';
import { branchesApi } from '@/services/api';

interface ParentSeller {
  id: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  createdAt: string;
  branches: {
    id: string;
    name: string;
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    phoneNumber?: string;
    email?: string;
    isActive: boolean;
    createdAt: string;
    salesReps: {
      id: string;
      user: {
        id: string;
        firstName: string;
        lastName: string;
        phoneNumber: string;
      };
      _count: {
        products: number;
        orders: number;
      };
    }[];
    _count: {
      salesReps: number;
      products: number;
      orders: number;
    };
  }[];
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export default function SalesOutletsPage() {
  const [parentSellers, setParentSellers] = useState<ParentSeller[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [timeFilter, setTimeFilter] = useState<'all' | 'week' | 'month' | 'quarter' | 'year' | 'custom'>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);

  useEffect(() => {
    fetchParentSellers();
  }, [currentPage, timeFilter, startDate, endDate]);

  const fetchParentSellers = async () => {
    try {
      setLoading(true);
      const params: any = {
        page: currentPage,
        limit: 15,
        timeFilter,
      };
      
      if (timeFilter === 'custom' && startDate && endDate) {
        params.startDate = startDate;
        params.endDate = endDate;
      }
      
      const response = await branchesApi.getParentSellers(params);
      if (response.success) {
        setParentSellers(response.data);
        setPagination(response.pagination);
      } else {
        console.error('Error fetching parent sellers:', response.error);
      }
    } catch (error) {
      console.error('Error fetching parent sellers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  const handleTimeFilterChange = (value: string) => {
    setTimeFilter(value as any);
    setCurrentPage(1); // Reset to first page when filter changes
  };

  const filteredParentSellers = parentSellers.filter(seller =>
    seller.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    seller.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    seller.phoneNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    seller.branches.some(branch => 
      branch.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      branch.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      branch.state?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading sales outlets...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Sales Outlets</h1>
        <p className="text-muted-foreground">
          Manage and view all principal businesses and their branches
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search parent sellers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
        
        <div className="flex items-center space-x-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <Select value={timeFilter} onValueChange={handleTimeFilterChange}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Time filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="quarter">This Quarter</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
              <SelectItem value="custom">Custom Range</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {timeFilter === 'custom' && (
          <div className="flex items-center space-x-2">
            <Input
              type="date"
              placeholder="Start Date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-[140px]"
            />
            <Input
              type="date"
              placeholder="End Date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-[140px]"
            />
          </div>
        )}
      </div>

      <div className="space-y-4">
        {filteredParentSellers.map((seller) => {
          const totalBranches = seller.branches.length;
          const totalSalesReps = seller.branches.reduce((sum, branch) => sum + branch._count.salesReps, 0);
          const totalProducts = seller.branches.reduce((sum, branch) => sum + branch._count.products, 0);
          const totalOrders = seller.branches.reduce((sum, branch) => sum + branch._count.orders, 0);
          
          return (
            <Card key={seller.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <Store className="h-5 w-5 text-blue-600" />
                      <div>
                        <h3 className="text-lg font-semibold">{seller.firstName} {seller.lastName}</h3>
                        <p className="text-sm text-muted-foreground">
                          Phone: {seller.phoneNumber}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-6">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {totalBranches}
                      </div>
                      <div className="text-xs text-muted-foreground">Branches</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {totalSalesReps}
                      </div>
                      <div className="text-xs text-muted-foreground">Sales Reps</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-600">
                        {totalProducts}
                      </div>
                      <div className="text-xs text-muted-foreground">Products</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">
                        {totalOrders}
                      </div>
                      <div className="text-xs text-muted-foreground">Orders</div>
                    </div>
                    
                    <Link href={`/ecommerce/sales-outlets/${seller.id}`}>
                      <Button variant="outline">
                        <Eye className="mr-2 h-4 w-4" />
                        View Details
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredParentSellers.length === 0 && !loading && (
        <div className="text-center py-12">
          <Store className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-2 text-sm font-semibold text-gray-900">No parent sellers found</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {searchTerm ? 'Try adjusting your search terms.' : 'No principal businesses with branches found.'}
          </p>
        </div>
      )}

      {/* Pagination Controls */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
            {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
            {pagination.total} results
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={!pagination.hasPrev}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            
            <div className="flex items-center space-x-1">
              {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                const pageNum = i + 1;
                const isActive = pageNum === pagination.page;
                
                return (
                  <Button
                    key={pageNum}
                    variant={isActive ? "default" : "outline"}
                    size="sm"
                    onClick={() => handlePageChange(pageNum)}
                    className="w-8 h-8 p-0"
                  >
                    {pageNum}
                  </Button>
                );
              })}
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={!pagination.hasNext}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
