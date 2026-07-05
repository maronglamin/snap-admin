'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { realEstateApi } from '@/services/api';
import { PermissionGuard } from '@/components/auth/PermissionGuard';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { usePermissions } from '@/hooks/usePermissions';

const MARKETPLUS_API = process.env.NEXT_PUBLIC_MARKETPLUS_API_URL || '';
const STATUS_COLORS: Record<string, string> = {
  PENDING_SETUP: 'bg-gray-100',
  PENDING_REVIEW: 'bg-yellow-100 text-yellow-800',
  ACTIVE: 'bg-green-100 text-green-800',
  INACTIVE: 'bg-red-100 text-red-800',
};

export default function PropertyListingsPage() {
  const [listings, setListings] = useState<any[]>([]);
  const [filters, setFilters] = useState({ status: '', listingType: '', search: '' });
  const [loading, setLoading] = useState(true);
  const { hasPermission } = usePermissions();

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '50' });
      if (filters.status && filters.status !== 'all') params.set('status', filters.status);
      if (filters.listingType && filters.listingType !== 'all') params.set('listingType', filters.listingType);
      if (filters.search) params.set('search', filters.search);
      const res = await realEstateApi.getListings(params.toString());
      setListings(res.listings || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [filters]);

  const updateStatus = async (id: string, body: { status?: string; publish?: boolean }) => {
    await realEstateApi.updateListingStatus(id, body);
    load();
  };

  return (
    <AuthGuard>
      <PermissionGuard requiredPermission={{ entityType: 'SNAP_REAL_ESTATE_LISTINGS', permission: 'VIEW' }}>
        <div className="p-6 space-y-6">
          <h1 className="text-2xl font-bold">Property Listings</h1>
          <Card>
            <CardHeader><CardTitle>Moderation Queue</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2 flex-wrap">
                <Input placeholder="Search..." value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} className="max-w-xs" />
                <Select value={filters.status || 'all'} onValueChange={(v) => setFilters({ ...filters, status: v === 'all' ? '' : v })}>
                  <SelectTrigger className="w-44"><SelectValue placeholder="Status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    {['PENDING_SETUP', 'PENDING_REVIEW', 'ACTIVE', 'INACTIVE', 'SOLD', 'RENTED'].map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Agent</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>City</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? <TableRow><TableCell colSpan={6}>Loading...</TableCell></TableRow> :
                    listings.map((l) => (
                      <TableRow key={l.id}>
                        <TableCell>{l.title}</TableCell>
                        <TableCell>{l.agent?.displayName}</TableCell>
                        <TableCell>{l.listingType}</TableCell>
                        <TableCell>{l.city}</TableCell>
                        <TableCell><Badge className={STATUS_COLORS[l.status] || ''}>{l.status}</Badge></TableCell>
                        <TableCell className="space-x-1">
                          {hasPermission('SNAP_REAL_ESTATE_LISTINGS', 'EDIT') && (
                            <>
                              {['PENDING_SETUP', 'PENDING_REVIEW'].includes(l.status) && (
                                <Button size="sm" onClick={() => updateStatus(l.id, { publish: true })}>Publish</Button>
                              )}
                              {l.status === 'ACTIVE' && (
                                <Button size="sm" variant="outline" onClick={() => updateStatus(l.id, { status: 'INACTIVE' })}>Deactivate</Button>
                              )}
                              {l.status === 'INACTIVE' && (
                                <Button size="sm" variant="outline" onClick={() => updateStatus(l.id, { status: 'ACTIVE' })}>Activate</Button>
                              )}
                            </>
                          )}
                        </TableCell>
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
