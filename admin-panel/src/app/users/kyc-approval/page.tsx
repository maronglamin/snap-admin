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
  UserCheck,
  ShoppingBag,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Mail,
  Phone,
  Calendar,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Building2,
  FileText,
  CreditCard,
  Wallet,
  MapPin,
  Clock,
  User,
  Shield,
  Check,
  X,
  Edit
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { usersApi } from '@/services/api';

interface KYCUser {
  id: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  email?: string;
  type: 'SELLER';
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'PENDING';
  joinDate: string;
  lastActive: string;
  kycStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
  kycVerifiedAt: string | null;
  businessName: string;
  businessType: string;
  kycDetails: {
    id: string;
    businessName: string;
    businessType: string;
    registrationNumber: string | null;
    taxId: string | null;
    address: string;
    city: string;
    state: string;
    postalCode: string;
    country: string[];
    documentType: string;
    documentNumber: string;
    documentUrl: string;
    documentExpiryDate: string | null;
    status: string;
    rejectionReason: string | null;
    verifiedAt: string | null;
    createdAt: string;
    statusChangedBy?: string;
    statusChangedAt?: string;
    bankAccounts: Array<{
      id: string;
      accountNumber: string;
      accountName: string;
      bankName: string;
      bankCode: string;
      currency: string;
    }>;
    wallets: Array<{
      id: string;
      walletType: string;
      walletAddress: string;
      account: string;
      currency: string;
    }>;
  };
}

