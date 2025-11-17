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
    salesByCurrency: { currencyCode: string; totalSales: number }[];
    productsCount: number;
  };
};

export default function PrincipalBusinessPage() {
  const formatDateInput = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<PrincipalRow[]>([]);
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState(formatDateInput(new Date()));
  const [dateTo, setDateTo] = useState(formatDateInput(new Date()));

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await principalBusinessApi.getPrincipals({
        startDate: dateFrom || undefined,
        endDate: dateTo || undefined,
      });
      setRows(res.data || []);
    } catch (e: any) {
      setError(e.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        <div className="space-y-3 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
            <div>
              <label className="text-xs text-gray-500">Date From</label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-gray-500">Date To</label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
            <div className="md:col-span-2 text-right">
              <Button onClick={load} disabled={loading}>Apply</Button>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Input
              placeholder="Search by name, email, phone or ID"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
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
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Sales (Paid)</th>
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
                    <td className="px-4 py-3 text-sm">
                      {row.commerce.salesByCurrency?.length ? (
                        <div className="flex flex-wrap gap-2">
                          {row.commerce.salesByCurrency.map((s) => (
                            <span key={s.currencyCode} className="inline-flex items-center rounded border px-2 py-0.5 text-xs">
                              {new Intl.NumberFormat('en-US', { style: 'currency', currency: s.currencyCode }).format(s.totalSales || 0)}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-500 text-sm">—</span>
                      )}
                    </td>
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


