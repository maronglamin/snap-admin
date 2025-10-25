'use client';

import React, { useEffect, useState } from 'react';
import { apiService } from '@/services/api';

export default function SimpleTestPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const testAPI = async () => {
      try {
        console.log('Testing API service directly...');
        const dashboardData = await apiService.getDashboardData();
        console.log('Dashboard data received:', dashboardData);
        setData(dashboardData);
      } catch (err) {
        console.error('API Error:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    testAPI();
  }, []);

  if (loading) {
    return <div className="p-8">Loading test data...</div>;
  }

  if (error) {
    return <div className="p-8 text-red-600">Error: {error}</div>;
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Simple API Test Page</h1>
      <div className="mb-4">
        <h2 className="text-lg font-semibold mb-2">Dashboard Data:</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-100 p-4 rounded">
            <strong>Total Users:</strong> {data?.totalUsers}
          </div>
          <div className="bg-gray-100 p-4 rounded">
            <strong>Total Products:</strong> {data?.totalProducts}
          </div>
          <div className="bg-gray-100 p-4 rounded">
            <strong>Total Orders:</strong> {data?.totalOrders}
          </div>
          <div className="bg-gray-100 p-4 rounded">
            <strong>Total Revenue:</strong> ${data?.totalRevenue?.toLocaleString()}
          </div>
        </div>
      </div>
      <pre className="bg-gray-100 p-4 rounded overflow-auto text-sm">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
} 