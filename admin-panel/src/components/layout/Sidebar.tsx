'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import {
  LayoutDashboard,
  Users,
  Package,
  ShoppingCart,
  DollarSign,
  Settings,
  LogOut,
  ChevronDown,
  ChevronRight,
  Shield,
  UserCheck,
  Settings as SettingsIcon,
  Key,
  Building,
  FileText,
  BookOpen,
  CreditCard,
  FileSpreadsheet,
  FolderOpen,
  Car,
  UserPlus,
  BarChart3,
  MapPin,
  Store
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { usePermissions } from '@/hooks/usePermissions';

const navigation = [
  { 
    name: 'Dashboard', 
    href: '/dashboard', 
    icon: LayoutDashboard,
    permission: { entityType: 'DASHBOARD', permission: 'VIEW' }
  },
  { 
    name: 'Users KYC', 
    icon: Users,
    permission: { entityType: 'USERS', permission: 'VIEW' },
    submenu: [
      { 
        name: 'SNAP Users', 
        href: '/users/snap-users', 
        icon: UserCheck,
        permission: { entityType: 'USERS_SNAP_USERS', permission: 'VIEW' }
      },
      { 
        name: 'Sellers KYC', 
        href: '/users/kyc-approval', 
        icon: Shield,
        permission: { entityType: 'USERS_KYC_APPROVAL', permission: 'VIEW' }
      },
    ]
  },
  { 
    name: 'Products', 
    icon: Package,
    permission: { entityType: 'PRODUCTS', permission: 'VIEW' },
    submenu: [
      { 
        name: 'Product Listing', 
        href: '/products', 
        icon: Package,
        permission: { entityType: 'PRODUCTS', permission: 'VIEW' }
      },
      { 
        name: 'Categories', 
        href: '/products/categories', 
        icon: FolderOpen,
        permission: { entityType: 'PRODUCTS_CATEGORIES', permission: 'VIEW' }
      },
    ]
  },
  { 
    name: 'Orders', 
    href: '/orders', 
    icon: ShoppingCart,
    permission: { entityType: 'ORDERS', permission: 'VIEW' }
  },
  { 
    name: 'E-commerce', 
    icon: Store,
    permission: { entityType: 'ECOMMERCE', permission: 'VIEW' },
    submenu: [
      { 
        name: 'Principal Business', 
        href: '/ecommerce/principal-business', 
        icon: Store,
        permission: { entityType: 'ECOMMERCE_PRINCIPAL_BUSINESS', permission: 'VIEW' }
      },
      { 
        name: 'Sales Outlets', 
        href: '/ecommerce/sales-outlets', 
        icon: Store,
        permission: { entityType: 'ECOMMERCE_SALES_OUTLETS', permission: 'VIEW' }
      },
    ]
  },
  { 
    name: 'Settlements', 
    icon: DollarSign,
    permission: { entityType: 'SETTLEMENTS', permission: 'VIEW' },
    submenu: [
      { 
        name: 'Settlement Request', 
        href: '/settlements/requests', 
        icon: DollarSign,
        permission: { entityType: 'SETTLEMENTS_REQUESTS', permission: 'VIEW' }
      },
      { 
        name: 'Settlement Sheet', 
        href: '/settlements/sheet', 
        icon: FileSpreadsheet,
        permission: { entityType: 'SETTLEMENTS_SHEET', permission: 'VIEW' }
      },
      { 
        name: 'Cumulative Entries', 
        href: '/settlements/cumulative-entries', 
        icon: FileText,
        permission: { entityType: 'SETTLEMENTS_CUMULATIVE_ENTRIES', permission: 'VIEW' }
      },
    ]
  },
  { 
    name: 'SNAP Ride', 
    icon: Car,
    permission: { entityType: 'SNAP_RIDE', permission: 'VIEW' },
    submenu: [
      { 
        name: 'Driver KYC', 
        href: '/snap-ride/rider-applications', 
        icon: UserPlus,
        permission: { entityType: 'SNAP_RIDE_RIDER_APPLICATIONS', permission: 'VIEW' }
      },
      { 
        name: 'Driver Management', 
        href: '/snap-ride/driver-management', 
        icon: Shield,
        permission: { entityType: 'SNAP_RIDE_DRIVER_MANAGEMENT', permission: 'VIEW' }
      },
      { 
        name: 'Ride Journal', 
        href: '/snap-ride/ride-management', 
        icon: MapPin,
        permission: { entityType: 'SNAP_RIDE_RIDE_MANAGEMENT', permission: 'VIEW' }
      },
      { 
        name: 'Ride Service', 
        href: '/snap-ride/ride-service', 
        icon: Settings,
        permission: { entityType: 'SNAP_RIDE_RIDE_SERVICE', permission: 'VIEW' }
      },
      { 
        name: 'Ride Service Tiers', 
        href: '/snap-ride/ride-service-tiers', 
        icon: Settings,
        permission: { entityType: 'SNAP_RIDE_RIDE_SERVICE_TIERS', permission: 'VIEW' }
      },
      { 
        name: 'Analytics', 
        href: '/snap-ride/analytics', 
        icon: BarChart3,
        permission: { entityType: 'SNAP_RIDE_ANALYTICS', permission: 'VIEW' }
      },
    ]
  },
  { 
    name: 'SNAP Rental', 
    icon: Car,
    permission: { entityType: 'SNAP_RENTAL', permission: 'VIEW' },
    submenu: [
      { 
        name: 'Request', 
        href: '/snap-rental/request', 
        icon: FileText,
        permission: { entityType: 'SNAP_RENTAL_REQUEST', permission: 'VIEW' }
      },
    ]
  },
  { 
    name: 'System Configuration', 
    icon: Settings,
    permission: { entityType: 'SYSTEM_CONFIG', permission: 'VIEW' },
    submenu: [
      { 
        name: 'Roles', 
        href: '/system-config/roles', 
        icon: Key,
        permission: { entityType: 'SYSTEM_CONFIG_ROLES', permission: 'VIEW' }
      },
      { 
        name: 'Operator Groups', 
        href: '/system-config/operator-entity', 
        icon: Building,
        permission: { entityType: 'SYSTEM_CONFIG_OPERATOR_ENTITY', permission: 'VIEW' }
      },
      { 
        name: 'System Users', 
        href: '/system-config/system-operator', 
        icon: Shield,
        permission: { entityType: 'SYSTEM_CONFIG_SYSTEM_OPERATOR', permission: 'VIEW' }
      },
      { 
        name: 'Settlement Group', 
        href: '/system-config/settlement-group', 
        icon: DollarSign,
        permission: { entityType: 'SYSTEM_CONFIG_SETTLEMENT_GROUP', permission: 'VIEW' }
      },
      { 
        name: 'Payment Gateways', 
        href: '/system-config/payment-gateways', 
        icon: CreditCard,
        permission: { entityType: 'SYSTEM_CONFIG_PAYMENT_GATEWAYS', permission: 'VIEW' }
      },
    ]
  },
  {
    name: "Analytics",
    icon: BarChart3,
    permission: { entityType: 'ANALYTICS', permission: 'VIEW' },
    submenu: [
      { 
        name: "Revenue Analysis", 
        href: "/analytics/revenue", 
        icon: DollarSign,
        permission: { entityType: 'ANALYTICS_REVENUE', permission: 'VIEW' }
      },
    ],
  },
  {
    name: "Journals",
    icon: BookOpen,
    permission: { entityType: 'JOURNALS', permission: 'VIEW' },
    submenu: [
      { 
        name: "Stripe Payment Report", 
        href: "/journals/stripe-payment-report", 
        icon: CreditCard,
        permission: { entityType: 'JOURNALS_STRIPE_PAYMENT_REPORT', permission: 'VIEW' }
      },
      { 
        name: "Snap Fee Report", 
        href: "/journals/snap-fee-report", 
        icon: DollarSign,
        permission: { entityType: 'JOURNALS_SNAP_FEE_REPORT', permission: 'VIEW' }
      },
      { 
        name: "Transaction Logs", 
        href: "/journals/audit-report", 
        icon: FileText,
        permission: { entityType: 'JOURNALS_AUDIT_REPORT', permission: 'VIEW' }
      },
    ],
  },
  {
    name: 'Authentication',
    icon: Key,
    permission: { entityType: 'AUTHENTICATION', permission: 'VIEW' },
    submenu: [
      {
        name: 'Device Authentication',
        href: '/authentication/device-authentication',
        icon: Shield,
        permission: { entityType: 'AUTHENTICATION_DEVICE_AUTHENTICATION', permission: 'VIEW' },
      },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { logout } = useAuthStore();
  const { hasPermission } = usePermissions();
  const [expandedMenus, setExpandedMenus] = useState<string[]>([]);

  const toggleMenu = (menuName: string) => {
    setExpandedMenus(prev => 
      prev.includes(menuName) 
        ? prev.filter(name => name !== menuName)
        : [...prev, menuName]
    );
  };

  const isMenuExpanded = (menuName: string) => expandedMenus.includes(menuName);

  // Filter navigation items based on permissions
  const filterNavigationByPermissions = (items: any[]) => {
    return items.filter(item => {
      // Check if user has permission for this item
      if (item.permission) {
        const hasAccess = hasPermission(item.permission.entityType, item.permission.permission);
        if (!hasAccess) return false;
      }

      // For items with submenu, check if user has access to any submenu item
      if (item.submenu) {
        const hasSubmenuAccess = item.submenu.some((subItem: any) => {
          if (subItem.permission) {
            return hasPermission(subItem.permission.entityType, subItem.permission.permission);
          }
          return true;
        });
        if (!hasSubmenuAccess) return false;
      }

      return true;
    });
  };

  const filteredNavigation = filterNavigationByPermissions(navigation);

  return (
    <div className="flex h-full w-64 flex-col bg-white border-r border-gray-200">
      <div className="flex h-16 items-center justify-start border-b border-gray-200 px-3">
        <div className="flex items-center gap-2">
          <Image
            src="/snap.svg"
            alt="SNAP"
            width={64}
            height={64}
            className="h-12 w-auto"
            priority
          />
          <h1 className="text-xl font-bold text-gray-900">SNAP Admin</h1>
        </div>
      </div>
      
      <nav className="flex-1 space-y-1 px-3 py-4">
        {filteredNavigation.map((item) => {
          const isActive = pathname === item.href;
          const hasSubmenu = 'submenu' in item;
          const isExpanded = hasSubmenu ? isMenuExpanded(item.name) : false;
          const isSubmenuActive = hasSubmenu && item.submenu?.some((sub: any) => pathname === sub.href);

          if (hasSubmenu) {
            return (
              <div key={item.name}>
                <button
                  onClick={() => toggleMenu(item.name)}
                  className={cn(
                    'group flex w-full items-center justify-between px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 relative',
                    isSubmenuActive
                      ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-500'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  )}
                >
                  <div className="flex items-center">
                    {isSubmenuActive && (
                      <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-1 h-8 bg-blue-500 rounded-r-full" />
                    )}
                    <item.icon
                      className={cn(
                        'mr-3 h-5 w-5 flex-shrink-0 transition-colors',
                        isSubmenuActive ? 'text-blue-600' : 'text-gray-500 group-hover:text-gray-700'
                      )}
                    />
                    {item.name}
                  </div>
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-gray-500" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-gray-500" />
                  )}
                </button>
                
                {isExpanded && (
                  <div className="ml-6 mt-1 space-y-1">
                    {item.submenu?.filter((subItem: any) => {
                      if (subItem.permission) {
                        return hasPermission(subItem.permission.entityType, subItem.permission.permission);
                      }
                      return true;
                    }).map((subItem: any) => {
                      const isSubActive = pathname === subItem.href;
                      return (
                        <Link
                          key={subItem.name}
                          href={subItem.href}
                          className={cn(
                            'group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200',
                            isSubActive
                              ? 'bg-blue-50 text-blue-700'
                              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                          )}
                        >
                          <subItem.icon
                            className={cn(
                              'mr-3 h-4 w-4 flex-shrink-0 transition-colors',
                              isSubActive ? 'text-blue-600' : 'text-gray-500 group-hover:text-gray-700'
                            )}
                          />
                          {subItem.name}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 relative',
                isActive
                  ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-500'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              )}
            >
              {isActive && (
                <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-1 h-8 bg-blue-500 rounded-r-full" />
              )}
              <item.icon
                className={cn(
                  'mr-3 h-5 w-5 flex-shrink-0 transition-colors',
                  isActive ? 'text-blue-600' : 'text-gray-500 group-hover:text-gray-700'
                )}
              />
              {item.name}
            </Link>
          );
        })}
      </nav>
    </div>
  );
} 