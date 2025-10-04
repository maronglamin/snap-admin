'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft,
  Store, 
  Users, 
  MapPin, 
  Phone, 
  Mail, 
  User,
  Calendar,
  Package,
  ShoppingCart
} from 'lucide-react';
import { branchesApi } from '@/services/api';

interface SalesRep {
  id: string;
  status: string;
  createdAt: string;
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
}

interface Branch {
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
  parentSeller: {
    id: string;
    firstName: string;
    lastName: string;
    phoneNumber: string;
  };
  salesReps: SalesRep[];
  _count: {
    salesReps: number;
    products: number;
    orders: number;
  };
}

export default function BranchDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const branchId = params.id as string;
  
  const [branch, setBranch] = useState<Branch | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchBranchDetails = useCallback(async () => {
    try {
      setLoading(true);
      const response = await branchesApi.getById(branchId);
      if (response.success) {
        setBranch(response.data);
      } else {
        console.error('Failed to fetch branch details:', response.error);
      }
    } catch (error) {
      console.error('Error fetching branch details:', error);
    } finally {
      setLoading(false);
    }
  }, [branchId]);

  useEffect(() => {
    if (branchId) {
      fetchBranchDetails();
    }
  }, [branchId, fetchBranchDetails]);

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'default';
      case 'inactive':
        return 'secondary';
      case 'suspended':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading branch details...</div>
      </div>
    );
  }

  if (!branch) {
    return (
      <div className="text-center py-12">
        <Store className="mx-auto h-12 w-12 text-muted-foreground" />
        <h3 className="mt-2 text-sm font-semibold text-gray-900">Branch not found</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          The branch you&apos;re looking for doesn&apos;t exist or has been removed.
        </p>
        <Button 
          className="mt-4" 
          variant="outline"
          onClick={() => router.push('/ecommerce/sales-outlets')}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Sales Outlets
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => router.push('/ecommerce/sales-outlets')}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{branch.name}</h1>
          <p className="text-muted-foreground">
            Branch details and sales representatives
          </p>
        </div>
      </div>

      {/* Branch Information */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Store className="h-5 w-5 text-blue-600" />
              <CardTitle>Branch Information</CardTitle>
            </div>
            <Badge variant={branch.isActive ? "default" : "secondary"}>
              {branch.isActive ? "Active" : "Inactive"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium text-sm text-muted-foreground mb-2">Principal Business</h4>
              <p className="text-sm">
                {branch.parentSeller.firstName} {branch.parentSeller.lastName}
              </p>
              <p className="text-sm text-muted-foreground">
                {branch.parentSeller.phoneNumber}
              </p>
            </div>
            
            <div>
              <h4 className="font-medium text-sm text-muted-foreground mb-2">Location</h4>
              {branch.address && (
                <div className="flex items-center text-sm">
                  <MapPin className="mr-2 h-4 w-4" />
                  {branch.address}
                  {branch.city && `, ${branch.city}`}
                  {branch.state && `, ${branch.state}`}
                  {branch.country && `, ${branch.country}`}
                </div>
              )}
            </div>
            
            {branch.phoneNumber && (
              <div>
                <h4 className="font-medium text-sm text-muted-foreground mb-2">Contact</h4>
                <div className="flex items-center text-sm">
                  <Phone className="mr-2 h-4 w-4" />
                  {branch.phoneNumber}
                </div>
                {branch.email && (
                  <div className="flex items-center text-sm mt-1">
                    <Mail className="mr-2 h-4 w-4" />
                    {branch.email}
                  </div>
                )}
              </div>
            )}
            
            <div>
              <h4 className="font-medium text-sm text-muted-foreground mb-2">Created</h4>
              <div className="flex items-center text-sm">
                <Calendar className="mr-2 h-4 w-4" />
                {new Date(branch.createdAt).toLocaleDateString()}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Branch Statistics */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sales Representatives</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{branch._count.salesReps}</div>
            <p className="text-xs text-muted-foreground">
              Active sales reps
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{branch._count.products}</div>
            <p className="text-xs text-muted-foreground">
              Total products
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{branch._count.orders}</div>
            <p className="text-xs text-muted-foreground">
              Total orders
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Sales Representatives */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-green-600" />
              <CardTitle>Sales Representatives</CardTitle>
            </div>
            <Badge variant="outline">
              {branch.salesReps.length} reps
            </Badge>
          </div>
          <CardDescription>
            Sales representatives assigned to this branch
          </CardDescription>
        </CardHeader>
        <CardContent>
          {branch.salesReps.length === 0 ? (
            <div className="text-center py-8">
              <Users className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-2 text-sm font-semibold text-gray-900">No sales representatives</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                This branch doesn&apos;t have any sales representatives assigned yet.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {branch.salesReps.map((salesRep) => (
                <div key={salesRep.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <User className="h-5 w-5 text-blue-600" />
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium">
                        {salesRep.user.firstName} {salesRep.user.lastName}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        {salesRep.user.phoneNumber}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Joined: {new Date(salesRep.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <div className="text-sm font-medium">
                        {salesRep._count.products} products
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {salesRep._count.orders} orders
                      </div>
                    </div>
                    <Badge variant={getStatusColor(salesRep.status)}>
                      {salesRep.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
