'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { realEstateApi } from '@/services/api';
import { PermissionGuard } from '@/components/auth/PermissionGuard';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { usePermissions } from '@/hooks/usePermissions';

export default function PropertyAgentsPage() {
  const [agents, setAgents] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const { hasPermission } = usePermissions();

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '50', ...(search ? { search } : {}) });
      const res = await realEstateApi.getAgents(params.toString());
      setAgents(res.agents || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [search]);

  return (
    <AuthGuard>
      <PermissionGuard requiredPermission={{ entityType: 'SNAP_REAL_ESTATE_AGENTS', permission: 'VIEW' }}>
        <div className="p-6 space-y-6">
          <h1 className="text-2xl font-bold">Property Agents</h1>
          <Card>
            <CardHeader><CardTitle>Approved Agents</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <Input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" />
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Listings</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? <TableRow><TableCell colSpan={6}>Loading...</TableCell></TableRow> :
                    agents.map((a) => (
                      <TableRow key={a.id}>
                        <TableCell>{a.displayName}</TableCell>
                        <TableCell>{a.companyName || '—'}</TableCell>
                        <TableCell>{a.user?.phoneNumber}</TableCell>
                        <TableCell>{a._count?.listings ?? 0}</TableCell>
                        <TableCell><Badge variant={a.isActive ? 'default' : 'secondary'}>{a.isActive ? 'Active' : 'Inactive'}</Badge></TableCell>
                        <TableCell>
                          {hasPermission('SNAP_REAL_ESTATE_AGENTS', 'EDIT') && (
                            <Button size="sm" variant="outline" onClick={async () => { await realEstateApi.toggleAgentActive(a.id); load(); }}>
                              {a.isActive ? 'Deactivate' : 'Activate'}
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
