'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { useRouter } from 'next/navigation';
import { authApi } from '@/services/api';

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const { isAuthenticated, logout, sessionExpired, clearSessionExpired, markSessionExpired } = useAuthStore();
  const [isHydrated, setIsHydrated] = useState(false);
  const router = useRouter();

  // Idle tracking refs
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const heartbeatTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const modalArmedRef = useRef<boolean>(false);
  const hasShownSessionModalRef = useRef<boolean>(false);
  const [showSessionModal, setShowSessionModal] = useState(false);

  // Constants
  const IDLE_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
  const HEARTBEAT_INTERVAL_MS = 2 * 60 * 1000; // every 2 minutes

  // Hydration
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // Global fetch interceptor for token rotation and 401 handling
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const originalFetch = window.fetch;

    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const response = await originalFetch(input as any, init);
      try {
        const refreshedToken = response.headers.get('x-token');
        if (refreshedToken) {
          useAuthStore.setState((prev: any) => ({
            ...prev,
            token: refreshedToken,
            isAuthenticated: true,
          }));
        }
        if (response.status === 401) {
          // Mark session expired; modal will show on next interaction
          try {
            const state = useAuthStore.getState();
            if (state.isAuthenticated && !state.sessionExpired && !hasShownSessionModalRef.current) {
              state.markSessionExpired();
            }
          } catch {}
        }
      } catch {}
      return response;
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  // Idle tracking and heartbeat
  useEffect(() => {
    if (!isAuthenticated) return;

    const resetIdleTimer = () => {
      lastActivityRef.current = Date.now();
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
      }
      idleTimerRef.current = setTimeout(() => {
        // If still idle past timeout, logout
        const now = Date.now();
        if (now - lastActivityRef.current >= IDLE_TIMEOUT_MS) {
          // Do not logout immediately; instead arm modal and wait for next action
          if (!hasShownSessionModalRef.current) {
            markSessionExpired();
            modalArmedRef.current = true;
          }
        }
      }, IDLE_TIMEOUT_MS);
    };

    // Track user activity events
    const activityHandler = () => resetIdleTimer();
    window.addEventListener('mousemove', activityHandler, { passive: true });
    window.addEventListener('keydown', activityHandler, { passive: true } as any);
    window.addEventListener('mousedown', activityHandler, { passive: true });
    window.addEventListener('scroll', activityHandler, { passive: true });
    window.addEventListener('touchstart', activityHandler, { passive: true });

    // Start initial timer
    resetIdleTimer();

    // Heartbeat while authenticated to keep token fresh during active use
    if (heartbeatTimerRef.current) {
      clearInterval(heartbeatTimerRef.current);
    }
    heartbeatTimerRef.current = setInterval(async () => {
      // Only ping if there was activity in the last minute
      if (Date.now() - lastActivityRef.current < 60 * 1000) {
        try {
          await authApi.getProfile();
        } catch {
          // ignore heartbeat errors
        }
      }
    }, HEARTBEAT_INTERVAL_MS);

    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      window.removeEventListener('mousemove', activityHandler as any);
      window.removeEventListener('keydown', activityHandler as any);
      window.removeEventListener('mousedown', activityHandler as any);
      window.removeEventListener('scroll', activityHandler as any);
      window.removeEventListener('touchstart', activityHandler as any);
      if (heartbeatTimerRef.current) clearInterval(heartbeatTimerRef.current);
    };
  }, [isAuthenticated, logout, router]);

  // When session is expired, show modal immediately and (also) on next interaction
  useEffect(() => {
    if (!sessionExpired) {
      setShowSessionModal(false);
      modalArmedRef.current = false;
      return;
    }
    // Arm if not already
    modalArmedRef.current = true;
    // Show immediately so user doesn't need to click again
    if (!hasShownSessionModalRef.current) {
      setShowSessionModal(true);
      hasShownSessionModalRef.current = true;
    }

    const showModalOnInteraction = () => {
      if (modalArmedRef.current && sessionExpired) {
        if (!hasShownSessionModalRef.current) {
          setShowSessionModal(true);
          hasShownSessionModalRef.current = true;
        }
        modalArmedRef.current = false;
      }
    };
    window.addEventListener('click', showModalOnInteraction);
    window.addEventListener('keydown', showModalOnInteraction as any);
    window.addEventListener('touchstart', showModalOnInteraction);
    return () => {
      window.removeEventListener('click', showModalOnInteraction);
      window.removeEventListener('keydown', showModalOnInteraction as any);
      window.removeEventListener('touchstart', showModalOnInteraction);
    };
  }, [sessionExpired]);

  const handleSessionModalConfirm = () => {
    clearSessionExpired();
    logout();
    router.push('/');
  };

  // Don't render anything until hydration is complete
  if (!isHydrated) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-lg text-gray-600">Loading...</div>
      </div>
    );
  }

  // Always render children; wrap with AdminLayout only if authenticated
  return (
    <>
      {showSessionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6 text-center">
            <h2 className="text-xl font-semibold mb-2">Session expired</h2>
            <p className="text-gray-600 mb-6">
              Your session has expired. Please log in again to continue.
            </p>
            <div className="flex justify-center gap-3">
              <button
                className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300"
                onClick={handleSessionModalConfirm}
              >
                Login
              </button>
            </div>
          </div>
        </div>
      )}
      {isAuthenticated ? <AdminLayout>{children}</AdminLayout> : <>{children}</>}
    </>
  );
} 