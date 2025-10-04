import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authApi } from '@/services/api';

interface AuthState {
  isAuthenticated: boolean;
  user: {
    id: string;
    email: string;
    username: string;
    name: string;
    role: string;
    permissions?: Record<string, Record<string, boolean>>;
  } | null;
  token: string | null;
  mfaRequired: boolean;
  mfaSetupRequired: boolean;
  pendingAdminId: string | null;
  mfaData: any | null;
  
  login: (username: string, password: string) => Promise<boolean>;
  verifyMFA: (adminId: string, token: string) => Promise<boolean>;
  verifyBackupCode: (adminId: string, backupCode: string) => Promise<boolean>;
  enableMFA: (adminId: string, token: string) => Promise<boolean>;
  logout: () => void;
  checkAuth: () => boolean;
  resetMFAState: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      isAuthenticated: false,
      user: null,
      token: null,
      mfaRequired: false,
      mfaSetupRequired: false,
      pendingAdminId: null,
      mfaData: null,
      
      login: async (username: string, password: string) => {
        try {
          console.log('🔍 Debug - Attempting login with:', username);
          const response = await authApi.login({ username, password });
          console.log('🔍 Debug - Login response:', response);
          
          if (response.success && response.requiresMFASetup) {
            console.log('🔍 Debug - MFA setup required');
            set({
              mfaSetupRequired: true,
              pendingAdminId: response.adminId,
              mfaData: response.mfaData
            });
            return false; // Login not complete yet
          }
          
          if (response.success && response.requiresMFA) {
            console.log('🔍 Debug - MFA verification required');
            set({
              mfaRequired: true,
              pendingAdminId: response.adminId
            });
            return false; // Login not complete yet
          }
          
          if (response.success) {
            console.log('🔍 Debug - Login successful, setting auth state');
            const newState = {
              isAuthenticated: true,
              user: response.data.admin,
              token: response.data.token,
              mfaRequired: false,
              mfaSetupRequired: false,
              pendingAdminId: null,
              mfaData: null
            };
            console.log('🔍 Debug - New auth state:', newState);
            set(newState);
            return true;
          } else {
            console.log('🔍 Debug - Login failed - no success flag');
            return false;
          }
        } catch (error) {
          console.error('🔍 Debug - Login error:', error);
          return false;
        }
      },
      
      verifyMFA: async (adminId: string, token: string) => {
        try {
          console.log('🔍 Debug - Attempting MFA verification for adminId:', adminId);
          const response = await authApi.verifyMFA({ adminId, token });
          console.log('🔍 Debug - MFA verification response:', response);
          
          if (response.success) {
            console.log('🔍 Debug - MFA verification successful, setting auth state');
            const newState = {
              isAuthenticated: true,
              user: response.data.admin,
              token: response.data.token,
              mfaRequired: false,
              mfaSetupRequired: false,
              pendingAdminId: null,
              mfaData: null
            };
            console.log('🔍 Debug - New auth state after MFA:', newState);
            set(newState);
            return true;
          } else {
            console.log('🔍 Debug - MFA verification failed');
            return false;
          }
        } catch (error) {
          console.error('🔍 Debug - MFA verification error:', error);
          return false;
        }
      },
      
      verifyBackupCode: async (adminId: string, backupCode: string) => {
        try {
          console.log('🔍 Debug - Attempting backup code verification for adminId:', adminId);
          const response = await authApi.verifyBackupCode({ adminId, backupCode });
          console.log('🔍 Debug - Backup code verification response:', response);
          
          if (response.success) {
            console.log('🔍 Debug - Backup code verification successful, setting auth state');
            const newState = {
              isAuthenticated: true,
              user: response.data.admin,
              token: response.data.token,
              mfaRequired: false,
              mfaSetupRequired: false,
              pendingAdminId: null,
              mfaData: null
            };
            console.log('🔍 Debug - New auth state after backup code:', newState);
            set(newState);
            return true;
          } else {
            console.log('🔍 Debug - Backup code verification failed');
            return false;
          }
        } catch (error) {
          console.error('🔍 Debug - Backup code verification error:', error);
          return false;
        }
      },
      
      enableMFA: async (adminId: string, token: string) => {
        try {
          console.log('🔍 Debug - Attempting to enable MFA with token');
          const response = await authApi.enableMFA({ adminId, token });
          console.log('🔍 Debug - Enable MFA response:', response);
          
          if (response.success) {
            console.log('🔍 Debug - MFA enabled successfully, setting auth state');
            const newState = {
              isAuthenticated: true,
              user: response.data.admin,
              token: response.data.token,
              mfaRequired: false,
              mfaSetupRequired: false,
              pendingAdminId: null,
              mfaData: null
            };
            console.log('🔍 Debug - New auth state after MFA setup:', newState);
            set(newState);
            return true;
          } else {
            console.log('🔍 Debug - MFA enable failed');
            return false;
          }
        } catch (error) {
          console.error('🔍 Debug - Enable MFA error:', error);
          return false;
        }
      },
      
      resetMFAState: () => {
        set({
          mfaRequired: false,
          mfaSetupRequired: false,
          pendingAdminId: null,
          mfaData: null
        });
      },
      
      logout: () => {
        console.log('🔍 Debug - Logging out, clearing auth state');
        // Clear localStorage manually to ensure it's removed
        if (typeof window !== 'undefined') {
          localStorage.removeItem('auth-storage');
        }
        set({
          isAuthenticated: false,
          user: null,
          token: null,
          mfaRequired: false,
          mfaSetupRequired: false,
          pendingAdminId: null,
          mfaData: null
        });
      },
      checkAuth: () => {
        const state = get();
        console.log('🔍 Debug - Current auth state:', state);
        return state.isAuthenticated && !!state.token;
      }
    }),
    {
      name: 'auth-storage',
      partialize: (state) => {
        console.log('🔍 Debug - Persisting auth state:', state);
        return { 
          isAuthenticated: state.isAuthenticated, 
          user: state.user,
          token: state.token
          // Don't persist MFA state
        };
      },
      onRehydrateStorage: () => (state) => {
        console.log('🔍 Debug - Rehydrated auth state:', state);
      }
    }
  )
); 