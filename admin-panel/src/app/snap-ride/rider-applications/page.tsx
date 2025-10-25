'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CheckCircle, XCircle, Clock, AlertCircle, Eye, Download } from 'lucide-react';
import { apiRequest } from '@/services/api';
import { usePermissions } from '@/hooks/usePermissions';
import { PermissionGuard } from '@/components/auth/PermissionGuard';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { useAuthStore } from '@/stores/authStore';
import { useRouter } from 'next/navigation';

interface RiderApplication {
  id: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  email?: string;
  dateOfBirth?: string;
  address: string;
  city: string;
  vehicleType: 'DRIVER' | 'MOTORCYCLE' | 'BICYCLE';
  vehicleModel: string;
  vehiclePlate: string;
  licenseNumber: string;
  licenseExpiry: string;
  insuranceNumber?: string;
  insuranceExpiry?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  experience?: string;
  availability?: string;
  status: 'PENDING' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
  createdAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
  approvedAt?: string;
  rejectionReason?: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    phoneNumber: string;
  };
  documents: Array<{
    id: string;
    documentType: string;
    fileName: string;
    fileUrl: string;
  }>;
}

interface ApplicationStats {
  totalApplications: number;
  pendingApplications: number;
  approvedApplications: number;
  rejectedApplications: number;
  suspendedApplications: number;
  todayApplications: number;
  thisWeekApplications: number;
  thisMonthApplications: number;
}

