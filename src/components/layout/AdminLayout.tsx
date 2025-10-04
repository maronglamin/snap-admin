'use client';

import React from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { NotificationToast } from './NotificationToast';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
      <NotificationToast />
    </div>
  );
} 