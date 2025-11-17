'use client';

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { authenticationApi } from '@/services/api';
import { Loader2, Search } from 'lucide-react';

interface TwilioNotification {
  id: string;
  to: string;
  messageBody: string;
  messageType: string;
  createdAt: string;
  user?: { id: string; firstName?: string; lastName?: string; phoneNumber?: string } | null;
  device?: { id: string; deviceName?: string; deviceType?: string; phoneNumber?: string } | null;
}

export default function DeviceAuthenticationPage() {
  const [items, setItems] = useState<TwilioNotification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [messageType, setMessageType] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Date-time filters
  const [startDateTime, setStartDateTime] = useState('');
  const [endDateTime, setEndDateTime] = useState('');
  const [appliedStartDateTime, setAppliedStartDateTime] = useState('');
  const [appliedEndDateTime, setAppliedEndDateTime] = useState('');

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search, messageType, appliedStartDateTime, appliedEndDateTime]);

  // Reset to first page when filters change (except page itself)
  useEffect(() => {
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, messageType]);

  // Initialize defaults to current day (start/end)
  useEffect(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    const startStr = start.toISOString().slice(0, 16);
    const endStr = end.toISOString().slice(0, 16);
    setStartDateTime(startStr);
    setEndDateTime(endStr);
    setAppliedStartDateTime(startStr);
    setAppliedEndDateTime(endStr);
  }, []);

  const load = async () => {
    try {
      setIsLoading(true);
      setError('');
      const params: any = {
        page: page.toString(),
        limit: '10',
        search,
        messageType,
        dateFrom: appliedStartDateTime,
        dateTo: appliedEndDateTime,
      };

      const resp = await authenticationApi.getDeviceNotifications(params);
      if (resp?.success) {
        setItems(resp.data || []);
        setTotalPages(resp.pagination?.totalPages || 1);
        setTotal(resp.pagination?.total || 0);
      } else {
        setError(resp?.error || 'Failed to load notifications');
      }
    } catch (e: any) {
      setError(e.message || 'Failed to load notifications');
    } finally {
      setIsLoading(false);
    }
  };

  const onSearch = () => {
    setPage(1);
  };

  const startIndex = (page - 1) * 10 + (items.length > 0 ? 1 : 0);
  const endIndex = Math.min(page * 10, total);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Device Authentication</CardTitle>
            {isLoading && (
              <div className="flex items-center text-sm text-gray-600">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Loading...
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
            <div className="col-span-2 flex items-center space-x-2">
              <Input
                placeholder="Search by phone or message"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    setSearch(query);
                    setPage(1);
                  }
                }}
              />
              <Button onClick={() => { setSearch(query); setPage(1); }} variant="secondary">
                <Search className="h-4 w-4 mr-1" /> Search
              </Button>
            </div>
            <div>
              <Select value={messageType} onValueChange={(v) => { setMessageType(v); setPage(1); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Message type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="OTP">OTP</SelectItem>
                  <SelectItem value="PIN">PIN</SelectItem>
                  <SelectItem value="COMBINED">COMBINED</SelectItem>
                  <SelectItem value="OTHER">OTHER</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Date-Time Filters */}
          <div className="flex flex-row flex-wrap gap-3 mb-2">
            <Input
              type="datetime-local"
              value={startDateTime}
              onChange={(e) => setStartDateTime(e.target.value)}
              className="sm:w-[210px]"
            />
            <Input
              type="datetime-local"
              value={endDateTime}
              onChange={(e) => setEndDateTime(e.target.value)}
              className="sm:w-[210px]"
            />
            <Button
              onClick={() => {
                const start = new Date(startDateTime);
                const end = new Date(endDateTime);
                if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
                  return;
                }
                setAppliedStartDateTime(startDateTime);
                setAppliedEndDateTime(endDateTime);
                setPage(1);
              }}
            >
              Apply
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                const s = new Date();
                s.setHours(0, 0, 0, 0);
                const e = new Date();
                e.setHours(23, 59, 59, 999);
                const sStr = s.toISOString().slice(0, 16);
                const eStr = e.toISOString().slice(0, 16);
                setStartDateTime(sStr);
                setEndDateTime(eStr);
                setAppliedStartDateTime(sStr);
                setAppliedEndDateTime(eStr);
                setPage(1);
              }}
            >
              Reset
            </Button>
          </div>

          {error && <div className="text-red-600 text-sm">{error}</div>}
          <div className="relative">
            <div className="overflow-x-auto min-h-[16rem]">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left border-b">
                    <th className="py-2 pr-4">To</th>
                    <th className="py-2 pr-4">Message</th>
                    <th className="py-2 pr-4">Type</th>
                    <th className="py-2 pr-4">Created At</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((n) => (
                    <tr key={n.id} className="border-b last:border-b-0">
                      <td className="py-2 pr-4">{n.to}</td>
                      <td className="py-2 pr-4 max-w-[480px] truncate">{n.messageBody}</td>
                      <td className="py-2 pr-4">{n.messageType}</td>
                      <td className="py-2 pr-4">{new Date(n.createdAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {items.length === 0 && !isLoading && (
                <div className="text-gray-500 text-sm mt-4">No notifications found.</div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between mt-4">
            {total > 0 && (
              <div className="text-sm text-gray-600">
                Page {page} of {Math.max(totalPages, 1)} • {startIndex}-{endIndex} of {total}
              </div>
            )}
            <div className="space-x-2">
              <Button
                variant="outline"
                disabled={isLoading || page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Prev
              </Button>
              <Button
                variant="outline"
                disabled={isLoading || page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