export default function RiderApplicationsPage() {
  const router = useRouter();
  const { isAuthenticated, checkAuth } = useAuthStore();
  const [applications, setApplications] = useState<RiderApplication[]>([]);
  const [stats, setStats] = useState<ApplicationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedApplication, setSelectedApplication] = useState<RiderApplication | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [isActionDialogOpen, setIsActionDialogOpen] = useState(false);
  const [isDocumentModalOpen, setIsDocumentModalOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<{ fileName: string; fileUrl: string; documentType: string } | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject' | 'suspend' | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0,
  });

  // Filters
  const [filters, setFilters] = useState({
    status: '',
    vehicleType: '',
    search: '',
  });

  const { hasPermission } = usePermissions();

  // Check authentication on mount and load data
  useEffect(() => {
    if (!isAuthenticated || !checkAuth()) {
      console.log('🔍 Debug - Not authenticated, redirecting to login');
      router.push('/');
      return;
    }
    loadApplications();
    loadStats();
  }, [isAuthenticated, router, checkAuth]);

  // Load data when pagination or filters change (only if authenticated)
  useEffect(() => {
    if (isAuthenticated && checkAuth()) {
      loadApplications();
      loadStats();
    }
  }, [pagination.page, filters]);

  const loadApplications = async () => {
    try {
      setLoading(true);
      
      // Debug: Check if token exists
      const token = localStorage.getItem('auth-storage');
      console.log('🔍 Debug - Auth storage:', token);
      
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...(filters.status && filters.status !== 'all' && { status: filters.status }),
        ...(filters.vehicleType && filters.vehicleType !== 'all' && { vehicleType: filters.vehicleType }),
        ...(filters.search && { search: filters.search }),
      });

      const response = await apiRequest(`/rider-applications?${params}`);
      setApplications(response.applications);
      setPagination(response.pagination);
    } catch (error) {
      console.error('Error loading applications:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await apiRequest('/rider-applications/stats/overview');
      setStats(response.stats);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleAction = async () => {
    if (!selectedApplication || !actionType) return;

    try {
      let endpoint = '';
      let data = {};

      switch (actionType) {
        case 'approve':
          endpoint = `/rider-applications/${selectedApplication.id}/approve`;
          break;
        case 'reject':
          endpoint = `/rider-applications/${selectedApplication.id}/reject`;
          data = { rejectionReason };
          break;
        case 'suspend':
          endpoint = `/rider-applications/${selectedApplication.id}/suspend`;
          data = { rejectionReason };
          break;
      }

      await apiRequest(endpoint, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
      setIsActionDialogOpen(false);
      setRejectionReason('');
      setActionType(null);
      loadApplications();
      loadStats();
    } catch (error) {
      console.error('Error performing action:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      PENDING: { color: 'bg-yellow-100 text-yellow-800', icon: Clock },
      UNDER_REVIEW: { color: 'bg-blue-100 text-blue-800', icon: AlertCircle },
      APPROVED: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
      REJECTED: { color: 'bg-red-100 text-red-800', icon: XCircle },
      SUSPENDED: { color: 'bg-gray-100 text-gray-800', icon: XCircle },
    };

    const config = statusConfig[status as keyof typeof statusConfig];
    const Icon = config.icon;

    return (
      <Badge className={config.color}>
        <Icon className="w-3 h-3 mr-1" />
        {status.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
      </Badge>
    );
  };

  const getVehicleTypeLabel = (type: string) => {
    const labels = {
      DRIVER: 'Car',
      MOTORCYCLE: 'Motorcycle',
      BICYCLE: 'Bicycle',
    };
    return labels[type as keyof typeof labels] || type;
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

  const handleViewDocument = (doc: { fileName: string; fileUrl: string; documentType: string }) => {
    setSelectedDocument(doc);
    setIsDocumentModalOpen(true);
  };

  const isImageFile = (fileName: string) => {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'];
    return imageExtensions.some(ext => fileName.toLowerCase().endsWith(ext));
  };

  return (
    <AuthGuard>
      <PermissionGuard requiredPermission={{ entityType: 'SNAP_RIDE_RIDER_APPLICATIONS', permission: 'VIEW' }}>
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold">Rider Applications</h1>
            {hasPermission('SNAP_RIDE_RIDER_APPLICATIONS', 'EXPORT') && (
              <Button variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            )}
          </div>

          {/* Statistics Cards */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Applications</p>
                      <p className="text-2xl font-bold">{stats.totalApplications}</p>
                    </div>
                    <div className="p-2 bg-blue-100 rounded-full">
                      <Clock className="w-6 h-6 text-blue-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Pending</p>
                      <p className="text-2xl font-bold text-yellow-600">{stats.pendingApplications}</p>
                    </div>
                    <div className="p-2 bg-yellow-100 rounded-full">
                      <AlertCircle className="w-6 h-6 text-yellow-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Approved</p>
                      <p className="text-2xl font-bold text-green-600">{stats.approvedApplications}</p>
                    </div>
                    <div className="p-2 bg-green-100 rounded-full">
                      <CheckCircle className="w-6 h-6 text-green-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">This Month</p>
                      <p className="text-2xl font-bold">{stats.thisMonthApplications}</p>
                    </div>
                    <div className="p-2 bg-purple-100 rounded-full">
                      <Clock className="w-6 h-6 text-purple-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input
                  placeholder="Search by name, phone, license..."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                />
                <Select value={filters.status} onValueChange={(value) => setFilters({ ...filters, status: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="PENDING">Pending</SelectItem>
                    <SelectItem value="UNDER_REVIEW">Under Review</SelectItem>
                    <SelectItem value="APPROVED">Approved</SelectItem>
                    <SelectItem value="REJECTED">Rejected</SelectItem>
                    <SelectItem value="SUSPENDED">Suspended</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filters.vehicleType} onValueChange={(value) => setFilters({ ...filters, vehicleType: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by vehicle type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Vehicles</SelectItem>
                    <SelectItem value="DRIVER">Car</SelectItem>
                    <SelectItem value="MOTORCYCLE">Motorcycle</SelectItem>
                    <SelectItem value="BICYCLE">Bicycle</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Applications Table */}
          <Card>
            <CardHeader>
              <CardTitle>Applications</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Applicant</TableHead>
                    <TableHead>Vehicle</TableHead>
                    <TableHead>License</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Applied</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {applications.map((application) => (
                    <TableRow key={application.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {application.firstName} {application.lastName}
                          </div>
                          <div className="text-sm text-gray-500">{application.phoneNumber}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{application.vehicleModel}</div>
                          <div className="text-sm text-gray-500">
                            {getVehicleTypeLabel(application.vehicleType)} • {application.vehiclePlate}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{application.licenseNumber}</TableCell>
                      <TableCell>{getStatusBadge(application.status)}</TableCell>
                      <TableCell>{formatDate(application.createdAt)}</TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedApplication(application);
                              setIsDetailDialogOpen(true);
                            }}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          {application.status === 'PENDING' && hasPermission('SNAP_RIDE_RIDER_APPLICATIONS', 'EDIT') && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedApplication(application);
                                  setActionType('approve');
                                  setIsActionDialogOpen(true);
                                }}
                              >
                                <CheckCircle className="w-4 h-4 text-green-600" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedApplication(application);
                                  setActionType('reject');
                                  setIsActionDialogOpen(true);
                                }}
                              >
                                <XCircle className="w-4 h-4 text-red-600" />
                              </Button>
                            </>
                          )}
                          {application.status === 'APPROVED' && hasPermission('SNAP_RIDE_RIDER_APPLICATIONS', 'EDIT') && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedApplication(application);
                                setActionType('suspend');
                                setIsActionDialogOpen(true);
                              }}
                            >
                              <XCircle className="w-4 h-4 text-red-600" />
                            </Button>
                          )}
                          {application.status === 'SUSPENDED' && hasPermission('SNAP_RIDE_RIDER_APPLICATIONS', 'EDIT') && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedApplication(application);
                                setActionType('approve');
                                setIsActionDialogOpen(true);
                              }}
                            >
                              <CheckCircle className="w-4 h-4 text-green-600" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {pagination.pages > 1 && (
                <div className="flex justify-between items-center mt-4">
                  <div className="text-sm text-gray-500">
                    Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                    {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} results
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pagination.page === 1}
                      onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pagination.page === pagination.pages}
                      onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Application Detail Dialog */}
          <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
            <DialogContent className="max-w-6xl max-h-[95vh] overflow-y-auto">
              <DialogHeader className="pb-6">
                <DialogTitle className="text-2xl">Application Details</DialogTitle>
              </DialogHeader>
              {selectedApplication && (
                <div className="space-y-8">
                  {/* Personal Information */}
                  <div className="bg-white border border-gray-200 p-6 rounded-xl shadow-sm">
                    <h3 className="text-xl mb-4 text-gray-900 border-b border-gray-200 pb-2">Personal Information</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center py-2 border-b border-gray-100">
                        <span className="font-semibold text-gray-700">Full Name:</span>
                        <span className="text-gray-900">{selectedApplication.firstName} {selectedApplication.lastName}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-gray-100">
                        <span className="font-semibold text-gray-700">Phone Number:</span>
                        <span className="text-gray-900">{selectedApplication.phoneNumber}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-gray-100">
                        <span className="font-semibold text-gray-700">Email:</span>
                        <span className="text-gray-900">{selectedApplication.email || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-gray-100">
                        <span className="font-semibold text-gray-700">Application Status:</span>
                        <span>{getStatusBadge(selectedApplication.status)}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-gray-100">
                        <span className="font-semibold text-gray-700">Applied Date:</span>
                        <span className="text-gray-900">{formatDate(selectedApplication.createdAt)}</span>
                      </div>
                      {selectedApplication.reviewedBy && (
                        <div className="flex justify-between items-center py-2 border-b border-gray-100">
                          <span className="font-semibold text-gray-700">Reviewed by:</span>
                          <span className="text-gray-900">{selectedApplication.reviewedBy}</span>
                        </div>
                      )}
                      {selectedApplication.reviewedAt && (
                        <div className="flex justify-between items-center py-2 border-b border-gray-100">
                          <span className="font-semibold text-gray-700">Reviewed at:</span>
                          <span className="text-gray-900">{formatDate(selectedApplication.reviewedAt)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Vehicle Information */}
                  <div className="bg-white border border-gray-200 p-6 rounded-xl shadow-sm">
                    <h3 className="text-xl mb-4 text-gray-900 border-b border-gray-200 pb-2">Vehicle Information</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center py-2 border-b border-gray-100">
                        <span className="font-semibold text-gray-700">Vehicle Type:</span>
                        <span className="text-gray-900">{getVehicleTypeLabel(selectedApplication.vehicleType)}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-gray-100">
                        <span className="font-semibold text-gray-700">Vehicle Model:</span>
                        <span className="text-gray-900">{selectedApplication.vehicleModel}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-gray-100">
                        <span className="font-semibold text-gray-700">License Number:</span>
                        <span className="text-gray-900">{selectedApplication.licenseNumber}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-gray-100">
                        <span className="font-semibold text-gray-700">License Expiry:</span>
                        <span className="text-gray-900">{selectedApplication.licenseExpiry}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-gray-100">
                        <span className="font-semibold text-gray-700">Vehicle Plate:</span>
                        <span className="text-gray-900">{selectedApplication.vehiclePlate}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-gray-100">
                        <span className="font-semibold text-gray-700">Insurance Number:</span>
                        <span className="text-gray-900">{selectedApplication.insuranceNumber || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-gray-100">
                        <span className="font-semibold text-gray-700">Insurance Expiry:</span>
                        <span className="text-gray-900">{selectedApplication.insuranceExpiry || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-gray-100">
                        <span className="font-semibold text-gray-700">Experience:</span>
                        <span className="text-gray-900">{selectedApplication.experience || 'N/A'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Additional Information */}
                  <div className="bg-white border border-gray-200 p-6 rounded-xl shadow-sm">
                    <h3 className="text-xl mb-4 text-gray-900 border-b border-gray-200 pb-2">Additional Information</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center py-2 border-b border-gray-100">
                        <span className="font-semibold text-gray-700">Date of Birth:</span>
                        <span className="text-gray-900">{selectedApplication.dateOfBirth || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-gray-100">
                        <span className="font-semibold text-gray-700">Address:</span>
                        <span className="text-gray-900">{selectedApplication.address}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-gray-100">
                        <span className="font-semibold text-gray-700">City:</span>
                        <span className="text-gray-900">{selectedApplication.city}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-gray-100">
                        <span className="font-semibold text-gray-700">Emergency Contact:</span>
                        <span className="text-gray-900">{selectedApplication.emergencyContact || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-gray-100">
                        <span className="font-semibold text-gray-700">Emergency Phone:</span>
                        <span className="text-gray-900">{selectedApplication.emergencyPhone || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-gray-100">
                        <span className="font-semibold text-gray-700">Availability:</span>
                        <span className="text-gray-900">{selectedApplication.availability || 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Documents */}
                  {selectedApplication.documents.length > 0 && (
                    <div className="bg-white border border-gray-200 p-6 rounded-xl shadow-sm">
                      <h3 className="text-xl mb-4 text-gray-900 border-b border-gray-200 pb-2">Documents</h3>
                      <div className="space-y-4">
                        {selectedApplication.documents.map((doc) => (
                          <div key={doc.id} className="flex justify-between items-center p-4 bg-gray-50 rounded-lg border border-gray-200">
                            <div className="flex-1">
                              <div className="font-semibold text-gray-800 mb-1">{doc.documentType.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}</div>
                              <div className="text-sm text-gray-600">{doc.fileName}</div>
                            </div>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="ml-4"
                              onClick={() => handleViewDocument(doc)}
                            >
                              View Document
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Rejection Reason */}
                  {selectedApplication.rejectionReason && (
                    <div className="bg-red-50 border border-red-200 p-6 rounded-xl">
                      <h3 className="text-xl mb-3 text-red-800 border-b border-red-200 pb-2">Rejection/Suspension Reason</h3>
                      <p className="text-red-700 text-lg">{selectedApplication.rejectionReason}</p>
                    </div>
                  )}
                </div>
              )}
            </DialogContent>
          </Dialog>

          {/* Action Dialog */}
          <Dialog open={isActionDialogOpen} onOpenChange={setIsActionDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {actionType === 'approve' && 'Approve Application'}
                  {actionType === 'reject' && 'Reject Application'}
                  {actionType === 'suspend' && 'Suspend Application'}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <p>
                  Are you sure you want to{' '}
                  {actionType === 'approve' && 'approve'}
                  {actionType === 'reject' && 'reject'}
                  {actionType === 'suspend' && 'suspend'}
                  {' '}this application?
                </p>
                
                {(actionType === 'reject' || actionType === 'suspend') && (
                  <div>
                    <label className="block text-sm font-medium mb-2">Reason</label>
                    <Input
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder="Enter reason..."
                    />
                  </div>
                )}
                
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setIsActionDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    variant={actionType === 'approve' ? 'default' : 'destructive'}
                    onClick={handleAction}
                    disabled={actionType !== 'approve' && !rejectionReason.trim()}
                  >
                    Confirm
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Document View Modal */}
          <Dialog open={isDocumentModalOpen} onOpenChange={setIsDocumentModalOpen}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader className="pb-4">
                <DialogTitle className="text-xl">
                  {selectedDocument?.documentType.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())} Document
                </DialogTitle>
              </DialogHeader>
              {selectedDocument && (
                <div className="space-y-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-gray-800 mb-2">Document Information</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center py-1 border-b border-gray-200">
                        <span className="font-medium text-gray-700">Document Type:</span>
                        <span className="text-gray-900">{selectedDocument.documentType.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}</span>
                      </div>
                      <div className="flex justify-between items-center py-1 border-b border-gray-200">
                        <span className="font-medium text-gray-700">File Name:</span>
                        <span className="text-gray-900">{selectedDocument.fileName}</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                    {isImageFile(selectedDocument.fileName) ? (
                      <div className="relative">
                        <img 
                          src={selectedDocument.fileUrl} 
                          alt={selectedDocument.fileName}
                          className="w-full h-auto max-h-[60vh] object-contain"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            target.nextElementSibling?.classList.remove('hidden');
                          }}
                        />
                        <div className="hidden p-8 text-center text-gray-500">
                          <p>Image could not be loaded.</p>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="mt-2"
                            asChild
                          >
                            <a href={selectedDocument.fileUrl} target="_blank" rel="noopener noreferrer">
                              Open in New Tab
                            </a>
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="p-8 text-center">
                        <div className="text-gray-500 mb-4">
                          <p>This document type cannot be previewed.</p>
                          <p className="text-sm">Please download or open in a new tab to view.</p>
                        </div>
                        <div className="flex justify-center space-x-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            asChild
                          >
                            <a href={selectedDocument.fileUrl} target="_blank" rel="noopener noreferrer">
                              Open in New Tab
                            </a>
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            asChild
                          >
                            <a href={selectedDocument.fileUrl} download={selectedDocument.fileName}>
                              Download
                            </a>
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </PermissionGuard>
    </AuthGuard>
  );
} 