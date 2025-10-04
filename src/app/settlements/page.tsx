'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useSettlements, useProcessSettlement } from '@/hooks/useSettlements';
import { useAdminStore } from '@/stores/adminStore';
import { Settlement, SettlementStatus } from '@/types';
import { Search, User, DollarSign, Calendar, CheckCircle, XCircle, AlertTriangle, ArrowRight } from 'lucide-react';

export default function SettlementsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedSettlement, setSelectedSettlement] = useState<Settlement | null>(null);
  const { addNotification } = useAdminStore();
  
  const { data: settlementsData, isLoading } = useSettlements({
    search: searchQuery || undefined,
    status: filterStatus !== 'all' ? filterStatus as SettlementStatus : undefined,
  });

  const processSettlementMutation = useProcessSettlement();

  const handleProcessSettlement = async (settlementId: string) => {
    try {
      await processSettlementMutation.mutateAsync(settlementId);
      addNotification({
        type: 'success',
        title: 'Settlement Processed',
        message: 'Settlement has been processed successfully.',
      });
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Processing Failed',
        message: 'Failed to process settlement.',
      });
    }
  };

  const getStatusBadge = (status: SettlementStatus) => {
    const variants: Record<SettlementStatus, "default" | "secondary" | "destructive" | "outline"> = {
      [SettlementStatus.PENDING]: 'outline',
      [SettlementStatus.PROCESSING]: 'secondary',
      [SettlementStatus.COMPLETED]: 'default',
      [SettlementStatus.FAILED]: 'destructive',
    };
    
    return <Badge variant={variants[status]}>{status}</Badge>;
  };

  const getStatusIcon = (status: SettlementStatus) => {
    switch (status) {
      case SettlementStatus.COMPLETED:
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case SettlementStatus.PROCESSING:
        return <ArrowRight className="h-4 w-4 text-blue-600" />;
      case SettlementStatus.PENDING:
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case SettlementStatus.FAILED:
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-600">Loading settlements...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-gray-900">Settlement Management</h2>
        <Button>Batch Process</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <div className="flex items-center p-6">
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center text-yellow-600">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-gray-500">Pending Settlements</h3>
              <p className="text-2xl font-bold text-gray-900">
                ${settlementsData?.data
                  .filter(s => s.status === SettlementStatus.PENDING)
                  .reduce((acc, s) => acc + s.amount, 0)
                  .toFixed(2) || '0.00'}
              </p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center p-6">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
              <ArrowRight className="h-6 w-6" />
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-gray-500">Processing</h3>
              <p className="text-2xl font-bold text-gray-900">
                ${settlementsData?.data
                  .filter(s => s.status === SettlementStatus.PROCESSING)
                  .reduce((acc, s) => acc + s.amount, 0)
                  .toFixed(2) || '0.00'}
              </p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center p-6">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center text-green-600">
              <CheckCircle className="h-6 w-6" />
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-gray-500">Completed (Last 30 days)</h3>
              <p className="text-2xl font-bold text-gray-900">
                ${settlementsData?.data
                  .filter(s => s.status === SettlementStatus.COMPLETED)
                  .reduce((acc, s) => acc + s.amount, 0)
                  .toFixed(2) || '0.00'}
              </p>
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Settlements</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by settlement ID or seller name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-40">
                <SelectValue />
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

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Settlement ID</TableHead>
                  <TableHead>Seller</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {settlementsData?.data.map((settlement) => (
                  <TableRow key={settlement.id}>
                    <TableCell>
                      <div className="font-medium text-gray-900">{settlement.id}</div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                          <User className="h-4 w-4 text-gray-600" />
                        </div>
                        <div className="ml-3 font-medium text-gray-900">
                          Seller {settlement.userId}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-gray-900">
                        ${settlement.amount.toFixed(2)} {settlement.currency}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center text-sm text-gray-600">
                        <Calendar className="h-3 w-3 mr-1" />
                        {new Date(settlement.createdAt).toLocaleDateString()}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        {getStatusIcon(settlement.status)}
                        <span className="ml-2">{getStatusBadge(settlement.status)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedSettlement(settlement)}
                        >
                          View
                        </Button>
                        {settlement.status === SettlementStatus.PENDING && (
                          <Button
                            size="sm"
                            onClick={() => handleProcessSettlement(settlement.id)}
                          >
                            Process
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {selectedSettlement && (
        <Dialog open={!!selectedSettlement} onOpenChange={() => setSelectedSettlement(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Settlement Details</DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
                  <DollarSign className="h-6 w-6" />
                </div>
                <div className="ml-4">
                  <h3 className="text-xl font-bold text-gray-900">
                    Settlement {selectedSettlement.id}
                  </h3>
                  <div className="flex items-center mt-1">
                    <Calendar className="h-4 w-4 text-gray-500 mr-1" />
                    <span className="text-sm text-gray-500">
                      Created on {new Date(selectedSettlement.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <div className="ml-auto">
                  {getStatusBadge(selectedSettlement.status)}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-2">Seller Information</h4>
                  <div className="bg-gray-50 p-4 rounded-md">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                        <User className="h-5 w-5 text-gray-600" />
                      </div>
                      <div className="ml-3">
                        <div className="font-medium text-gray-900">
                          Seller {selectedSettlement.userId}
                        </div>
                        <div className="text-sm text-gray-500">
                          ID: {selectedSettlement.userId}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-2">Settlement Details</h4>
                  <div className="bg-gray-50 p-4 rounded-md">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="text-sm text-gray-500">Type:</div>
                      <div className="text-sm font-medium text-gray-900 capitalize">
                        {selectedSettlement.type}
                      </div>
                      <div className="text-sm text-gray-500">Orders:</div>
                      <div className="text-sm font-medium text-gray-900">
                        {selectedSettlement.totalOrdersCount}
                      </div>
                      <div className="text-sm text-gray-500">Status:</div>
                      <div className="text-sm font-medium text-gray-900 capitalize">
                        {selectedSettlement.status}
                      </div>
                      {selectedSettlement.processedAt && (
                        <>
                          <div className="text-sm text-gray-500">Processed Date:</div>
                          <div className="text-sm font-medium text-gray-900">
                            {new Date(selectedSettlement.processedAt).toLocaleDateString()}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-2">Financial Details</h4>
                <div className="bg-gray-50 p-4 rounded-md">
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Gross Amount:</span>
                      <span className="text-sm font-medium text-gray-900">
                        ${selectedSettlement.netAmountBeforeFees.toFixed(2)} {selectedSettlement.currency}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Service Fee:</span>
                      <span className="text-sm font-medium text-red-600">
                        -${selectedSettlement.serviceFeesDeducted.toFixed(2)} {selectedSettlement.currency}
                      </span>
                    </div>
                    <div className="flex justify-between pt-3 border-t border-gray-200">
                      <span className="text-sm font-medium text-gray-900">Net Payout:</span>
                      <span className="text-sm font-bold text-gray-900">
                        ${selectedSettlement.amount.toFixed(2)} {selectedSettlement.currency}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {selectedSettlement.status === SettlementStatus.PENDING && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                  <div className="flex items-start">
                    <AlertTriangle className="h-5 w-5 text-yellow-500 mr-2 mt-0.5" />
                    <div>
                      <p className="text-sm text-yellow-800">
                        This settlement is pending processing.
                      </p>
                      <div className="mt-3 flex space-x-3">
                        <Button
                          onClick={() => handleProcessSettlement(selectedSettlement.id)}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Process Settlement
                        </Button>
                        <Button variant="outline">
                          <XCircle className="h-4 w-4 mr-1" />
                          Reject Settlement
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {selectedSettlement.status === SettlementStatus.FAILED && (
                <div className="bg-red-50 border border-red-200 rounded-md p-4">
                  <div className="flex items-start">
                    <XCircle className="h-5 w-5 text-red-500 mr-2 mt-0.5" />
                    <div>
                      <p className="text-sm text-red-800">
                        This settlement failed to process. Reason: Insufficient account verification.
                      </p>
                      <div className="mt-3">
                        <Button>Retry Settlement</Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-between pt-4 border-t">
                <Button variant="outline">View Orders</Button>
                <Button variant="outline">Download Receipt</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
} 