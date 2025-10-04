// User Management Types
export interface User {
  id: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  phoneNumber: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
  status: UserStatus;
  type: UserType;
  sellerKyc?: SellerKyc;
  products: Product[];
  orders: Order[];
  settlements: Settlement[];
}

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  PENDING = 'pending'
}

export enum UserType {
  BUYER = 'buyer',
  SELLER = 'seller',
  BOTH = 'both'
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
}

export enum KycStatus {
  PENDING = 'pending',
  VERIFIED = 'verified',
  REJECTED = 'rejected',
  NOT_REQUIRED = 'not_required'
}

export interface KycDocument {
  id: string;
  type: string;
  url: string;
  uploadedAt: Date;
}

// Product Management Types
export interface Product {
  id: string;
  sellerId: string;
  title: string;
  description?: string;
  price: number;
  currencyCode: string;
  quantity: number;
  status: ProductStatus;
  condition: ProductCondition;
  categoryId?: string;
  locationId: string;
  isFeatured: boolean;
  rating?: number;
  ratingCount: number;
  views: number;
  favorites: number;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
  featuredUntil?: string;
  metadata?: any;
  seller?: {
    id: string;
    firstName: string;
    lastName: string;
    phoneNumber: string;
    sellerKyc?: {
      id: string;
      businessName: string;
      status: string;
      verifiedAt?: string;
    };
  };
  category?: {
    id: string;
    name: string;
    slug: string;
    description?: string;
  };
  location?: {
    id: string;
    city: string;
    region: string;
    countryCode: string;
    latitude?: number;
    longitude?: number;
  };
  images?: ProductImage[];
  attributes?: ProductAttribute[];
  deliveryOptions?: ProductDeliveryOption[];
  orderItems?: OrderItem[];
  productViews?: ProductView[];
  productOrderInterests?: ProductOrderInterest[];
}

export enum ProductStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SOLD = 'sold',
  SUSPENDED = 'suspended',
  PENDING_REVIEW = 'pending_review'
}

export enum ProductCondition {
  NEW = 'new',
  LIKE_NEW = 'like_new',
  GOOD = 'good',
  FAIR = 'fair',
  POOR = 'poor'
}

// Order Management Types
export interface Order {
  id: string;
  orderNumber: string;
  userId: string;
  sellerId: string;
  status: OrderStatus;
  subtotal: number;
  taxAmount: number;
  shippingAmount: number;
  discountAmount: number;
  totalAmount: number;
  currencyCode: string;
  customerName: string;
  customerEmail?: string;
  customerPhone: string;
  shippingAddress: string;
  billingAddress?: string;
  paymentMethod?: string;
  paymentStatus: PaymentStatus;
  paymentReference?: string;
  paidAt?: string;
  shippingMethod?: string;
  trackingNumber?: string;
  shippedAt?: string;
  deliveredAt?: string;
  notes?: string;
  sellerNotes?: string;
  metadata?: any;
  createdAt: string;
  updatedAt: string;
  cancelledAt?: string;
  deliveryCurrency?: string;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    phoneNumber: string;
  };
  seller?: {
    id: string;
    firstName: string;
    lastName: string;
    phoneNumber: string;
  };
  orderItems?: OrderItem[];
  externalTransactions?: ExternalTransaction[];
}

export enum OrderStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  SHIPPED = 'shipped',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded'
}

export enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  FAILED = 'failed',
  REFUNDED = 'refunded'
}

export interface OrderItem {
  id: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  status: string;
  productSnapshot: any;
  createdAt: string;
  updatedAt: string;
  product: Product;
}

export interface ExternalTransaction {
  id: string;
  orderId: string;
  customerId: string;
  sellerId: string;
  paymentMethodId?: string;
  gatewayProvider: string;
  gatewayTransactionId?: string;
  paymentReference?: string;
  appTransactionId: string;
  transactionType: string;
  amount: number;
  currencyCode: string;
  gatewayChargeFees?: number;
  processedAmount?: number;
  paidThroughGateway: boolean;
  gatewayResponse?: any;
  gatewayRequest?: any;
  status: string;
  failureReason?: string;
  processedAt?: string;
  createdAt: string;
  updatedAt: string;
  customer?: {
    id: string;
    firstName: string;
    lastName: string;
    phoneNumber: string;
  };
  seller?: {
    id: string;
    firstName: string;
    lastName: string;
    phoneNumber: string;
  };
  paymentMethod?: {
    id: string;
    type: string;
    provider: string;
    accountId: string;
    accountName: string;
    isDefault: boolean;
    status: string;
    metadata?: any;
  };
}

