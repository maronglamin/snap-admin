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
import { realEstateApi } from '@/services/api';
import { usePermissions } from '@/hooks/usePermissions';
import { PermissionGuard } from '@/components/auth/PermissionGuard';
import { AuthGuard } from '@/components/auth/AuthGuard';

const MARKETPLUS_API = process.env.NEXT_PUBLIC_MARKETPLUS_API_URL || '';

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  APPROVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
};

function docUrl(url?: string | null) {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return `${MARKETPLUS_API}${url.startsWith('/') ? '' : '/'}${url}`;
}

export default function AgentApplicationsPage() {
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
        realEstateApi.getAgentApplications(params.toString()),
        realEstateApi.getAgentApplicationStats(),
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
    const app = await realEstateApi.getAgentApplication(id);
    setSelected(app);
    setDetailOpen(true);
  };

  const handleAction = async () => {
    if (!selected || !actionType) return;
    if (actionType === 'reject' && !rejectionReason.trim()) return;
    if (actionType === 'approve') {
      await realEstateApi.approveAgentApplication(selected.id);
    } else {
      await realEstateApi.rejectAgentApplication(selected.id, rejectionReason);
    }
    setActionOpen(false);
    setDetailOpen(false);
    setRejectionReason('');
    loadData();
  };

  return (
    <AuthGuard>
      <PermissionGuard requiredPermission={{ entityType: 'SNAP_REAL_ESTATE_AGENT_APPLICATIONS', permission: 'VIEW' }}>
        <div className="p-6 space-y-6">
          <h1 className="text-2xl font-bold">Property Agent Applications</h1>
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
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Applicant</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>City</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={6}>Loading...</TableCell></TableRow>
                  ) : applications.map((app) => (
                    <TableRow key={app.id}>
                      <TableCell>{app.firstName} {app.lastName}</TableCell>
                      <TableCell>{app.companyName || '—'}</TableCell>
                      <TableCell>{app.city}</TableCell>
                      <TableCell><Badge className={STATUS_COLORS[app.status]}>{app.status}</Badge></TableCell>
                      <TableCell>{new Date(app.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell className="space-x-2">
                        <Button size="sm" variant="outline" onClick={() => openDetail(app.id)}><Eye className="h-4 w-4" /></Button>
                        {app.status === 'PENDING' && hasPermission('SNAP_REAL_ESTATE_AGENT_APPLICATIONS', 'EDIT') && (
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
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Agent Application</DialogTitle></DialogHeader>
              {selected && (
                <div className="space-y-3 text-sm">
                  <p><strong>Name:</strong> {selected.firstName} {selected.lastName}</p>
                  <p><strong>Phone:</strong> {selected.phoneNumber}</p>
                  <p><strong>Company:</strong> {selected.companyName || '—'}</p>
                  <p><strong>License:</strong> {selected.licenseNumber || '—'}</p>
                  <p><strong>ID:</strong> {selected.idType} — {selected.idNumber}</p>
                  <p><strong>Banking:</strong> {selected.bankingInfo ? JSON.stringify(selected.bankingInfo) : '—'}</p>
                  <div className="space-y-1">
                    {selected.idDocumentUrl && <a className="text-blue-600 underline block" href={docUrl(selected.idDocumentUrl)} target="_blank" rel="noreferrer">ID Document</a>}
                    {selected.businessRegistrationDocUrl && <a className="text-blue-600 underline block" href={docUrl(selected.businessRegistrationDocUrl)} target="_blank" rel="noreferrer">Business Registration</a>}
                    {selected.addressProofUrl && <a className="text-blue-600 underline block" href={docUrl(selected.addressProofUrl)} target="_blank" rel="noreferrer">Address Proof</a>}
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
          <Dialog open={actionOpen} onOpenChange={setActionOpen}>
            <DialogContent>
              <DialogHeader><DialogTitle>{actionType === 'approve' ? 'Approve Agent' : 'Reject Agent'}</DialogTitle></DialogHeader>
              {actionType === 'reject' && (
                <Input placeholder="Rejection reason (required)" value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} />
              )}
              <div className="flex justify-end gap-2 mt-4">
                <Button variant="outline" onClick={() => setActionOpen(false)}>Cancel</Button>
                <Button onClick={handleAction}>Confirm</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </PermissionGuard>
    </AuthGuard>
  );
}
