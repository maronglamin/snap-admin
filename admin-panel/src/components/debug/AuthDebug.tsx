'use client';

import { useAuthStore } from '@/stores/authStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';

// Import test utilities
const testAuthentication = async () => {
  console.log('🧪 Testing complete authentication flow...');
  
  // Test 1: Check if user is logged in
  const authStorage = localStorage.getItem('auth-storage');
  console.log('🧪 Current auth storage:', authStorage);
  
  if (!authStorage) {
    console.log('🧪 No auth storage found - user needs to login');
    return false;
  }
  
  try {
    const parsed = JSON.parse(authStorage);
    const token = parsed.state?.token || parsed.token;
    
    if (!token) {
      console.log('🧪 No token found in auth storage');
      return false;
    }
    
    console.log('🧪 Token found:', token.substring(0, 20) + '...');
    
    // Test 2: Test API call with token
    const response = await fetch('http://snap-admin.cloudnexus.biz:8080/api/roles', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('🧪 API test response status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('🧪 API test successful:', data.success);
      return true;
    } else {
      const errorData = await response.json();
      console.log('🧪 API test failed:', errorData);
      return false;
    }
  } catch (error) {
    console.error('🧪 Authentication test error:', error);
    return false;
  }
};

const forceLogin = async () => {
  console.log('🧪 Force logging in...');
  
  try {
    const response = await fetch('http://snap-admin.cloudnexus.biz:8080/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: 'admin',
        password: 'admin123'
      })
    });
    
    const data = await response.json();
    console.log('🧪 Force login response:', data);
    
    if (data.success) {
      // Store the token manually
      const authData = {
        state: {
          isAuthenticated: true,
          user: data.data.admin,
          token: data.data.token
        }
      };
      
      localStorage.setItem('auth-storage', JSON.stringify(authData));
      console.log('🧪 Force login successful - token stored');
      
      // Reload the page to update the auth state
      window.location.reload();
      return true;
    } else {
      console.log('🧪 Force login failed');
      return false;
    }
  } catch (error) {
    console.error('🧪 Force login error:', error);
    return false;
  }
};

export default function AuthDebug() {
  const { isAuthenticated, user, token, login, logout, checkAuth } = useAuthStore();
  const [localStorageData, setLocalStorageData] = useState<string>('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const data = localStorage.getItem('auth-storage');
      setLocalStorageData(data || 'Not found');
    }
  }, [isAuthenticated, token]);

  const handleTestLogin = async () => {
    console.log('🔍 Debug - Testing login with admin/admin123');
    const success = await login('admin', 'admin123');
    console.log('🔍 Debug - Test login result:', success);
  };

  const handleForceLogin = async () => {
    console.log('🔍 Debug - Force login with admin@snap.com/admin123');
    const success = await login('admin@snap.com', 'admin123');
    console.log('🔍 Debug - Force login result:', success);
  };

  const handleCheckAuth = () => {
    const isValid = checkAuth();
    console.log('🔍 Debug - Auth check result:', isValid);
    alert(`Authentication check: ${isValid ? 'Valid' : 'Invalid'}`);
  };

  const handleTestAuth = async () => {
    const result = await testAuthentication();
    alert(`Authentication test: ${result ? 'Passed' : 'Failed'}`);
  };

  const handleForceAuth = async () => {
    const result = await forceLogin();
    if (result) {
      alert('Force login successful! Page will reload.');
    } else {
      alert('Force login failed. Check console for details.');
    }
  };

  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle>🔍 Authentication Debug</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 text-sm">
          <div>
            <strong>Is Authenticated:</strong> {isAuthenticated ? '✅ Yes' : '❌ No'}
          </div>
          <div>
            <strong>User:</strong> {user ? JSON.stringify(user, null, 2) : 'None'}
          </div>
          <div>
            <strong>Token:</strong> {token ? `${token.substring(0, 20)}...` : 'None'}
          </div>
          <div>
            <strong>LocalStorage Raw:</strong> 
            <pre className="text-xs bg-gray-100 p-2 mt-1 rounded overflow-auto max-h-20">
              {localStorageData}
            </pre>
          </div>
          <div className="flex flex-wrap gap-2 mt-4">
            <Button size="sm" onClick={handleTestLogin}>
              Test Login (admin/admin123)
            </Button>
            <Button size="sm" onClick={handleForceLogin}>
              Force Login (admin@snap.com/admin123)
            </Button>
            <Button size="sm" variant="outline" onClick={handleCheckAuth}>
              Check Auth
            </Button>
            <Button size="sm" variant="outline" onClick={handleTestAuth}>
              Test API Auth
            </Button>
            <Button size="sm" variant="outline" onClick={handleForceAuth}>
              Force Auth & Reload
            </Button>
            <Button size="sm" variant="outline" onClick={logout}>
              Logout
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 