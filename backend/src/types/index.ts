import { Request } from 'express';

// User Types
export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  password?: string;
  type: UserType;
  status: UserStatus;
  createdAt: Date;
  updatedAt: Date;
  sellerKyc?: SellerKyc;
  products?: Product[];
  orders?: Order[];
  settlements?: Settlement[];
}

export interface SellerKyc {
  id: string;
  userId: string;
  status: KycStatus;
  documents: KycDocument[];
  submittedAt: Date;
  verifiedAt?: Date;
  rejectedAt?: Date;
  rejectionReason?: string;
  user?: User;
}

export interface KycDocument {
  id: string;
  kycId: string;
  type: string;
  url: string;
  uploadedAt: Date;
  kyc?: SellerKyc;
}

// Product Types
export interface Product {
  id: string;
  sellerId: string;
  title: string;
  description: string;
  price: number;
  currencyCode: string;
  quantity: number;
  status: ProductStatus;
  condition: ProductCondition;
  categoryId: string;
  locationId: string;
  isFeatured: boolean;
  rating?: number;
  ratingCount: number;
  views: number;
  favorites: number;
  createdAt: Date;
  updatedAt: Date;
  seller?: User;
  orders?: OrderItem[];
}

// Order Types
export interface Order {
  id: string;
  userId: string;
  totalAmount: number;
  currencyCode: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  shippingAddress?: any;
  billingAddress?: any;
  createdAt: Date;
  updatedAt: Date;
  user?: User;
  items?: OrderItem[];
  settlements?: Settlement[];
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  quantity: number;
  price: number;
  createdAt: Date;
  order?: Order;
  product?: Product;
}

// Settlement Types
export interface Settlement {
  id: string;
  userId: string;
  orderId?: string;
  type: SettlementType;
  amount: number;
  currencyCode: string;
  status: SettlementStatus;
  serviceFeesDeducted: number;
  netAmount: number;
  processedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  user?: User;
  order?: Order;
}

// Admin Types
export interface Admin {
  id: string;
  email: string;
  password: string;
  name: string;
  username: string;
  isActive: boolean;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
  operatorEntityId: string;
  operatorEntityName?: string;
  roleName?: string;
}

// Dashboard Types
export interface DashboardData {
  totalUsers: number;
  totalProducts: number;
  totalOrders: number;
  totalRevenue: number;
  pendingSettlements: number;
  pendingKyc: number;
  userGrowth: ChartData[];
  revenueData: ChartData[];
  topProducts: Product[];
  recentOrders: Order[];
}

export interface ChartData {
  date: string;
  value: number;
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Request Types
export interface AuthenticatedRequest extends Request {
  user?: Admin;
}

// Enums
export enum UserType {
  BUYER = 'BUYER',
  SELLER = 'SELLER',
}

export enum UserStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
}

export enum KycStatus {
  PENDING = 'PENDING',
  VERIFIED = 'VERIFIED',
  REJECTED = 'REJECTED',
}

export enum ProductStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
}

export enum ProductCondition {
  NEW = 'NEW',
  LIKE_NEW = 'LIKE_NEW',
  GOOD = 'GOOD',
  FAIR = 'FAIR',
  POOR = 'POOR',
}

export enum OrderStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  SHIPPED = 'SHIPPED',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
}

export enum SettlementStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

export enum SettlementType {
  PAYOUT = 'PAYOUT',
  REFUND = 'REFUND',
  COMMISSION = 'COMMISSION',
}

 