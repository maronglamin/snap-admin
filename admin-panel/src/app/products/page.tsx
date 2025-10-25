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
  Package,
  User,
  Store,
  MapPin,
  ArrowLeft,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Copy,
  Check,
  Star,
  Eye as EyeIcon,
  Heart,
  ShoppingCart,
  Tag,
  Image as ImageIcon,
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
import { productsApi } from '@/services/api';
import { Product, ProductStatus, ProductCondition } from '@/types';
import { exportProductsToCSV, ProductForExport } from '@/utils/csvExport';

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterCondition, setFilterCondition] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterFeatured, setFilterFeatured] = useState('all');
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
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [orderHistoryPage, setOrderHistoryPage] = useState(1);
  const [orderHistoryLimit] = useState(5);
  const [productViewsPage, setProductViewsPage] = useState(1);
  const [productViewsLimit] = useState(4);
  const itemsPerPage = 10;

  // Load products
  useEffect(() => {
    loadProducts();
  }, [currentPage]);

  const loadProducts = async () => {
    try {
      setIsLoading(true);
      setError('');
      
      // Debug: Get total count first
      try {
        const countResponse = await productsApi.getProductsCount();
        console.log('Total Products in Database:', countResponse.total);
      } catch (err) {
        console.log('Could not get total count:', err);
      }
      
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10',
        search: searchQuery,
        status: filterStatus,
        condition: filterCondition,
        categoryId: filterCategory,
        isFeatured: filterFeatured,
        dateFrom: dateFrom,
        dateTo: dateTo,
      });

      console.log('Products API Parameters:', Object.fromEntries(params));

      const response = await productsApi.getProducts(params);
      
      if (response.success) {
        setProducts(response.data);
        setTotalProducts(response.pagination.total);
        setTotalPages(response.pagination.totalPages);
        console.log('Products Response:', {
          total: response.pagination.total,
          totalPages: response.pagination.totalPages,
          productsCount: response.data.length,
          dateFrom,
          dateTo
        });
      } else {
        setError(response.error || 'Failed to load products');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load products');
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewDetail = async (product: Product) => {
    try {
      setOrderHistoryPage(1); // Reset order history pagination
      setProductViewsPage(1); // Reset product views pagination
      const response = await productsApi.getProductById(product.id);
      if (response.success) {
        setSelectedProduct(response.data);
        setShowDetail(true);
      } else {
        setError(response.error || 'Failed to load product details');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load product details');
    }
  };

  const handleBackToList = () => {
    setShowDetail(false);
    setSelectedProduct(null);
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
      case 'ACTIVE':
        return 'default';
      case 'INACTIVE':
        return 'secondary';
      case 'SOLD':
        return 'outline';
      case 'PENDING':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const getConditionBadgeVariant = (condition: string) => {
    switch (condition) {
      case 'NEW':
        return 'default';
      case 'EXCELLENT':
        return 'secondary';
      case 'VERY_GOOD':
        return 'outline';
      case 'REFURBISHED':
        return 'outline';
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

  const getTotalOrdersCount = (orderItems: any[]) => {
    if (!orderItems || orderItems.length === 0) return 0;
    // Count unique orders (not order items)
    const uniqueOrders = new Set();
    
    orderItems.forEach(item => {
      if (item.order && (item.order.paymentStatus === 'PAID' || item.order.paymentStatus === 'SETTLED')) {
        uniqueOrders.add(item.order.id);
      }
    });
    
    console.log('Total orders count:', {
      orderItemsCount: orderItems.length,
      uniqueOrdersCount: uniqueOrders.size
    });
    
    return uniqueOrders.size;
  };

  const getTotalRevenue = (orderItems: any[]) => {
    if (!orderItems || orderItems.length === 0) return 0;
    
    // Calculate revenue based on this product's contribution to each order
    let totalRevenue = 0;
    
    orderItems.forEach(item => {
      if (item.order && (item.order.paymentStatus === 'PAID' || item.order.paymentStatus === 'SETTLED')) {
        const quantity = Number(item.quantity || 0);
        const unitPrice = Number(item.unitPrice || 0);
        const totalPrice = Number(item.totalPrice || 0);
        const calculatedTotal = quantity * unitPrice;
        
        // Use the order item's total price (this product's contribution to the order)
        totalRevenue += totalPrice;
        
        console.log('Order item revenue calculation:', {
          orderId: item.order.id,
          quantity,
          unitPrice,
          totalPrice,
          calculatedTotal,
          orderTotalAmount: item.order.totalAmount,
          paymentStatus: item.order.paymentStatus
        });
      }
    });
    
    console.log('Total revenue calculation:', {
      orderItemsCount: orderItems.length,
      totalRevenue: totalRevenue
    });
    return totalRevenue;
  };

  const getRevenueByCurrency = (orderItems: any[]) => {
    if (!orderItems || orderItems.length === 0) return [];
    
    // Calculate revenue by currency based on this product's contribution to each order
    const revenueByCurrency: { [key: string]: number } = {};
    
    console.log('Processing orderItems for revenue calculation:', orderItems.length, 'items');
    
    orderItems.forEach(item => {
      if (item.order && (item.order.paymentStatus === 'PAID' || item.order.paymentStatus === 'SETTLED')) {
        const currency = item.order.currencyCode || 'USD';
        const quantity = Number(item.quantity || 0);
        const unitPrice = Number(item.unitPrice || 0);
        const itemTotal = Number(item.totalPrice || 0);
        const calculatedTotal = quantity * unitPrice;
        
        console.log('Order item for currency calculation:', {
          id: item.id,
          orderId: item.order.id,
          currency,
          quantity,
          unitPrice,
          itemTotal,
          calculatedTotal,
          paymentStatus: item.order.paymentStatus,
          orderDate: item.order.createdAt
        });
        
        if (revenueByCurrency[currency]) {
          revenueByCurrency[currency] += itemTotal;
        } else {
          revenueByCurrency[currency] = itemTotal;
        }
      }
    });
    
    const result = Object.entries(revenueByCurrency).map(([currency, amount]) => ({
      currency,
      amount
    }));
    
    console.log('Revenue by currency result:', result);
    return result;
  };

  const getPaginatedOrderItems = (orderItems: any[], page: number, limit: number) => {
    if (!orderItems || orderItems.length === 0) return { items: [], total: 0, totalPages: 0 };
    
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const items = orderItems.slice(startIndex, endIndex);
    const total = orderItems.length;
    const totalPages = Math.ceil(total / limit);
    
    return { items, total, totalPages };
  };

  const getPaginatedProductViews = (productViews: any[], page: number, limit: number) => {
    if (!productViews || productViews.length === 0) return { items: [], total: 0, totalPages: 0 };
    
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const items = productViews.slice(startIndex, endIndex);
    const total = productViews.length;
    const totalPages = Math.ceil(total / limit);
    
    return { items, total, totalPages };
  };

  const handleExport = async () => {
    try {
      setIsExporting(true);
      setError('');
      
      const params = new URLSearchParams({
        search: searchQuery,
        status: filterStatus,
        condition: filterCondition,
        categoryId: filterCategory,
        isFeatured: filterFeatured,
        dateFrom: dateFrom,
        dateTo: dateTo,
      });

      const response = await productsApi.exportProducts(params);
      
      if (response.success) {
        // Transform the data for CSV export
        const exportData: ProductForExport[] = response.data.map((product: Product) => ({
          id: product.id,
          title: product.title,
          description: product.description || '',
          price: product.price,
          currencyCode: product.currencyCode,
          condition: product.condition,
          status: product.status,
          isFeatured: product.isFeatured,
          sellerName: product.seller ? `${product.seller.firstName} ${product.seller.lastName}` : '',
          sellerPhone: product.seller?.phoneNumber || '',
          categoryName: product.category?.name || '',
          totalOrders: getTotalOrdersCount(product.orderItems ?? []),
          createdAt: product.createdAt,
          updatedAt: product.updatedAt,
        }));

        // Generate filename based on filters
        let filename = 'products-report';
        if (filterStatus !== 'all') filename += `-${filterStatus.toLowerCase()}`;
        if (filterCondition !== 'all') filename += `-${filterCondition.toLowerCase()}`;
        if (filterCategory !== 'all') filename += `-category-${filterCategory}`;
        if (filterFeatured !== 'all') filename += `-${filterFeatured === 'true' ? 'featured' : 'not-featured'}`;
        if (searchQuery) filename += `-search-${searchQuery.substring(0, 20)}`;

        exportProductsToCSV(exportData, filename);
        setExportSuccess(true);
        setTimeout(() => setExportSuccess(false), 3001);
      } else {
        setError(response.error || 'Failed to export products');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to export products');
    } finally {
      setIsExporting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading products...</span>
        </div>
      </div>
    );
  }

  if (showDetail && selectedProduct) {
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
              <h1 className="text-2xl font-bold text-gray-900">Product Details</h1>
              <p className="text-gray-600">Product Management</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Main Content - 75% */}
          <div className="col-span-2 space-y-6">
            {/* Product Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Package className="h-5 w-5" />
                  <span>Product Information</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {/* Basic Product Info */}
                  <div>
                    <label className="text-sm font-medium text-gray-700">Product ID</label>
                    <p className="text-sm text-gray-900 mt-1 font-mono">{selectedProduct.id}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Title</label>
                    <p className="text-sm text-gray-900 mt-1">{selectedProduct.title}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Status</label>
                    <Badge variant={getStatusBadgeVariant(selectedProduct.status)} className="mt-1">
                      {selectedProduct.status}
                    </Badge>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Condition</label>
                    <Badge variant={getConditionBadgeVariant(selectedProduct.condition)} className="mt-1">
                      {selectedProduct.condition}
                    </Badge>
                  </div>
                  
                  {/* Financial Information */}
                  <div>
                    <label className="text-sm font-medium text-gray-700">Price</label>
                    <p className="text-sm text-gray-900 mt-1 font-semibold">
                      {formatAmount(selectedProduct.price, selectedProduct.currencyCode)}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Quantity Available</label>
                    <p className="text-sm text-gray-900 mt-1">{selectedProduct.quantity}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Currency</label>
                    <p className="text-sm text-gray-900 mt-1">{selectedProduct.currencyCode}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Featured</label>
                    <Badge variant={selectedProduct.isFeatured ? "default" : "secondary"} className="mt-1">
                      {selectedProduct.isFeatured ? 'Yes' : 'No'}
                    </Badge>
                  </div>
                  
                  {/* Ratings and Views */}
                  <div>
                    <label className="text-sm font-medium text-gray-700">Rating</label>
                    <div className="flex items-center space-x-1 mt-1">
                      <Star className="h-4 w-4 text-yellow-400 fill-current" />
                      <span className="text-sm text-gray-900">
                        {selectedProduct.rating ? selectedProduct.rating.toFixed(1) : 'N/A'}
                      </span>
                      <span className="text-sm text-gray-500">
                        ({selectedProduct.ratingCount} reviews)
                      </span>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Views</label>
                    <p className="text-sm text-gray-900 mt-1">{selectedProduct.views}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Favorites</label>
                    <p className="text-sm text-gray-900 mt-1">{selectedProduct.favorites}</p>
                  </div>
                  
                  {/* Category and Location */}
                  <div>
                    <label className="text-sm font-medium text-gray-700">Category</label>
                    <p className="text-sm text-gray-900 mt-1">
                      {selectedProduct.category?.name || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Location</label>
                    <p className="text-sm text-gray-900 mt-1">
                      {selectedProduct.location ? 
                        `${selectedProduct.location.city}, ${selectedProduct.location.region}, ${selectedProduct.location.countryCode}` : 
                        'N/A'
                      }
                    </p>
                  </div>
                  
                  {/* Timestamps */}
                  <div>
                    <label className="text-sm font-medium text-gray-700">Created</label>
                    <p className="text-sm text-gray-900 mt-1">{formatDate(selectedProduct.createdAt)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Updated</label>
                    <p className="text-sm text-gray-900 mt-1">{formatDate(selectedProduct.updatedAt)}</p>
                  </div>
                  {selectedProduct.featuredUntil && (
                    <div>
                      <label className="text-sm font-medium text-gray-700">Featured Until</label>
                      <p className="text-sm text-gray-900 mt-1">{formatDate(selectedProduct.featuredUntil)}</p>
                    </div>
                  )}
                </div>

                {/* Description */}
                {selectedProduct.description && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">Description</label>
                    <p className="text-sm text-gray-900 mt-1">{selectedProduct.description}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Product Images */}
            {selectedProduct.images && selectedProduct.images.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <ImageIcon className="h-5 w-5" />
                    <span>Product Images</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4">
                    {selectedProduct.images.map((image) => (
                      <div key={image.id} className="relative">
                        <img
                          src={image.imageUrl}
                          alt={image.altText || 'Product image'}
                          className="w-full h-32 object-cover rounded-lg"
                        />
                        {image.isPrimary && (
                          <Badge className="absolute top-2 left-2 text-xs">Primary</Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Product Attributes */}
            {selectedProduct.attributes && selectedProduct.attributes.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Tag className="h-5 w-5" />
                    <span>Product Attributes</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    {selectedProduct.attributes.map((attr) => (
                      <div key={attr.id} className="flex justify-between items-center p-2 border rounded">
                        <span className="text-sm font-medium text-gray-700">{attr.key}</span>
                        <span className="text-sm text-gray-900">
                          {attr.value}{attr.unit ? ` ${attr.unit}` : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Order Items */}
            {selectedProduct.orderItems && selectedProduct.orderItems.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <ShoppingCart className="h-5 w-5" />
                    <span>Order History</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {(() => {
                      const { items: paginatedItems, total, totalPages } = getPaginatedOrderItems(
                        selectedProduct.orderItems,
                        orderHistoryPage,
                        orderHistoryLimit
                      );
                      
                      return (
                        <>
                          {paginatedItems.map((item) => (
                            <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg">
                              <div className="flex-1">
                                <div className="flex items-center space-x-2">
                                  <h4 className="font-medium text-gray-900">Order #{item.order?.orderNumber}</h4>
                                  <Badge variant={getStatusBadgeVariant(item.order?.status || '')}>
                                    {item.order?.status}
                                  </Badge>
                                </div>
                                <p className="text-sm text-gray-500">Customer: {item.order?.customerName}</p>
                                <p className="text-sm text-gray-500">Quantity: {item.quantity}</p>
                                <p className="text-sm text-gray-500">Date: {formatDate(item.createdAt)}</p>
                              </div>
                              <div className="text-right">
                                <p className="font-semibold text-gray-900">
                                  {formatAmount(item.totalPrice, item.order?.currencyCode || selectedProduct.currencyCode)}
                                </p>
                              </div>
                            </div>
                          ))}
                          
                          {/* Order History Pagination */}
                          {totalPages > 1 && (
                            <div className="flex items-center justify-between mt-4 pt-4 border-t">
                              <div className="text-sm text-gray-700">
                                Showing {((orderHistoryPage - 1) * orderHistoryLimit) + 1} to {Math.min(orderHistoryPage * orderHistoryLimit, total)} of {total} orders
                              </div>
                              <div className="flex items-center space-x-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setOrderHistoryPage(prev => Math.max(prev - 1, 1))}
                                  disabled={orderHistoryPage === 1}
                                >
                                  <ChevronLeft className="h-4 w-4" />
                                  Previous
                                </Button>
                                <div className="text-sm">
                                  Page {orderHistoryPage} of {totalPages}
                                </div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setOrderHistoryPage(prev => Math.min(prev + 1, totalPages))}
                                  disabled={orderHistoryPage === totalPages}
                                >
                                  Next
                                  <ChevronRight className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar - 25% */}
          <div className="space-y-6">
            {/* Seller Details */}
            {selectedProduct.seller && (
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
                      {selectedProduct.seller.firstName} {selectedProduct.seller.lastName}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Phone</label>
                    <p className="text-sm text-gray-900 mt-1">{selectedProduct.seller.phoneNumber}</p>
                  </div>
                  {selectedProduct.seller.sellerKyc && (
                    <div>
                      <label className="text-sm font-medium text-gray-700">Business</label>
                      <p className="text-sm text-gray-900 mt-1">{selectedProduct.seller.sellerKyc.businessName}</p>
                      <Badge variant={getStatusBadgeVariant(selectedProduct.seller.sellerKyc.status)} className="mt-1">
                        {selectedProduct.seller.sellerKyc.status}
                      </Badge>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Sales Statistics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <DollarSign className="h-5 w-5" />
                  <span>Current Month Sales</span>
                </CardTitle>
                <CardDescription className="text-xs text-gray-500">
                  Only PAID and SETTLED orders
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">Total Orders</label>
                  <p className="text-sm text-gray-900 mt-1">{getTotalOrdersCount(selectedProduct.orderItems || [])}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Revenue by Currency</label>
                  {getRevenueByCurrency(selectedProduct.orderItems || []).length > 0 ? (
                    <div className="space-y-1 mt-1">
                      {getRevenueByCurrency(selectedProduct.orderItems || []).map((revenue, index) => (
                        <div key={index} className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">{revenue.currency}</span>
                          <span className="text-sm font-semibold text-gray-900">
                            {formatAmount(revenue.amount, revenue.currency)}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 mt-1">No sales this month</p>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Total Favorites</label>
                  <p className="text-sm text-gray-900 mt-1">{selectedProduct.favorites}</p>
                </div>
              </CardContent>
            </Card>

            {/* Product Order Interests */}
            {selectedProduct.productOrderInterests && selectedProduct.productOrderInterests.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Heart className="h-5 w-5" />
                    <span>Order Interests</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {selectedProduct.productOrderInterests.slice(0, 3).map((interest) => (
                    <div key={interest.id} className="border rounded p-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">
                          {interest.user ? `${interest.user.firstName} ${interest.user.lastName}` : 'Anonymous'}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {interest.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-500">Qty: {interest.quantity}</p>
                      <p className="text-xs text-gray-500">
                        {formatAmount(interest.totalAmount, interest.currencyCode)}
                      </p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Delivery Options */}
            {selectedProduct.deliveryOptions && selectedProduct.deliveryOptions.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <MapPin className="h-5 w-5" />
                    <span>Delivery Options</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {selectedProduct.deliveryOptions.map((option) => (
                    <div key={option.id} className="flex items-center justify-between p-2 border rounded">
                      <div>
                        <p className="text-sm font-medium">{option.name}</p>
                        <p className="text-xs text-gray-500">{option.estimatedDays} days</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">
                          {formatAmount(option.price, option.currencyCode)}
                        </p>
                        {option.isDefault && (
                          <Badge className="text-xs">Default</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Product Views */}
            {selectedProduct.productViews && selectedProduct.productViews.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <EyeIcon className="h-5 w-5" />
                    <span>Recent Views</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {(() => {
                      const { items: paginatedViews, total, totalPages } = getPaginatedProductViews(
                        selectedProduct.productViews,
                        productViewsPage,
                        productViewsLimit
                      );
                      
                      return (
                        <>
                          {paginatedViews.map((view) => (
                            <div key={view.id} className="flex items-center justify-between p-2 border rounded">
                              <div>
                                <p className="text-sm text-gray-900">
                                  {view.user ? `${view.user.firstName} ${view.user.lastName}` : 'Anonymous'}
                                </p>
                                <p className="text-xs text-gray-500">{formatDate(view.viewedAt)}</p>
                              </div>
                            </div>
                          ))}
                          
                          {/* Product Views Pagination */}
                          {totalPages > 1 && (
                            <div className="flex items-center justify-between mt-3 pt-3 border-t">
                              <div className="text-xs text-gray-700">
                                {((productViewsPage - 1) * productViewsLimit) + 1} to {Math.min(productViewsPage * productViewsLimit, total)} of {total}
                              </div>
                              <div className="flex items-center space-x-1">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setProductViewsPage(prev => Math.max(prev - 1, 1))}
                                  disabled={productViewsPage === 1}
                                  className="h-6 w-6 p-0"
                                >
                                  <ChevronLeft className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setProductViewsPage(prev => Math.min(prev + 1, totalPages))}
                                  disabled={productViewsPage === totalPages}
                                  className="h-6 w-6 p-0"
                                >
                                  <ChevronRight className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          )}
                        </>
                      );
                    })()}
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
                <Package className="h-5 w-5" />
                <span>Product Management</span>
              </CardTitle>
              <CardDescription>
                View and manage all products with comprehensive filtering and search
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
                  Export Products
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
                    placeholder="Search by title, description, price, or seller..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <Button
                  onClick={() => {
                    setCurrentPage(1);
                    loadProducts();
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
                      <SelectItem value="ACTIVE">Active</SelectItem>
                      <SelectItem value="INACTIVE">Inactive</SelectItem>
                      <SelectItem value="SOLD">Sold</SelectItem>
                      <SelectItem value="PENDING">Pending</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Condition Filter */}
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Condition
                  </label>
                  <Select
                    value={filterCondition}
                    onValueChange={setFilterCondition}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="All Conditions" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Conditions</SelectItem>
                      <SelectItem value="NEW">New</SelectItem>
                      <SelectItem value="EXCELLENT">Excellent</SelectItem>
                      <SelectItem value="VERY_GOOD">Very Good</SelectItem>
                      <SelectItem value="REFURBISHED">Refurbished</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Featured Filter */}
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Featured
                  </label>
                  <Select
                    value={filterFeatured}
                    onValueChange={setFilterFeatured}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="All Products" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Products</SelectItem>
                      <SelectItem value="true">Featured Only</SelectItem>
                      <SelectItem value="false">Not Featured</SelectItem>
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
                    setFilterCondition('all');
                    setFilterCategory('all');
                    setFilterFeatured('all');
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
                  <p className="text-sm text-green-800">Products report exported successfully!</p>
                </div>
              </div>
            </div>
          )}

          {/* Products Table */}
          <div className="overflow-x-auto border border-gray-200 rounded-lg">
            <table className="w-full min-w-[1200px] border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">
                    Product
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">
                    Seller
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">
                    Price
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">
                    Condition
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">
                    Stats
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
                {products.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <p className="font-medium text-gray-900 truncate" title={product.title}>
                            {product.title}
                          </p>
                          {product.isFeatured && (
                            <Badge variant="default" className="text-xs">Featured</Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 truncate">
                          {product.category?.name || 'No Category'}
                        </p>
                        <p className="text-xs text-gray-400">
                          Qty: {product.quantity}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">
                      <div className="truncate max-w-[150px]" title={`${product.seller?.firstName} ${product.seller?.lastName}`}>
                        <div className="font-medium">
                          {product.seller ? 
                            `${product.seller.firstName} ${product.seller.lastName}` : 
                            'N/A'
                          }
                        </div>
                        <div className="text-xs text-gray-500">{product.seller?.phoneNumber}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">
                      <div className="font-semibold">
                        {formatAmount(product.price, product.currencyCode)}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm whitespace-nowrap">
                      <Badge variant={getStatusBadgeVariant(product.status)}>
                        {product.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-sm whitespace-nowrap">
                      <Badge variant={getConditionBadgeVariant(product.condition)}>
                        {product.condition}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-1">
                          <EyeIcon className="h-3 w-3" />
                          <span className="text-xs">{product.views}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Heart className="h-3 w-3" />
                          <span className="text-xs">{product.favorites}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <ShoppingCart className="h-3 w-3" />
                          <span className="text-xs">{getTotalOrdersCount(product.orderItems || [])}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">
                      <div>
                        {formatDate(product.createdAt)}
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
                          <DropdownMenuItem onClick={() => handleViewDetail(product)}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Download className="mr-2 h-4 w-4" />
                            Download Report
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
          {totalProducts > 0 && (
            <div className="flex items-center justify-between mt-6">
              <div className="text-sm text-gray-700">
                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalProducts)} of {totalProducts} results
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

          {products.length === 0 && (
            <div className="text-center py-12">
              <Package className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-4 text-lg font-medium text-gray-900">No products found</h3>
              <p className="mt-2 text-sm text-gray-500">
                No products match your current filters.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 