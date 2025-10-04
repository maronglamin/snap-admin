'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Store, 
  MapPin, 
  Phone, 
  Mail, 
  Eye,
  Search,
  ArrowLeft
} from 'lucide-react';
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

export default function ParentSellerDetailPage() {
  const params = useParams();
  const parentSellerId = params?.parentSellerId as string;
  const [parentSeller, setParentSeller] = useState<ParentSeller | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (parentSellerId) {
      fetchParentSeller();
    }
  }, [parentSellerId]);

  const fetchParentSeller = async () => {
    try {
      setLoading(true);
      const response = await branchesApi.getParentSellerById(parentSellerId);
      if (response.success && response.data) {
        setParentSeller(response.data);
      }
    } catch (error) {
      console.error('Error fetching parent seller:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredBranches = parentSeller?.branches.filter(branch =>
    branch.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    branch.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    branch.state?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading parent seller details...</div>
      </div>
    );
  }

  if (!parentSeller) {
    return (
      <div className="text-center py-12">
        <Store className="mx-auto h-12 w-12 text-muted-foreground" />
        <h3 className="mt-2 text-sm font-semibold text-gray-900">Parent seller not found</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          The requested parent seller could not be found.
        </p>
        <Link href="/ecommerce/sales-outlets">
          <Button className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Sales Outlets
          </Button>
        </Link>
      </div>
    );
  }

  const totalSalesReps = parentSeller.branches.reduce((sum, branch) => sum + branch._count.salesReps, 0);
  const totalProducts = parentSeller.branches.reduce((sum, branch) => sum + branch._count.products, 0);
  const totalOrders = parentSeller.branches.reduce((sum, branch) => sum + branch._count.orders, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {parentSeller.firstName} {parentSeller.lastName}
          </h1>
          <p className="text-muted-foreground">
            Principal Business - Branches & Sales Reps
          </p>
        </div>
        <Link href="/ecommerce/sales-outlets">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Sales Outlets
          </Button>
        </Link>
      </div>

      {/* Parent Seller Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Store className="h-5 w-5 text-blue-600" />
            <span>Principal Business Summary</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {parentSeller.branches.length}
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
          </div>
          <div className="mt-4 pt-4 border-t">
            <div className="flex items-center text-sm text-muted-foreground">
              <Phone className="mr-2 h-4 w-4" />
              {parentSeller.phoneNumber}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Search */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search branches..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      {/* Branches */}
      <div className="space-y-4">
        {filteredBranches.map((branch) => (
          <Card key={branch.id} className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <Store className="h-5 w-5 text-blue-600" />
                    <div>
                      <h3 className="text-lg font-semibold">{branch.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {branch.city && branch.state ? `${branch.city}, ${branch.state}` : 'No location info'}
                      </p>
                    </div>
                  </div>
                  
                  <Badge variant={branch.isActive ? "default" : "secondary"}>
                    {branch.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>

                <div className="flex items-center space-x-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {branch._count.salesReps}
                    </div>
                    <div className="text-xs text-muted-foreground">Sales Reps</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {branch._count.products}
                    </div>
                    <div className="text-xs text-muted-foreground">Products</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">
                      {branch._count.orders}
                    </div>
                    <div className="text-xs text-muted-foreground">Orders</div>
                  </div>
                  
                  <Link href={`/ecommerce/branches/${branch.id}`}>
                    <Button variant="outline">
                      <Eye className="mr-2 h-4 w-4" />
                      View Details
                    </Button>
                  </Link>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t">
                <div className="flex items-center space-x-6 text-sm text-muted-foreground">
                  {branch.address && (
                    <div className="flex items-center">
                      <MapPin className="mr-2 h-4 w-4" />
                      {branch.address}
                    </div>
                  )}
                  
                  {branch.phoneNumber && (
                    <div className="flex items-center">
                      <Phone className="mr-2 h-4 w-4" />
                      {branch.phoneNumber}
                    </div>
                  )}
                  
                  {branch.email && (
                    <div className="flex items-center">
                      <Mail className="mr-2 h-4 w-4" />
                      {branch.email}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredBranches.length === 0 && !loading && (
        <div className="text-center py-12">
          <Store className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-2 text-sm font-semibold text-gray-900">No branches found</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {searchTerm ? 'Try adjusting your search terms.' : 'This parent seller has no branches.'}
          </p>
        </div>
      )}
    </div>
  );
}
