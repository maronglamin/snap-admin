'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useUsers, useUpdateUserStatus } from '@/hooks/useUsers';
import { useAdminStore } from '@/stores/adminStore';
import { User, UserStatus, UserType, KycStatus } from '@/types';
import { Search, User as UserIcon, Mail, Phone, Calendar, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

export default function UsersPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const { addNotification } = useAdminStore();
  
  const { data: usersData, isLoading, error } = useUsers({
    search: searchQuery || undefined,
    status: filterStatus !== 'all' ? filterStatus as UserStatus : undefined,
    type: filterType !== 'all' ? filterType as UserType : undefined,
  });

  // Debug logging
  console.log('Users page - usersData:', usersData);
  console.log('Users page - isLoading:', isLoading);
  console.log('Users page - error:', error);

  const updateUserStatusMutation = useUpdateUserStatus();

  const handleStatusUpdate = async (userId: string, newStatus: UserStatus) => {
    try {
      await updateUserStatusMutation.mutateAsync({ id: userId, status: newStatus });
      addNotification({
        type: 'success',
        title: 'Status Updated',
        message: 'User status has been updated successfully.',
      });
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Update Failed',
        message: 'Failed to update user status.',
      });
    }
  };

  const getStatusBadge = (status: UserStatus) => {
    const variants: Record<UserStatus, "default" | "secondary" | "destructive" | "outline"> = {
      [UserStatus.ACTIVE]: 'default',
      [UserStatus.INACTIVE]: 'secondary',
      [UserStatus.SUSPENDED]: 'destructive',
      [UserStatus.PENDING]: 'outline',
    };
    
    return <Badge variant={variants[status]}>{status}</Badge>;
  };

  const getKycStatusBadge = (kycStatus?: KycStatus) => {
    if (!kycStatus) return null;
    
    const variants: Record<KycStatus, "default" | "secondary" | "destructive" | "outline"> = {
      [KycStatus.VERIFIED]: 'default',
      [KycStatus.PENDING]: 'outline',
      [KycStatus.REJECTED]: 'destructive',
      [KycStatus.NOT_REQUIRED]: 'secondary',
    };
    
    return <Badge variant={variants[kycStatus]} className="ml-2">{kycStatus}</Badge>;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-600">Loading users...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-red-600">Error loading users</div>
        <div className="mt-2 text-sm text-gray-500">Please check your connection and try again.</div>
      </div>
    );
  }

  // Check if data exists and has the expected structure
  const users = usersData?.data || [];
  console.log('Users to display:', users);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-gray-900">User Management</h2>
        <Button>Add User</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Users ({users.length} total)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search users by name, email, or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value={UserStatus.ACTIVE}>Active</SelectItem>
                  <SelectItem value={UserStatus.INACTIVE}>Inactive</SelectItem>
                  <SelectItem value={UserStatus.SUSPENDED}>Suspended</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value={UserType.BUYER}>Buyer</SelectItem>
                  <SelectItem value={UserType.SELLER}>Seller</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <div className="text-gray-500">
                        {usersData ? 'No users found matching your criteria.' : 'No users data available.'}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                            <UserIcon className="h-4 w-4 text-gray-600" />
                          </div>
                          <div className="ml-3">
                            <div className="font-medium text-gray-900">
                              {user.firstName} {user.lastName}
                            </div>
                            <div className="text-sm text-gray-500">ID: {user.id}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center text-sm text-gray-600">
                            <Mail className="h-3 w-3 mr-1" />
                            {user.email}
                          </div>
                          <div className="flex items-center text-sm text-gray-600">
                            <Phone className="h-3 w-3 mr-1" />
                            {user.phoneNumber}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <Badge variant="outline">{user.type}</Badge>
                          {user.sellerKyc && getKycStatusBadge(user.sellerKyc.status)}
                        </div>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(user.status)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center text-sm text-gray-600">
                          <Calendar className="h-3 w-3 mr-1" />
                          {new Date(user.createdAt).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedUser(user)}
                          >
                            View
                          </Button>
                          {user.status !== UserStatus.SUSPENDED ? (
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleStatusUpdate(user.id, UserStatus.SUSPENDED)}
                            >
                              Suspend
                            </Button>
                          ) : (
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => handleStatusUpdate(user.id, UserStatus.ACTIVE)}
                            >
                              Activate
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {selectedUser && (
        <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>User Details</DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              <div className="flex items-center">
                <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center">
                  <UserIcon className="h-8 w-8 text-gray-600" />
                </div>
                <div className="ml-4">
                  <h3 className="text-xl font-bold text-gray-900">
                    {selectedUser.firstName} {selectedUser.lastName}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {selectedUser.type === UserType.SELLER ? 'Seller Account' : 'Buyer Account'}
                  </p>
                </div>
                <div className="ml-auto">
                  {getStatusBadge(selectedUser.status)}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-2">Contact Information</h4>
                  <div className="bg-gray-50 p-4 rounded-md space-y-2">
                    <div className="flex items-center">
                      <Mail className="h-4 w-4 text-gray-400 mr-2" />
                      <span className="text-gray-900">{selectedUser.email}</span>
                    </div>
                    <div className="flex items-center">
                      <Phone className="h-4 w-4 text-gray-400 mr-2" />
                      <span className="text-gray-900">{selectedUser.phoneNumber}</span>
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-2">Account Information</h4>
                  <div className="bg-gray-50 p-4 rounded-md space-y-2">
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                      <span className="text-gray-900">
                        Joined on {new Date(selectedUser.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    {selectedUser.sellerKyc && (
                      <div className="flex items-center">
                        <div className={`w-4 h-4 rounded-full mr-2 ${
                          selectedUser.sellerKyc.status === KycStatus.VERIFIED ? 'bg-green-500' :
                          selectedUser.sellerKyc.status === KycStatus.PENDING ? 'bg-yellow-500' :
                          selectedUser.sellerKyc.status === KycStatus.REJECTED ? 'bg-red-500' :
                          'bg-gray-500'
                        }`} />
                        <span className="text-gray-900">
                          KYC: {selectedUser.sellerKyc.status}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {selectedUser.sellerKyc?.status === KycStatus.PENDING && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                  <div className="flex items-start">
                    <AlertTriangle className="h-5 w-5 text-yellow-500 mr-2 mt-0.5" />
                    <div>
                      <p className="text-sm text-yellow-800">
                        This seller has a pending KYC verification request.
                      </p>
                      <div className="mt-3 flex space-x-3">
                        <Button size="sm" className="bg-green-600 hover:bg-green-700">
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Approve KYC
                        </Button>
                        <Button variant="outline" size="sm">
                          <XCircle className="h-4 w-4 mr-1" />
                          Reject KYC
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-between pt-4 border-t">
                <Button variant="outline">Edit User</Button>
                {selectedUser.status !== UserStatus.SUSPENDED ? (
                  <Button variant="destructive">Suspend Account</Button>
                ) : (
                  <Button>Activate Account</Button>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
} 