'use client';

import React, { useEffect, useState } from 'react';
import { apiService } from '@/services/api';
import { mockUsers } from '@/services/mockData';

export default function TestUsersPage() {
  const [apiData, setApiData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const testAPI = async () => {
      try {
        console.log('Testing users API...');
        console.log('Direct mockUsers:', mockUsers);
        
        const usersData = await apiService.getUsers();
        console.log('API users data:', usersData);
        setApiData(usersData);
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
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Testing Users API</h1>
        <div className="text-lg text-gray-600">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Testing Users API</h1>
        <div className="text-lg text-red-600">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Testing Users API</h1>
      
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Direct Mock Data</h2>
        <div className="bg-gray-100 p-4 rounded">
          <p>Total users: {mockUsers.length}</p>
          <p>First user: {mockUsers[0]?.firstName} {mockUsers[0]?.lastName}</p>
        </div>
      </div>

      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">API Response</h2>
        <div className="bg-gray-100 p-4 rounded">
          <p>API data received: {apiData ? 'Yes' : 'No'}</p>
          {apiData && (
            <>
              <p>Total users from API: {apiData.data?.length || 0}</p>
              <p>Pagination: {JSON.stringify(apiData.pagination)}</p>
            </>
          )}
        </div>
      </div>

      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">User List</h2>
        <div className="bg-gray-100 p-4 rounded max-h-96 overflow-y-auto">
          {apiData?.data?.map((user: any) => (
            <div key={user.id} className="mb-2 p-2 bg-white rounded">
              <p><strong>{user.firstName} {user.lastName}</strong> ({user.type})</p>
              <p className="text-sm text-gray-600">{user.email} - {user.status}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 