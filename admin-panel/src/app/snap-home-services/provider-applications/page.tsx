'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CheckCircle, XCircle, Clock, Eye } from 'lucide-react';
import { homeServicesApi } from '@/services/api';
import { usePermissions } from '@/hooks/usePermissions';
import { PermissionGuard } from '@/components/auth/PermissionGuard';
import { AuthGuard } from '@/components/auth/AuthGuard';

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  APPROVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
};

export default function ProviderApplicationsPage() {
  const [applications, setApplications] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [actionOpen, setActionOpen] = useState(false);
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [filters, setFilters] = useState({ status: '', search: '' });
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 0 });
  const { hasPermission } = usePermissions();

  const loadData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: String(pagination.page),
        limit: String(pagination.limit),
        ...(filters.status && filters.status !== 'all' ? { status: filters.status } : {}),
        ...(filters.search ? { search: filters.search } : {}),
      });
      const [listRes, statsRes] = await Promise.all([
        homeServicesApi.getProviderApplications(params.toString()),
        homeServicesApi.getProviderApplicationStats(),
      ]);
      setApplications(listRes.applications || []);
      setPagination((p) => ({ ...p, ...listRes.pagination }));
      setStats(statsRes.stats);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [pagination.page, filters]);

  const openDetail = async (id: string) => {
    const app = await homeServicesApi.getProviderApplication(id);
    setSelected(app);
    setDetailOpen(true);
  };

  const handleAction = async () => {
    if (!selected || !actionType) return;
    if (actionType === 'reject' && !rejectionReason.trim()) return;
    if (actionType === 'approve') {
      await homeServicesApi.approveProviderApplication(selected.id);
    } else {
      await homeServicesApi.rejectProviderApplication(selected.id, rejectionReason);
    }
    setActionOpen(false);
    setDetailOpen(false);
    setRejectionReason('');
    loadData();
  };

  return (
    <AuthGuard>
      <PermissionGuard requiredPermission={{ entityType: 'SNAP_HOME_SERVICES_PROVIDER_APPLICATIONS', permission: 'VIEW' }}>
        <div className="p-6 space-y-6">
          <h1 className="text-2xl font-bold">Service Provider Applications</h1>
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Pending', value: stats.pending, icon: Clock },
                { label: 'Approved', value: stats.approved, icon: CheckCircle },
                { label: 'Rejected', value: stats.rejected, icon: XCircle },
                { label: 'Today', value: stats.today, icon: Eye },
              ].map(({ label, value, icon: Icon }) => (
                <Card key={label}><CardContent className="pt-6 flex items-center gap-3">
                  <Icon className="h-8 w-8 text-muted-foreground" />
                  <div><p className="text-sm text-muted-foreground">{label}</p><p className="text-2xl font-bold">{value}</p></div>
                </CardContent></Card>
              ))}
            </div>
          )}
          <Card>
            <CardHeader><CardTitle>Application Queue</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2 flex-wrap">
                <Input placeholder="Search..." value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} className="max-w-xs" />
                <Select value={filters.status || 'all'} onValueChange={(v) => setFilters({ ...filters, status: v === 'all' ? '' : v })}>
                  <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="PENDING">Pending</SelectItem>
                    <SelectItem value="APPROVED">Approved</SelectItem>
                    <SelectItem value="REJECTED">Rejected</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" onClick={() => loadData()}>Refresh</Button>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Applicant</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>City</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={6}>Loading...</TableCell></TableRow>
                  ) : applications.length === 0 ? (
                    <TableRow><TableCell colSpan={6}>No applications found</TableCell></TableRow>
                  ) : applications.map((app) => (
                    <TableRow key={app.id}>
                      <TableCell>{app.firstName} {app.lastName}</TableCell>
                      <TableCell>{app.phoneNumber}</TableCell>
                      <TableCell>{app.city}</TableCell>
                      <TableCell><Badge className={STATUS_COLORS[app.status]}>{app.status}</Badge></TableCell>
                      <TableCell>{new Date(app.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell className="space-x-2">
                        <Button size="sm" variant="outline" onClick={() => openDetail(app.id)}><Eye className="h-4 w-4" /></Button>
                        {app.status === 'PENDING' && hasPermission('SNAP_HOME_SERVICES_PROVIDER_APPLICATIONS', 'EDIT') && (
                          <>
                            <Button size="sm" onClick={() => { setSelected(app); setActionType('approve'); setActionOpen(true); }}>Approve</Button>
                            <Button size="sm" variant="destructive" onClick={() => { setSelected(app); setActionType('reject'); setActionOpen(true); }}>Reject</Button>
                          </>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
            <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Application Details</DialogTitle></DialogHeader>
              {selected && (
                <div className="space-y-2 text-sm">
                  <p><strong>Name:</strong> {selected.firstName} {selected.lastName}</p>
                  <p><strong>Phone:</strong> {selected.phoneNumber}</p>
                  <p><strong>Email:</strong> {selected.email || '—'}</p>
                  <p><strong>Address:</strong> {selected.address}, {selected.city}</p>
                  <p><strong>Experience:</strong> {selected.experience || '—'}</p>
                  <p><strong>Bio:</strong> {selected.bio || '—'}</p>
                  {selected.categories?.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {selected.categories.map((c: any) => <Badge key={c.id} variant="secondary">{c.name}</Badge>)}
                    </div>
                  )}
                  {selected.latitude != null && (
                    <p><strong>Location:</strong> {selected.latitude}, {selected.longitude}</p>
                  )}
                </div>
              )}
            </DialogContent>
          </Dialog>
          <Dialog open={actionOpen} onOpenChange={setActionOpen}>
            <DialogContent>
              <DialogHeader><DialogTitle>{actionType === 'approve' ? 'Approve Application' : 'Reject Application'}</DialogTitle></DialogHeader>
              {actionType === 'reject' && (
                <Input placeholder="Rejection reason (required)" value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} />
              )}
              {actionType === 'approve' && <p>Approve {selected?.firstName} {selected?.lastName} as a service provider?</p>}
              <div className="flex justify-end gap-2 mt-4">
                <Button variant="outline" onClick={() => setActionOpen(false)}>Cancel</Button>
                <Button onClick={handleAction} disabled={actionType === 'reject' && !rejectionReason.trim()}>
                  Confirm
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </PermissionGuard>
    </AuthGuard>
  );
}
