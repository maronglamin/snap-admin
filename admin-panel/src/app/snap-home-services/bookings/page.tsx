'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Download } from 'lucide-react';
import { homeServicesApi, API_BASE_URL } from '@/services/api';
import { PermissionGuard } from '@/components/auth/PermissionGuard';
import { AuthGuard } from '@/components/auth/AuthGuard';

export default function ServiceBookingsPage() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [filters, setFilters] = useState({ status: '', search: '' });
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '50' });
      if (filters.status && filters.status !== 'all') params.set('status', filters.status);
      if (filters.search) params.set('search', filters.search);
      const res = await homeServicesApi.getBookings(params.toString());
      setBookings(res.bookings || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [filters]);

  const exportCsv = () => {
    window.open(`${API_BASE_URL}/home-services/bookings/export?status=${filters.status || ''}`, '_blank');
  };

  return (
    <AuthGuard>
      <PermissionGuard requiredPermission={{ entityType: 'SNAP_HOME_SERVICES_BOOKINGS', permission: 'VIEW' }}>
        <div className="p-6 space-y-6">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold">Service Bookings</h1>
            <Button variant="outline" onClick={exportCsv}><Download className="h-4 w-4 mr-2" />Export CSV</Button>
          </div>
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="flex gap-2">
                <Input placeholder="Search ref, customer..." value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} className="max-w-xs" />
                <Select value={filters.status || 'all'} onValueChange={(v) => setFilters({ ...filters, status: v === 'all' ? '' : v })}>
                  <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    {['PENDING_QUOTE', 'QUOTED', 'ACCEPTED', 'PAID', 'COMPLETED', 'CANCELLED', 'REJECTED'].map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ref</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? <TableRow><TableCell colSpan={7}>Loading...</TableCell></TableRow> :
                    bookings.map((b) => (
                      <TableRow key={b.id}>
                        <TableCell>{b.bookingRef}</TableCell>
                        <TableCell>{b.customer?.firstName} {b.customer?.lastName}</TableCell>
                        <TableCell>{b.provider?.displayName || '—'}</TableCell>
                        <TableCell>{b.category?.name}</TableCell>
                        <TableCell><Badge variant="outline">{b.status}</Badge></TableCell>
                        <TableCell>{b.paymentStatus}</TableCell>
                        <TableCell>{new Date(b.createdAt).toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </PermissionGuard>
    </AuthGuard>
  );
}
