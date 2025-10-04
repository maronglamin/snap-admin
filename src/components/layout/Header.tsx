'use client';

import React, { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Bell, Search, User, LogOut, Key, Loader2 } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useAdminStore } from '@/stores/adminStore';
import { authApi } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const { addNotification } = useAdminStore();
  
  // Change password state
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [changePasswordError, setChangePasswordError] = useState('');

  const getPageTitle = () => {
    if (pathname === '/dashboard') return 'Dashboard';
    if (pathname === '/users') return 'Users';
    if (pathname === '/users/kyc-approval') return 'KYC Approval';
    if (pathname === '/users/snap-users') return 'SNAP Users';
    if (pathname === '/settlements') return 'Settlement Management';
    if (pathname === '/settlements/cumulative-entries') return 'Cumulative Financial Entries';
    if (pathname === '/products') return 'Products';
    if (pathname === '/orders') return 'Orders';
    if (pathname === '/analytics') return 'Analytics';
    if (pathname === '/settings') return 'Settings';
    if (pathname === '/system-config/roles') return 'Roles Management';
    if (pathname === '/system-config/system-operator') return 'System Operator Management';
    if (pathname === '/system-config/settlement-group') return 'Settlement Group Management';
    if (pathname === '/journals/stripe-payment-report') return 'Stripe Payment Report';
    
    // Default fallback
    return 'Dashboard';
  };

  const handleLogout = async () => {
    console.log('🔍 Debug - Starting logout process');
    
    // Clear auth state
    logout();
    
    // Clear any cached data
    if (typeof window !== 'undefined') {
      // Clear any other stored data that might interfere
      sessionStorage.clear();
    }
    
    // Force redirect to login page
    console.log('🔍 Debug - Redirecting to login page');
    router.push('/');
    
    // Force a hard refresh to ensure clean state
    setTimeout(() => {
      window.location.href = '/';
    }, 200);
  };

  const handleChangePassword = async () => {
    if (!oldPassword || !newPassword || !confirmPassword) {
      setChangePasswordError('All fields are required');
      return;
    }

    if (newPassword !== confirmPassword) {
      setChangePasswordError('New passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      setChangePasswordError('New password must be at least 6 characters');
      return;
    }

    try {
      setIsChangingPassword(true);
      setChangePasswordError('');
      
      await authApi.changePassword(oldPassword, newPassword);
      
      // Reset form
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setIsChangePasswordOpen(false);
      
      addNotification({
        type: 'success',
        title: 'Password Changed',
        message: 'Your password has been changed successfully.'
      });
    } catch (error: any) {
      console.error('Error changing password:', error);
      setChangePasswordError(error.message || 'Failed to change password');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const openChangePassword = () => {
    setOldPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setChangePasswordError('');
    setIsChangePasswordOpen(true);
  };

  return (
    <>
      <header className="bg-white border-b border-gray-200 h-16">
        <div className="flex items-center justify-between h-full px-6">
          <h1 className="text-xl font-semibold text-gray-800">
            {getPageTitle()}
          </h1>
          
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search..."
                className="w-64 pl-10"
              />
            </div>
            
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>
                      <User className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user?.name || 'Admin User'}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user?.email || 'admin@snap.com'}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem>
                  Settings
                </DropdownMenuItem>
                <DropdownMenuItem onClick={openChangePassword}>
                  <Key className="mr-2 h-4 w-4" />
                  Change Password
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Change Password Dialog */}
      <Dialog open={isChangePasswordOpen} onOpenChange={setIsChangePasswordOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
            <DialogDescription>
              Enter your current password and choose a new password.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {changePasswordError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{changePasswordError}</p>
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="old-password">Current Password</Label>
              <Input
                id="old-password"
                type="password"
                placeholder="Enter current password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                placeholder="Enter new password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm New Password</Label>
              <Input
                id="confirm-password"
                type="password"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
            
            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => setIsChangePasswordOpen(false)}
                disabled={isChangingPassword}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleChangePassword} 
                disabled={isChangingPassword || !oldPassword || !newPassword || !confirmPassword}
              >
                {isChangingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Change Password
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
} 