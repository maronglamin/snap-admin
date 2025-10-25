'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Car, User, DollarSign, Loader2, MessageSquare } from 'lucide-react';
import { rentalRequestsApi } from '@/services/api';

export default function RentalRequestDetailPage() {
  const router = useRouter();
  const params = useParams();
  const [rentalRequest, setRentalRequest] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (params.id) {
      loadRentalRequest(params.id as string);
    }
  }, [params.id]);

  const loadRentalRequest = async (id: string) => {
    try {
      setIsLoading(true);
      setError('');
      
      const response = await rentalRequestsApi.getById(id);
      console.log('🔍 API Response:', response);
      
      const rentalRequestData = response.success ? response.rentalRequest : response;
      
      if (rentalRequestData) {
        setRentalRequest(rentalRequestData);
      } else {
        setError('Failed to load rental request details');
      }
    } catch (err: any) {
      console.error('🔍 Exception in loadRentalRequest:', err);
      setError(err.message || 'Failed to load rental request details');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'PENDING_QUOTE': return 'secondary';
      case 'QUOTED': return 'outline';
      case 'ACCEPTED': return 'default';
      case 'PAID': return 'default';
      case 'REJECTED':
      case 'CANCELLED': return 'destructive';
      case 'EXPIRED': return 'outline';
      default: return 'outline';
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
          <span>Loading rental request details...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Button
          variant="outline"
          onClick={() => router.push('/snap-rental/request')}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to List
        </Button>
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      </div>
    );
  }

  if (!rentalRequest) {
    return (
      <div className="p-6">
        <Button
          variant="outline"
          onClick={() => router.push('/snap-rental/request')}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to List
        </Button>
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">Rental request not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            onClick={() => router.push('/snap-rental/request')}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to List
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Rental Request Details</h1>
            <p className="text-gray-600">SNAP Rental Management</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Main Content - 75% */}
        <div className="col-span-2 space-y-6">
          {/* Rental Request Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Car className="h-5 w-5" />
                <span>Rental Request Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Request ID</label>
                  <p className="text-sm text-gray-900 mt-1 font-mono">{rentalRequest.requestId}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Status</label>
                  <Badge variant={getStatusBadgeVariant(rentalRequest.status)} className="mt-1">
                    {rentalRequest.status.replace('_', ' ')}
                  </Badge>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Start Date</label>
                  <p className="text-sm text-gray-900 mt-1">{formatDate(rentalRequest.startDate)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">End Date</label>
                  <p className="text-sm text-gray-900 mt-1">{formatDate(rentalRequest.endDate)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Duration</label>
                  <p className="text-sm text-gray-900 mt-1">{rentalRequest.days} days</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Pickup Address</label>
                  <p className="text-sm text-gray-900 mt-1">{rentalRequest.pickupAddress}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Proposed Price</label>
                  <p className="text-sm text-gray-900 mt-1 font-semibold">
                    {formatPrice(rentalRequest.proposedPrice, rentalRequest.currency)}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Agreed Price</label>
                  <p className="text-sm text-gray-900 mt-1 font-semibold">
                    {formatPrice(rentalRequest.agreedPrice, rentalRequest.currency)}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Currency</label>
                  <p className="text-sm text-gray-900 mt-1">{rentalRequest.currency}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Created At</label>
                  <p className="text-sm text-gray-900 mt-1">{formatDate(rentalRequest.createdAt)}</p>
                </div>
              </div>

              {rentalRequest.notes && (
                <div>
                  <label className="text-sm font-medium text-gray-700">Notes</label>
                  <p className="text-sm text-gray-900 mt-1 bg-gray-50 p-3 rounded-md">
                    {rentalRequest.notes}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Customer Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <User className="h-5 w-5" />
                <span>Customer Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Customer Name</label>
                  <p className="text-sm text-gray-900 mt-1">
                    {rentalRequest.customer.firstName} {rentalRequest.customer.lastName}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Phone Number</label>
                  <p className="text-sm text-gray-900 mt-1">{rentalRequest.customer.phoneNumber}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Driver Information */}
          {rentalRequest.driver && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <User className="h-5 w-5" />
                  <span>Driver Information</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Driver Name</label>
                    <p className="text-sm text-gray-900 mt-1">
                      {rentalRequest.driver.user.firstName} {rentalRequest.driver.user.lastName}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Driver ID</label>
                    <p className="text-sm text-gray-900 mt-1 font-mono">{rentalRequest.driver.driverId}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Phone Number</label>
                    <p className="text-sm text-gray-900 mt-1">{rentalRequest.driver.user.phoneNumber}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Ride Service Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Car className="h-5 w-5" />
                <span>Ride Service Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Service Name</label>
                  <p className="text-sm text-gray-900 mt-1">{rentalRequest.rideService.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Vehicle Type</label>
                  <p className="text-sm text-gray-900 mt-1">{rentalRequest.rideService.vehicleType}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Currency</label>
                  <p className="text-sm text-gray-900 mt-1">{rentalRequest.rideService.currency}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Messages */}
          {rentalRequest.messages && rentalRequest.messages.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <MessageSquare className="h-5 w-5" />
                  <span>Messages</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  {rentalRequest.messages.map((message: any, index: number) => (
                    <div key={message.id || index} className="border rounded-lg p-4 bg-gray-50">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium text-gray-900">
                            {message.sender?.firstName} {message.sender?.lastName}
                          </span>
                          <Badge 
                            variant={message.senderType === 'CUSTOMER' ? 'default' : 'outline'}
                            className={
                              message.senderType === 'CUSTOMER' ? 'bg-blue-100 text-blue-800' :
                              message.senderType === 'DRIVER' ? 'bg-green-100 text-green-800' :
                              'bg-gray-100 text-gray-800'
                            }
                          >
                            {message.senderType}
                          </Badge>
                        </div>
                        <span className="text-xs text-gray-500">{formatDate(message.createdAt)}</span>
                      </div>
                      <p className="text-sm text-gray-700">{message.content}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Payment Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <DollarSign className="h-5 w-5" />
                <span>Payment Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {rentalRequest.paymentInfo && rentalRequest.paymentInfo.allTransactions && rentalRequest.paymentInfo.allTransactions.length > 0 ? (
                <div className="space-y-6">
                  {/* Grouped Transaction Summary */}
                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-800">Transaction Summary</h4>
                    
                    {rentalRequest.paymentInfo.original && (
                      <div className="border rounded-lg p-4 bg-green-50">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium text-green-800">Original Payment</h4>
                            <p className="text-sm text-green-600">
                              {formatPrice(rentalRequest.paymentInfo.original.amount, rentalRequest.paymentInfo.original.currency)}
                            </p>
                          </div>
                          <Badge variant="default" className="bg-green-100 text-green-800">
                            {rentalRequest.paymentInfo.original.status}
                          </Badge>
                        </div>
                        <div className="mt-2 text-xs text-green-600">
                          <p>Transaction ID: {rentalRequest.paymentInfo.original.gatewayTransactionId}</p>
                          <p>Date: {formatDate(rentalRequest.paymentInfo.original.createdAt)}</p>
                        </div>
                      </div>
                    )}

                    {rentalRequest.paymentInfo.fee && (
                      <div className="border rounded-lg p-4 bg-yellow-50">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium text-yellow-800">Platform Fee</h4>
                            <p className="text-sm text-yellow-600">
                              {formatPrice(rentalRequest.paymentInfo.fee.amount, rentalRequest.paymentInfo.fee.currency)}
                            </p>
                          </div>
                          <Badge variant="outline" className="border-yellow-300 text-yellow-800">
                            {rentalRequest.paymentInfo.fee.status}
                          </Badge>
                        </div>
                        <div className="mt-2 text-xs text-yellow-600">
                          <p>Transaction ID: {rentalRequest.paymentInfo.fee.gatewayTransactionId}</p>
                          <p>Date: {formatDate(rentalRequest.paymentInfo.fee.createdAt)}</p>
                        </div>
                      </div>
                    )}

                    {rentalRequest.paymentInfo.serviceFee && (
                      <div className="border rounded-lg p-4 bg-blue-50">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium text-blue-800">Service Fee</h4>
                            <p className="text-sm text-blue-600">
                              {formatPrice(rentalRequest.paymentInfo.serviceFee.amount, rentalRequest.paymentInfo.serviceFee.currency)}
                            </p>
                          </div>
                          <Badge variant="outline" className="border-blue-300 text-blue-800">
                            {rentalRequest.paymentInfo.serviceFee.status}
                          </Badge>
                        </div>
                        <div className="mt-2 text-xs text-blue-600">
                          <p>Transaction ID: {rentalRequest.paymentInfo.serviceFee.gatewayTransactionId}</p>
                          <p>Date: {formatDate(rentalRequest.paymentInfo.serviceFee.createdAt)}</p>
                        </div>
                      </div>
                    )}

                    <div className="border rounded-lg p-4 bg-gray-50">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Total Transactions:</span>
                          <span className="ml-2 font-medium">{rentalRequest.paymentInfo.allTransactions.length}</span>
                        </div>
                                                 <div>
                           <span className="text-gray-600">Total Amount:</span>
                           <span className="ml-2 font-medium">
                             {formatPrice(
                               rentalRequest.paymentInfo.allTransactions.reduce((sum: number, t: any) => sum + (t.amount || 0), 0),
                               rentalRequest.currency
                             )}
                           </span>
                         </div>
                      </div>
                    </div>
                  </div>

                  {/* Detailed Transactions Table */}
                  <div>
                    <h4 className="font-medium text-gray-800 mb-4">All External Transactions</h4>
                    <div className="overflow-x-auto border border-gray-200 rounded-lg">
                      <table className="w-full min-w-[800px] border-collapse">
                        <thead>
                          <tr className="bg-gray-50 border-b border-gray-200">
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Transaction ID</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Type</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Amount</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Currency</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Gateway</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Date</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {rentalRequest.paymentInfo.allTransactions.map((transaction: any, index: number) => (
                            <tr key={transaction.id || index} className="hover:bg-gray-50 transition-colors">
                              <td className="px-4 py-3 text-sm text-gray-900 font-mono">
                                {transaction.gatewayTransactionId || 'N/A'}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-900">
                                <Badge 
                                  variant={
                                    transaction.transactionType === 'ORIGINAL' ? 'default' :
                                    transaction.transactionType === 'FEE' ? 'outline' :
                                    transaction.transactionType === 'SERVICE_FEE' ? 'secondary' : 'outline'
                                  }
                                  className={
                                    transaction.transactionType === 'ORIGINAL' ? 'bg-green-100 text-green-800' :
                                    transaction.transactionType === 'FEE' ? 'border-yellow-300 text-yellow-800' :
                                    transaction.transactionType === 'SERVICE_FEE' ? 'bg-blue-100 text-blue-800' : ''
                                  }
                                >
                                  {transaction.transactionType?.replace('_', ' ') || 'Unknown'}
                                </Badge>
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-900 font-semibold">
                                {formatPrice(transaction.amount, transaction.currency)}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-900">
                                {transaction.currency || 'N/A'}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-900">
                                <Badge 
                                  variant={
                                    transaction.status === 'SUCCESS' ? 'default' :
                                    transaction.status === 'PENDING' ? 'outline' :
                                    transaction.status === 'FAILED' ? 'destructive' : 'outline'
                                  }
                                  className={
                                    transaction.status === 'SUCCESS' ? 'bg-green-100 text-green-800' :
                                    transaction.status === 'PENDING' ? 'border-yellow-300 text-yellow-800' :
                                    transaction.status === 'FAILED' ? 'bg-red-100 text-red-800' : ''
                                  }
                                >
                                  {transaction.status || 'Unknown'}
                                </Badge>
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-900">
                                {transaction.paymentGateway || 'N/A'}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-600">
                                {formatDate(transaction.createdAt)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <DollarSign className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-gray-500">No payment information available</p>
                  <p className="text-sm text-gray-400 mt-2">
                    Payment transactions will appear here when processed
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - 25% */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Request Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Request ID:</span>
                <span className="text-sm font-mono">{rentalRequest.requestId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Status:</span>
                <Badge variant={getStatusBadgeVariant(rentalRequest.status)}>
                  {rentalRequest.status.replace('_', ' ')}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Duration:</span>
                <span className="text-sm">{rentalRequest.days} days</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Total Amount:</span>
                <span className="text-sm font-semibold">
                  {formatPrice(rentalRequest.agreedPrice || rentalRequest.proposedPrice, rentalRequest.currency)}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
