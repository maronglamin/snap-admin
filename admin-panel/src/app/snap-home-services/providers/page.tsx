'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { homeServicesApi } from '@/services/api';
import { PermissionGuard } from '@/components/auth/PermissionGuard';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { usePermissions } from '@/hooks/usePermissions';

export default function ServiceProvidersPage() {
  const [providers, setProviders] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const { hasPermission } = usePermissions();

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '50', ...(search ? { search } : {}) });
      const res = await homeServicesApi.getProviders(params.toString());
      setProviders(res.providers || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [search]);

  const toggleActive = async (id: string) => {
    await homeServicesApi.toggleProviderActive(id);
    load();
  };

  return (
    <AuthGuard>
      <PermissionGuard requiredPermission={{ entityType: 'SNAP_HOME_SERVICES_PROVIDERS', permission: 'VIEW' }}>
        <div className="p-6 space-y-6">
          <h1 className="text-2xl font-bold">Service Providers</h1>
          <Card>
            <CardHeader><CardTitle>Approved Providers</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <Input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" />
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>City</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead>Bookings</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? <TableRow><TableCell colSpan={7}>Loading...</TableCell></TableRow> :
                    providers.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell>{p.displayName}</TableCell>
                        <TableCell>{p.user?.phoneNumber}</TableCell>
                        <TableCell>{p.city || '—'}</TableCell>
                        <TableCell>{p.rating?.toFixed(1)}</TableCell>
                        <TableCell>{p._count?.bookings ?? 0}</TableCell>
                        <TableCell><Badge variant={p.isActive ? 'default' : 'secondary'}>{p.isActive ? 'Active' : 'Inactive'}</Badge></TableCell>
                        <TableCell>
                          {hasPermission('SNAP_HOME_SERVICES_PROVIDERS', 'EDIT') && (
                            <Button size="sm" variant="outline" onClick={() => toggleActive(p.id)}>
                              {p.isActive ? 'Deactivate' : 'Activate'}
                            </Button>
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
