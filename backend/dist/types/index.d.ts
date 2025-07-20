import { Request } from 'express';
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
export interface AuthenticatedRequest extends Request {
    user?: Admin;
}
export declare enum UserType {
    BUYER = "BUYER",
    SELLER = "SELLER"
}
export declare enum UserStatus {
    PENDING = "PENDING",
    ACTIVE = "ACTIVE",
    INACTIVE = "INACTIVE",
    SUSPENDED = "SUSPENDED"
}
export declare enum KycStatus {
    PENDING = "PENDING",
    VERIFIED = "VERIFIED",
    REJECTED = "REJECTED"
}
export declare enum ProductStatus {
    PENDING = "PENDING",
    ACTIVE = "ACTIVE",
    INACTIVE = "INACTIVE",
    SUSPENDED = "SUSPENDED"
}
export declare enum ProductCondition {
    NEW = "NEW",
    LIKE_NEW = "LIKE_NEW",
    GOOD = "GOOD",
    FAIR = "FAIR",
    POOR = "POOR"
}
export declare enum OrderStatus {
    PENDING = "PENDING",
    CONFIRMED = "CONFIRMED",
    SHIPPED = "SHIPPED",
    DELIVERED = "DELIVERED",
    CANCELLED = "CANCELLED",
    REFUNDED = "REFUNDED"
}
export declare enum PaymentStatus {
    PENDING = "PENDING",
    PAID = "PAID",
    FAILED = "FAILED",
    REFUNDED = "REFUNDED"
}
export declare enum SettlementStatus {
    PENDING = "PENDING",
    PROCESSING = "PROCESSING",
    COMPLETED = "COMPLETED",
    FAILED = "FAILED",
    CANCELLED = "CANCELLED"
}
export declare enum SettlementType {
    PAYOUT = "PAYOUT",
    REFUND = "REFUND",
    COMMISSION = "COMMISSION"
}
//# sourceMappingURL=index.d.ts.map