export default function KYCApprovalPage() {
  const [kycUsers, setKycUsers] = useState<KYCUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<KYCUser | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isActionDialogOpen, setIsActionDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<'approve' | 'reject' | 'suspend'>('approve');
  const [rejectionReason, setRejectionReason] = useState('');
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const itemsPerPage = 10;

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    suspended: 0
  });

  // Debounced search effect
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Reset to first page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchQuery]);

  // Load KYC users
  useEffect(() => {
    loadKYCUsers();
  }, [currentPage, debouncedSearchQuery, filterStatus]);

  const loadKYCUsers = async () => {
    try {
      setIsLoading(true);
      setError('');
      
      const params: any = {
        page: currentPage,
        limit: itemsPerPage,
        type: 'SELLER', // Only get sellers
        hasKYC: true, // Only get users with KYC
      };

      if (debouncedSearchQuery) {
        params.search = debouncedSearchQuery;
      }

      if (filterStatus !== 'all') {
        params.kycStatus = filterStatus;
      }

      const response = await usersApi.getAll(params);
      
      setKycUsers(response.data || []);
      setTotalUsers(response.pagination?.total || 0);
      setTotalPages(response.pagination?.totalPages || 1);

      // Calculate stats
      const allUsers = response.data || [];
      setStats({
        total: allUsers.length,
        pending: allUsers.filter((user: KYCUser) => user.kycStatus === 'PENDING').length,
        approved: allUsers.filter((user: KYCUser) => user.kycStatus === 'APPROVED').length,
        rejected: allUsers.filter((user: KYCUser) => user.kycStatus === 'REJECTED').length,
        suspended: allUsers.filter((user: KYCUser) => user.kycStatus === 'SUSPENDED').length,
      });
    } catch (error) {
      console.error('Error loading KYC users:', error);
      setError('Failed to load KYC users');
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewUser = async (user: KYCUser) => {
    try {
      const response = await usersApi.getById(user.id);

      setSelectedUser(response.data);
      setIsViewDialogOpen(true);
    } catch (error) {
      console.error('Error loading user details:', error);
      setError('Failed to load user details');
    }
  };

  const handleKycAction = async () => {
    if (!selectedUser) return;

    try {
      const kycData = {
        status: actionType === 'approve' ? 'APPROVED' : actionType === 'reject' ? 'REJECTED' : 'SUSPENDED',
        rejectionReason: (actionType === 'reject' || actionType === 'suspend') ? rejectionReason : null,
      };



      await usersApi.updateKyc(selectedUser.id, kycData);
      
      // Refresh users list
      loadKYCUsers();
      
      // Close dialogs
      setIsActionDialogOpen(false);
      setIsViewDialogOpen(false);
      setSelectedUser(null);
      setRejectionReason('');
    } catch (error) {
      console.error('Error updating KYC status:', error);
      setError('Failed to update KYC status');
    }
  };

  const handleEditKyc = async () => {
    if (!selectedUser) return;

    try {
      const kycData = {
        status: actionType === 'approve' ? 'APPROVED' : actionType === 'reject' ? 'REJECTED' : 'SUSPENDED',
        rejectionReason: (actionType === 'reject' || actionType === 'suspend') ? rejectionReason : null,
      };



      await usersApi.updateKyc(selectedUser.id, kycData);
      
      // Refresh users list
      loadKYCUsers();
      
      // Close dialogs
      setIsEditDialogOpen(false);
      setIsViewDialogOpen(false);
      setSelectedUser(null);
      setRejectionReason('');
    } catch (error) {
      console.error('Error updating KYC status:', error);
      setError('Failed to update KYC status');
    }
  };

  const getKycStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'APPROVED': return 'default'; // Blue background
      case 'PENDING': return 'outline'; // Blue outline
      case 'REJECTED': return 'destructive'; // Red for rejected
      case 'SUSPENDED': return 'destructive'; // Red for suspended
      default: return 'outline';
    }
  };

  const getKycStatusIcon = (status: string) => {
    switch (status) {
      case 'APPROVED': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'PENDING': return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'REJECTED': return <XCircle className="h-4 w-4 text-red-600" />;
      case 'SUSPENDED': return <AlertTriangle className="h-4 w-4 text-red-600" />;
      default: return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading KYC applications...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Applications</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              All KYC applications
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting review
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
            <p className="text-xs text-muted-foreground">
              Verified sellers
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rejected</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
            <p className="text-xs text-muted-foreground">
              Failed verification
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Suspended</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.suspended}</div>
            <p className="text-xs text-muted-foreground">
              Temporarily blocked
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle>KYC Applications</CardTitle>
          <CardDescription>
            Review seller business verification applications
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by business name, seller name, or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="sm:w-[150px]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="APPROVED">Approved</SelectItem>
                <SelectItem value="REJECTED">Rejected</SelectItem>
                <SelectItem value="SUSPENDED">Suspended</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* KYC Applications Table */}
          <div className="space-y-4">
            {kycUsers.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <Building2 className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="font-medium text-gray-900">
                        {user.businessName}
                      </h3>
                      <Badge variant={getKycStatusBadgeVariant(user.kycStatus)}>
                        {user.kycStatus}
                      </Badge>
                      {getKycStatusIcon(user.kycStatus)}
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                      <div className="flex items-center">
                        <User className="h-4 w-4 mr-1" />
                        {user.firstName} {user.lastName}
                      </div>
                      <div className="flex items-center">
                        <Phone className="h-4 w-4 mr-1" />
                        {user.phoneNumber}
                      </div>
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-1" />
                        Applied {formatDate(user.kycDetails.createdAt)}
                      </div>
                      {user.kycDetails.statusChangedBy && (
                        <div className="flex items-center">
                          <Shield className="h-4 w-4 mr-1" />
                          Status changed by {user.kycDetails.statusChangedBy}
                          {user.kycDetails.statusChangedAt && (
                            <span className="ml-1">on {formatDate(user.kycDetails.statusChangedAt)}</span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center space-x-4 text-xs text-gray-500 mt-1">
                      <span className="bg-gray-100 px-2 py-1 rounded">
                        {user.businessType}
                      </span>
                      {user.kycDetails.bankAccounts.length > 0 && (
                        <span className="flex items-center">
                          <CreditCard className="h-3 w-3 mr-1" />
                          {user.kycDetails.bankAccounts.length} bank account(s)
                        </span>
                      )}
                      {user.kycDetails.wallets.length > 0 && (
                        <span className="flex items-center">
                          <Wallet className="h-3 w-3 mr-1" />
                          {user.kycDetails.wallets.length} wallet(s)
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleViewUser(user)}>
                      <Eye className="mr-2 h-4 w-4" />
                      View Details
                    </DropdownMenuItem>
                    {user.kycStatus === 'PENDING' && (
                      <>
                        <DropdownMenuItem onClick={() => {
                          setSelectedUser(user);
                          setActionType('approve');
                          setIsActionDialogOpen(true);
                        }}>
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Approve KYC
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => {
                          setSelectedUser(user);
                          setActionType('reject');
                          setIsActionDialogOpen(true);
                        }}>
                          <XCircle className="mr-2 h-4 w-4" />
                          Reject KYC
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalUsers > 0 && (
            <div className="flex items-center justify-between mt-6">
              <div className="text-sm text-gray-700">
                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalUsers)} of {totalUsers} results
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

          {kycUsers.length === 0 && (
            <div className="text-center py-8">
              <Shield className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No KYC applications found</h3>
              <p className="mt-1 text-sm text-gray-500">
                Try adjusting your search or filter criteria.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* View KYC Details Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>KYC Application Details</DialogTitle>
            <DialogDescription>
              Review complete business verification information.
            </DialogDescription>
          </DialogHeader>
          
          {selectedUser && (
            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-center mb-6">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                  <Building2 className="h-8 w-8 text-blue-600" />
                </div>
                <div className="ml-4">
                  <h2 className="text-xl font-bold text-gray-900">
                    {selectedUser.businessName}
                  </h2>
                  <p className="text-sm text-gray-500">
                    {selectedUser.businessType} • {selectedUser.firstName} {selectedUser.lastName}
                  </p>
                </div>
                <div className="ml-auto">
                  <Badge variant={getKycStatusBadgeVariant(selectedUser.kycStatus)}>
                    {selectedUser.kycStatus}
                  </Badge>
                </div>
              </div>

              {/* Business Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-2 flex items-center">
                    <Building2 className="h-4 w-4 mr-2" />
                    Business Information
                  </h4>
                  <div className="bg-gray-50 p-4 rounded-md space-y-3">
                    <div>
                      <span className="text-xs text-gray-500">Business Name</span>
                      <p className="text-sm font-medium">{selectedUser.businessName}</p>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500">Business Type</span>
                      <p className="text-sm font-medium">{selectedUser.businessType}</p>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500">Application Date</span>
                      <p className="text-sm font-medium">{formatDate(selectedUser.kycDetails.createdAt)}</p>
                    </div>
                    {selectedUser.kycDetails.verifiedAt && (
                      <div>
                        <span className="text-xs text-gray-500">Verified Date</span>
                        <p className="text-sm font-medium">{formatDate(selectedUser.kycDetails.verifiedAt)}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-2 flex items-center">
                    <User className="h-4 w-4 mr-2" />
                    Contact Information
                  </h4>
                  <div className="bg-gray-50 p-4 rounded-md space-y-3">
                    <div>
                      <span className="text-xs text-gray-500">Owner Name</span>
                      <p className="text-sm font-medium">{selectedUser.firstName} {selectedUser.lastName}</p>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500">Phone Number</span>
                      <p className="text-sm font-medium">{selectedUser.phoneNumber}</p>
                    </div>
                    {selectedUser.email && (
                      <div>
                        <span className="text-xs text-gray-500">Email</span>
                        <p className="text-sm font-medium">{selectedUser.email}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Document Information */}
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-2 flex items-center">
                  <FileText className="h-4 w-4 mr-2" />
                  Document Information
                </h4>
                <div className="bg-gray-50 p-4 rounded-md space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-xs text-gray-500">Document Type</span>
                      <p className="text-sm font-medium">
                        {selectedUser.kycDetails.documentType || 'Not specified'}
                      </p>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500">Document Number</span>
                      <p className="text-sm font-medium">
                        {selectedUser.kycDetails.documentNumber || 'Not specified'}
                      </p>
                    </div>
                    {selectedUser.kycDetails.documentExpiryDate && (
                      <div>
                        <span className="text-xs text-gray-500">Document Expiry Date</span>
                        <p className="text-sm font-medium">{formatDate(selectedUser.kycDetails.documentExpiryDate)}</p>
                      </div>
                    )}
                  </div>
                  
                  {/* Document Image */}
                  {selectedUser.kycDetails.documentUrl ? (
                    <div>
                      <span className="text-xs text-gray-500 mb-2 block">Document Image</span>
                      <div className="border rounded-lg overflow-hidden">
                        <img 
                          src={selectedUser.kycDetails.documentUrl} 
                          alt="KYC Document"
                          className="w-full h-auto max-h-96 object-contain"
                          onError={(e) => {
                            const target = e.currentTarget as HTMLImageElement;
                            target.style.display = 'none';
                            const fallback = target.nextElementSibling as HTMLElement;
                            if (fallback) fallback.style.display = 'block';
                          }}
                        />
                        <div className="hidden p-4 text-center text-gray-500 bg-gray-100">
                          <FileText className="h-8 w-8 mx-auto mb-2" />
                          <p>Document image not available</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 text-center text-gray-500 bg-gray-100 rounded-lg">
                      <FileText className="h-8 w-8 mx-auto mb-2" />
                      <p>No document image uploaded</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Business Address */}
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-2 flex items-center">
                  <MapPin className="h-4 w-4 mr-2" />
                  Business Address
                </h4>
                <div className="bg-gray-50 p-4 rounded-md">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-xs text-gray-500">Address</span>
                      <p className="text-sm font-medium">
                        {selectedUser.kycDetails.address || 'Not specified'}
                      </p>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500">City</span>
                      <p className="text-sm font-medium">
                        {selectedUser.kycDetails.city || 'Not specified'}
                      </p>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500">State</span>
                      <p className="text-sm font-medium">
                        {selectedUser.kycDetails.state || 'Not specified'}
                      </p>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500">Postal Code</span>
                      <p className="text-sm font-medium">
                        {selectedUser.kycDetails.postalCode || 'Not specified'}
                      </p>
                    </div>
                    <div className="col-span-2">
                      <span className="text-xs text-gray-500">Countries</span>
                      <p className="text-sm font-medium">
                        {selectedUser.kycDetails.country && Array.isArray(selectedUser.kycDetails.country) 
                          ? selectedUser.kycDetails.country.join(', ') 
                          : 'Not specified'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Business Registration */}
              {(selectedUser.kycDetails.registrationNumber || selectedUser.kycDetails.taxId) && (
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-2 flex items-center">
                    <Building2 className="h-4 w-4 mr-2" />
                    Business Registration
                  </h4>
                  <div className="bg-gray-50 p-4 rounded-md">
                    <div className="grid grid-cols-2 gap-4">
                      {selectedUser.kycDetails.registrationNumber && (
                        <div>
                          <span className="text-xs text-gray-500">Registration Number</span>
                          <p className="text-sm font-medium">{selectedUser.kycDetails.registrationNumber}</p>
                        </div>
                      )}
                      {selectedUser.kycDetails.taxId && (
                        <div>
                          <span className="text-xs text-gray-500">Tax ID</span>
                          <p className="text-sm font-medium">{selectedUser.kycDetails.taxId}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Bank Accounts */}
              {selectedUser.kycDetails.bankAccounts.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-2 flex items-center">
                    <CreditCard className="h-4 w-4 mr-2" />
                    Bank Accounts ({selectedUser.kycDetails.bankAccounts.length})
                  </h4>
                  <div className="space-y-3">
                    {selectedUser.kycDetails.bankAccounts.map((account, index) => (
                      <div key={account.id} className="bg-gray-50 p-4 rounded-md">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <span className="text-xs text-gray-500">Bank Name</span>
                            <p className="text-sm font-medium">{account.bankName}</p>
                          </div>
                          <div>
                            <span className="text-xs text-gray-500">Bank Code</span>
                            <p className="text-sm font-medium">{account.bankCode}</p>
                          </div>
                          <div>
                            <span className="text-xs text-gray-500">Account Name</span>
                            <p className="text-sm font-medium">{account.accountName}</p>
                          </div>
                          <div>
                            <span className="text-xs text-gray-500">Account Number</span>
                            <p className="text-sm font-medium font-mono">{account.accountNumber}</p>
                          </div>
                          <div>
                            <span className="text-xs text-gray-500">Currency</span>
                            <p className="text-sm font-medium">{account.currency}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Wallets */}
              {selectedUser.kycDetails.wallets.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-2 flex items-center">
                    <Wallet className="h-4 w-4 mr-2" />
                    Digital Wallets ({selectedUser.kycDetails.wallets.length})
                  </h4>
                  <div className="space-y-3">
                    {selectedUser.kycDetails.wallets.map((wallet, index) => (
                      <div key={wallet.id} className="bg-gray-50 p-4 rounded-md">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <span className="text-xs text-gray-500">Wallet Type</span>
                            <p className="text-sm font-medium">{wallet.walletType}</p>
                          </div>
                          <div>
                            <span className="text-xs text-gray-500">Account</span>
                            <p className="text-sm font-medium">{wallet.account}</p>
                          </div>
                          <div className="col-span-2">
                            <span className="text-xs text-gray-500">Wallet Address</span>
                            <p className="text-sm font-medium font-mono break-all">{wallet.walletAddress}</p>
                          </div>
                          <div>
                            <span className="text-xs text-gray-500">Currency</span>
                            <p className="text-sm font-medium">{wallet.currency}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Rejection Reason */}
              {selectedUser.kycDetails.rejectionReason && (
                <div>
                  <h4 className="text-sm font-medium text-red-500 mb-2 flex items-center">
                    <XCircle className="h-4 w-4 mr-2" />
                    Rejection Reason
                  </h4>
                  <div className="bg-red-50 border border-red-200 p-4 rounded-md">
                    <p className="text-sm text-red-800">{selectedUser.kycDetails.rejectionReason}</p>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex space-x-3 pt-4 border-t">
                {selectedUser.kycStatus === 'PENDING' && (
                  <>
                    <Button
                      onClick={() => {
                        setActionType('approve');
                        setIsActionDialogOpen(true);
                      }}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Check className="mr-2 h-4 w-4" />
                      Approve KYC
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setActionType('reject');
                        setIsActionDialogOpen(true);
                      }}
                    >
                      <X className="mr-2 h-4 w-4" />
                      Reject KYC
                    </Button>
                  </>
                )}
                
                {/* Edit KYC Status - Available for all statuses */}
                <Button
                  variant="outline"
                  onClick={() => {
                    setActionType('approve');
                    setIsEditDialogOpen(true);
                  }}
                >
                  <Edit className="mr-2 h-4 w-4" />
                  Edit KYC Status
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* KYC Action Dialog */}
      <Dialog open={isActionDialogOpen} onOpenChange={setIsActionDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {actionType === 'approve' ? 'Approve KYC Application' : actionType === 'reject' ? 'Reject KYC Application' : 'Suspend KYC Application'}
            </DialogTitle>
            <DialogDescription>
              {actionType === 'approve' 
                ? 'Are you sure you want to approve this KYC application? The seller will be able to start selling immediately.'
                : actionType === 'reject' 
                ? 'Please provide a reason for rejecting this KYC application.'
                : 'Please provide a reason for suspending this KYC application. The seller will be temporarily blocked from selling.'
              }
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {(actionType === 'reject' || actionType === 'suspend') && (
              <div>
                <label className="text-sm font-medium text-gray-700">
                  {actionType === 'reject' ? 'Rejection Reason' : 'Suspension Reason'}
                </label>
                <textarea
                  className="mt-1 w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={4}
                  placeholder={`Enter the reason for ${actionType === 'reject' ? 'rejection' : 'suspension'}...`}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                />
              </div>
            )}
            
            <div className="flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={() => {
                  setIsActionDialogOpen(false);
                  setRejectionReason('');
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleKycAction}
                className={actionType === 'approve' ? 'bg-green-600 hover:bg-green-700' : actionType === 'reject' ? 'bg-red-600 hover:bg-red-700' : 'bg-yellow-600 hover:bg-yellow-700'}
                disabled={(actionType === 'reject' || actionType === 'suspend') && !rejectionReason.trim()}
              >
                {actionType === 'approve' ? (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Approve
                  </>
                ) : actionType === 'reject' ? (
                  <>
                    <X className="mr-2 h-4 w-4" />
                    Reject
                  </>
                ) : (
                  <>
                    <Shield className="mr-2 h-4 w-4" />
                    Suspend
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit KYC Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit KYC Status</DialogTitle>
            <DialogDescription>
              Update the KYC status for this seller. You can approve, reject, or suspend their account.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700">KYC Status</label>
              <Select value={actionType} onValueChange={(value: 'approve' | 'reject' | 'suspend') => setActionType(value)}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="approve">Approve</SelectItem>
                  <SelectItem value="reject">Reject</SelectItem>
                  <SelectItem value="suspend">Suspend</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {(actionType === 'reject' || actionType === 'suspend') && (
              <div>
                <label className="text-sm font-medium text-gray-700">
                  {actionType === 'reject' ? 'Rejection Reason' : 'Suspension Reason'}
                </label>
                <textarea
                  className="mt-1 w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={4}
                  placeholder={`Enter the reason for ${actionType === 'reject' ? 'rejection' : 'suspension'}...`}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                />
              </div>
            )}
            
            <div className="flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={() => {
                  setIsEditDialogOpen(false);
                  setRejectionReason('');
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleEditKyc}
                className={actionType === 'approve' ? 'bg-green-600 hover:bg-green-700' : actionType === 'reject' ? 'bg-red-600 hover:bg-red-700' : 'bg-yellow-600 hover:bg-yellow-700'}
                disabled={(actionType === 'reject' || actionType === 'suspend') && !rejectionReason.trim()}
              >
                {actionType === 'approve' ? (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Approve
                  </>
                ) : actionType === 'reject' ? (
                  <>
                    <X className="mr-2 h-4 w-4" />
                    Reject
                  </>
                ) : (
                  <>
                    <Shield className="mr-2 h-4 w-4" />
                    Suspend
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
} 