// Settlement Management Types
export interface Settlement {
  id: string;
  userId: string;
  amount: number;
  currency: string;
  status: SettlementStatus;
  type: SettlementType;
  reference: string;
  includedOrderIds: string[];
  totalOrdersCount: number;
  serviceFeesDeducted: number;
  netAmountBeforeFees: number;
  createdAt: Date;
  processedAt?: Date;
}

export enum SettlementStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED'
}

export enum SettlementType {
  BANK_TRANSFER = 'BANK_TRANSFER',
  WALLET_TRANSFER = 'WALLET_TRANSFER'
}

// Analytics Types
export interface DashboardData {
  customerBase: number;
  ecommerceSellers: number;
  rideDrivers: number;
  totalRevenue: number;
  currentMonth: string;
  currency: string;
  customerBaseGrowth: string;
  ecommerceSellersGrowth: string;
  rideDriversGrowth: string;
  totalRevenueGrowth: string;
  pendingSettlements: number;
  pendingKyc: number;
  userGrowth: ChartData[];
  revenueData: ChartData[];
  userGrowthData: Array<{
    date: string;
    customers: number;
    sellers: number;
    drivers: number;
  }>;
  userGrowthTrendData: Array<{
    date: string;
    customers: number;
    sellers: number;
    drivers: number;
  }>;
  topProducts: Product[];
  recentOrders: Order[];
  recentActivities: Array<{
    id: string;
    type: string;
    title: string;
    description: string;
    timestamp: string;
    icon: string;
  }>;
}

export interface ChartData {
  date: string;
  value?: number;
  rides: number;
  ecommerce: number;
  label?: string;
}

// Admin Types
export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: AdminRole;
  permissions: Permission[];
  lastLogin?: Date;
}

export enum AdminRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  MODERATOR = 'MODERATOR',
  SUPPORT = 'SUPPORT',
  ANALYST = 'ANALYST'
}

export interface Permission {
  resource: string;
  action: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE';
  conditions?: object;
}

// API Response Types
export interface ApiResponse<T> {
  data: T;
  message: string;
  success: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Filter and Search Types
export interface UserListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: UserStatus;
  type?: UserType;
  kycStatus?: KycStatus;
}

export interface SettlementListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: SettlementStatus;
  dateFrom?: string;
  dateTo?: string;
}

export interface AnalyticsParams {
  dateFrom: string;
  dateTo: string;
  groupBy?: 'day' | 'week' | 'month';
} 

export interface ProductImage {
  id: string;
  productId: string;
  imageUrl: string;
  isPrimary: boolean;
  width?: number;
  height?: number;
  size?: number;
  format?: string;
  altText?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProductAttribute {
  id: string;
  productId: string;
  key: string;
  value: string;
  unit?: string;
  isFilterable: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProductDeliveryOption {
  id: string;
  productId: string;
  deliveryType: string;
  name: string;
  description?: string;
  price: number;
  currencyCode: string;
  estimatedDays: number;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProductView {
  id: string;
  productId: string;
  userId: string;
  deviceId?: string;
  ipAddress?: string;
  viewedAt: string;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    phoneNumber: string;
  };
}

export interface ProductOrderInterest {
  id: string;
  productId: string;
  userId: string;
  quantity: number;
  originalPrice: number;
  discountPrice?: number;
  totalAmount: number;
  currencyCode: string;
  status: string;
  notes?: string;
  preferredDeliveryDate?: string;
  deliveryAddress?: string;
  contactPhone?: string;
  paymentMethod?: string;
  paymentStatus: string;
  createdAt: string;
  updatedAt: string;
  expiresAt?: string;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    phoneNumber: string;
  };
} 