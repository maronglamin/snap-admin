import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { AdminUser, AdminRole } from '@/types';

interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: Date;
}

interface AdminState {
  user: AdminUser | null;
  notifications: Notification[];
  isLoading: boolean;
  error: string | null;
  
  // Actions
  setUser: (user: AdminUser) => void;
  logout: () => void;
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) => void;
  removeNotification: (id: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useAdminStore = create<AdminState>()(
  devtools(
    (set, get) => ({
      user: {
        id: '1',
        email: 'admin@snap.com',
        name: 'Admin User',
        role: AdminRole.SUPER_ADMIN,
        permissions: [
          { resource: 'users', action: 'READ' },
          { resource: 'users', action: 'UPDATE' },
          { resource: 'products', action: 'READ' },
          { resource: 'products', action: 'UPDATE' },
          { resource: 'orders', action: 'READ' },
          { resource: 'settlements', action: 'READ' },
          { resource: 'settlements', action: 'UPDATE' },
          { resource: 'analytics', action: 'READ' },
        ],
        lastLogin: new Date()
      },
      notifications: [],
      isLoading: false,
      error: null,

      setUser: (user) => set({ user }),
      logout: () => set({ user: null, notifications: [] }),
      addNotification: (notification) => {
        const newNotification: Notification = {
          ...notification,
          id: Date.now().toString(),
          timestamp: new Date()
        };
        set((state) => ({ 
          notifications: [...state.notifications, newNotification] 
        }));
        
        // Auto remove notification after 5 seconds
        setTimeout(() => {
          get().removeNotification(newNotification.id);
        }, 5000);
      },
      removeNotification: (id) =>
        set((state) => ({
          notifications: state.notifications.filter(n => n.id !== id)
        })),
      setLoading: (loading) => set({ isLoading: loading }),
      setError: (error) => set({ error }),
    }),
    { name: 'admin-store' }
  )
); 