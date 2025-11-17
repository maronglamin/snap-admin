'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { principalBusinessApi } from '@/services/api';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

type Analytics = {
  orders: {
    count: number;
    salesByCurrency: { currencyCode: string; totalSales: number }[];
    byStatus: { status: string; count: number }[];
  };
  products: { count: number };
};

export default function PrincipalAnalyticsPage() {
  const params = useParams();
  const userId = params?.userId as string;
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const load = async () => {
    if (!userId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await principalBusinessApi.getAnalytics(userId, {
        startDate: dateFrom || undefined,
        endDate: dateTo || undefined,
      });
      setAnalytics(res.data);
    } catch (e: any) {
      setError(e.message || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Sales Rep Analytics</h1>
      </div>

      <Card className="p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
          <div>
            <label className="text-xs text-gray-500">Date From</label>
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-gray-500">Date To</label>
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </div>
          <div className="md:col-span-2 text-right">
            <Button onClick={load} disabled={loading}>Apply</Button>
          </div>
        </div>

        {error && <div className="text-red-600 text-sm">{error}</div>}

        {!analytics ? (
          <div className="text-sm text-gray-500">{loading ? 'Loading...' : 'No data'}</div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-lg border p-4">
                <div className="text-sm text-gray-500">Orders</div>
                <div className="text-2xl font-semibold">{analytics.orders.count}</div>
              </div>
              <div className="rounded-lg border p-4">
                <div className="text-sm text-gray-500">Total Sales (Paid)</div>
                <div className="space-y-1">
                  {analytics.orders.salesByCurrency?.length ? (
                    analytics.orders.salesByCurrency.map((s) => (
                      <div key={s.currencyCode} className="text-lg font-semibold">
                        {new Intl.NumberFormat('en-US', { style: 'currency', currency: s.currencyCode }).format(s.totalSales || 0)}
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-gray-500">—</div>
                  )}
                </div>
              </div>
              <div className="rounded-lg border p-4">
                <div className="text-sm text-gray-500">Products</div>
                <div className="text-2xl font-semibold">{analytics.products.count}</div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Count</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {analytics.orders.byStatus.length === 0 ? (
                    <tr>
                      <td colSpan={2} className="px-4 py-6 text-center text-sm text-gray-500">No orders in selected period</td>
                    </tr>
                  ) : (
                    analytics.orders.byStatus.map((s) => (
                      <tr key={s.status}>
                        <td className="px-4 py-3 text-sm">{s.status}</td>
                        <td className="px-4 py-3 text-sm">{s.count}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}


