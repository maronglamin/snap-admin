'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { Login } from '@/components/auth/Login';

export default function HomePage() {
  const { isAuthenticated, checkAuth } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    console.log('🔍 Debug - HomePage: isAuthenticated =', isAuthenticated);
    console.log('🔍 Debug - HomePage: checkAuth() =', checkAuth());
    
    if (isAuthenticated && checkAuth()) {
      console.log('🔍 Debug - HomePage: Redirecting to dashboard');
      router.push('/dashboard');
    } else {
      console.log('🔍 Debug - HomePage: Showing login page');
    }
  }, [isAuthenticated, checkAuth, router]);

  // Show login screen if not authenticated
  if (!isAuthenticated || !checkAuth()) {
    return <Login />;
  }

  // This should not be reached, but just in case
  return null;
}
