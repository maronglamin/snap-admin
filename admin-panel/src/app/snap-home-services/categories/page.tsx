'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { homeServicesApi } from '@/services/api';
import { PermissionGuard } from '@/components/auth/PermissionGuard';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { usePermissions } from '@/hooks/usePermissions';

export default function ServiceCategoriesPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', icon: '', sortOrder: 0 });
  const { hasPermission } = usePermissions();

  const load = async () => {
    const res = await homeServicesApi.getCategories();
    setCategories(res.categories || []);
  };

  useEffect(() => { load(); }, []);

  const create = async () => {
    await homeServicesApi.createCategory(form);
    setOpen(false);
    setForm({ name: '', description: '', icon: '', sortOrder: 0 });
    load();
  };

  const toggleActive = async (cat: any) => {
    await homeServicesApi.updateCategory(cat.id, { isActive: !cat.isActive });
    load();
  };

  return (
    <AuthGuard>
      <PermissionGuard requiredPermission={{ entityType: 'SNAP_HOME_SERVICES_CATEGORIES', permission: 'VIEW' }}>
        <div className="p-6 space-y-6">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold">Service Categories</h1>
            {hasPermission('SNAP_HOME_SERVICES_CATEGORIES', 'ADD') && (
              <Button onClick={() => setOpen(true)}>Add Category</Button>
            )}
          </div>
          <Card>
            <CardHeader><CardTitle>Categories</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Slug</TableHead>
                    <TableHead>Sort</TableHead>
                    <TableHead>Active</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categories.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell>{c.name}</TableCell>
                      <TableCell>{c.slug}</TableCell>
                      <TableCell>{c.sortOrder}</TableCell>
                      <TableCell>
                        {hasPermission('SNAP_HOME_SERVICES_CATEGORIES', 'EDIT') ? (
                          <Switch checked={c.isActive} onCheckedChange={() => toggleActive(c)} />
                        ) : (c.isActive ? 'Yes' : 'No')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent>
              <DialogHeader><DialogTitle>New Category</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <Input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                <Input placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                <Input placeholder="Icon" value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} />
                <Input type="number" placeholder="Sort order" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })} />
                <Button onClick={create} disabled={!form.name.trim()}>Create</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </PermissionGuard>
    </AuthGuard>
  );
}
