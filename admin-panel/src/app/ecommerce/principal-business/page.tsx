'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { principalBusinessApi } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

type PrincipalRow = {
  principal: {
    id: string;
    name: string;
    phoneNumber?: string | null;
    email?: string | null;
    createdAt?: string;
  };
  repsCount: number;
  commerce: {
    ordersCount: number;
    totalSales: number;
    productsCount: number;
  };
};

export default function PrincipalBusinessPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<PrincipalRow[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await principalBusinessApi.getPrincipals();
        setRows(res.data || []);
      } catch (e: any) {
        setError(e.message || 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filtered = rows.filter(r => {
    const term = search.toLowerCase();
    return (
      r.principal.name.toLowerCase().includes(term) ||
      r.principal.email?.toLowerCase().includes(term) ||
      r.principal.phoneNumber?.toLowerCase().includes(term) ||
      r.principal.id.toLowerCase().includes(term)
    );
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Principal Business</h1>
      </div>

      <Card className="p-4">
        <div className="flex items-center gap-3 mb-4">
          <Input
            placeholder="Search by name, email, phone or ID"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {error && (
          <div className="text-red-600 text-sm mb-3">{error}</div>
        )}

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Principal</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reps</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Orders</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Sales</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Products</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-500">Loading...</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-500">No principal businesses found</td>
                </tr>
              ) : (
                filtered.map((row) => (
                  <tr key={row.principal.id}>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{row.principal.name || 'N/A'}</div>
                      <div className="text-sm text-gray-500">{row.principal.email || ''}</div>
                      <div className="text-sm text-gray-500">{row.principal.phoneNumber || ''}</div>
                    </td>
                    <td className="px-4 py-3 text-sm">{row.repsCount}</td>
                    <td className="px-4 py-3 text-sm">{row.commerce.ordersCount}</td>
                    <td className="px-4 py-3 text-sm">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'GMD' }).format(row.commerce.totalSales || 0)}</td>
                    <td className="px-4 py-3 text-sm">{row.commerce.productsCount}</td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/ecommerce/principal-business/${row.principal.id}`}>
                        <Button size="sm">View Reps & Analytics</Button>
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}


