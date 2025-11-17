'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { principalBusinessApi } from '@/services/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft } from 'lucide-react';

type Child = {
  userId: string;
  name: string;
  phoneNumber?: string | null;
  email?: string | null;
  ordersCount: number;
  productsCount: number;
};

type Analytics = {
  orders: {
    count: number;
    salesByCurrency: { currencyCode: string; totalSales: number }[];
    byStatus: { status: string; count: number }[];
  };
  products: { count: number };
};

export default function PrincipalBusinessDetailPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params?.userId as string;
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const formatDateInput = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  const [dateFrom, setDateFrom] = useState(formatDateInput(new Date()));
  const [dateTo, setDateTo] = useState(formatDateInput(new Date()));

  useEffect(() => {
    if (!userId) return;
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await principalBusinessApi.getChildrenWithActivity(userId);
        const list: Child[] = res.data || [];
        setChildren(list);
      } catch (e: any) {
        setError(e.message || 'Failed to load children');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [userId]);

  const fetchAnalytics = async (childId: string) => {
    try {
      setLoading(true);
      setError(null);
      const res = await principalBusinessApi.getAnalytics(childId, {
        startDate: dateFrom || undefined,
        endDate: dateTo || undefined,
      });
      setAnalytics(res.data);
      setSelectedChildId(childId);
    } catch (e: any) {
      setError(e.message || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const handleDateFilterChange = () => {
    if (selectedChildId) {
      fetchAnalytics(selectedChildId);
    }
  };

  const selectedChild = useMemo(() => children.find(c => c.userId === selectedChildId), [children, selectedChildId]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => router.back()}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <h1 className="text-2xl font-semibold">Principal Business - Sales Reps</h1>
        </div>
      </div>

      <Card className="p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
          <div>
            <label className="text-xs text-gray-500">Date From</label>
            <Input 
              type="date" 
              value={dateFrom} 
              onChange={(e) => {
                setDateFrom(e.target.value);
              }} 
            />
          </div>
          <div>
            <label className="text-xs text-gray-500">Date To</label>
            <Input 
              type="date" 
              value={dateTo} 
              onChange={(e) => {
                setDateTo(e.target.value);
              }} 
            />
          </div>
          <div className="md:col-span-2 text-right">
            <Button 
              onClick={() => selectedChildId && fetchAnalytics(selectedChildId)} 
              disabled={loading || !selectedChildId}
            >
              Apply
            </Button>
          </div>
        </div>

        {error && (
          <div className="text-red-600 text-sm">{error}</div>
        )}

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sales Rep</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Orders</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Products</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading && children.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-sm text-gray-500">Loading...</td>
                </tr>
              ) : children.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-sm text-gray-500">No active sales reps found</td>
                </tr>
              ) : (
                children.map((c) => (
                  <tr key={c.userId} className={selectedChildId === c.userId ? 'bg-blue-50' : ''}>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{c.name || 'N/A'}</div>
                      <div className="text-sm text-gray-500">{c.email || ''}</div>
                      <div className="text-sm text-gray-500">{c.phoneNumber || ''}</div>
                    </td>
                    <td className="px-4 py-3 text-sm">{c.ordersCount}</td>
                    <td className="px-4 py-3 text-sm">{c.productsCount}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => fetchAnalytics(c.userId)} disabled={loading}>
                          View Analytics
                        </Button>
                        <Button size="sm" variant="outline" asChild>
                          <Link href={`/ecommerce/principal-business/analytics/${c.userId}`}>
                            Full Analytics
                          </Link>
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {analytics && (
        <Card className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-500">Selected Sales Rep</div>
              <div className="text-lg font-semibold">{selectedChild?.name || selectedChildId}</div>
            </div>
          </div>

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
        </Card>
      )}
    </div>
  );
}


