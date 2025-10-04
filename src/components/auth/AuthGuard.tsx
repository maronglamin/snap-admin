'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { isAuthenticated, checkAuth } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    console.log('🔍 Debug - AuthGuard: isAuthenticated =', isAuthenticated);
    console.log('🔍 Debug - AuthGuard: checkAuth() =', checkAuth());
    
    if (!isAuthenticated || !checkAuth()) {
      console.log('🔍 Debug - AuthGuard: Not authenticated, redirecting to login');
      router.push('/');
    }
  }, [isAuthenticated, checkAuth, router]);

  // Don't render children if not authenticated
  if (!isAuthenticated || !checkAuth()) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-lg text-gray-600">Redirecting to login...</div>
      </div>
    );
  }

  return <>{children}</>;
} 