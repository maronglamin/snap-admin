import { 
  User, 
  Product, 
  Order, 
  Settlement, 
  DashboardData,
  UserListParams,
  SettlementListParams,
  AnalyticsParams,
  PaginatedResponse,
  ApiResponse
} from '@/types';
import { 
  mockUsers, 
  mockProducts, 
  mockOrders, 
  mockSettlements, 
  mockDashboardData 
} from './mockData';

const API_BASE_URL = 'http://localhost:8080/api';

// Helper function to get auth token
const getAuthToken = () => {
  if (typeof window !== 'undefined') {
    const authStorage = localStorage.getItem('auth-storage');
    if (authStorage) {
      try {
        const parsed = JSON.parse(authStorage);
        // The token is stored directly in the root object, not in state
        const token = parsed.token || parsed.state?.token || parsed.accessToken || null;
        return token;
      } catch (error) {
        console.error('Error parsing auth storage:', error);
        return null;
      }
    }
  }
  return null;
};

// Helper function for API requests
export const apiRequest = async (endpoint: string, options: RequestInit = {}) => {
  const token = getAuthToken();
  
  const config: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
    ...options,
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
  
  // Handle rate limiting and other errors
  if (response.status === 429) {
    throw new Error('Too many requests. Please wait a moment and try again.');
  }
  
  if (!response.ok) {
    // Try to parse error message from JSON
    try {
      const data = await response.json();
      throw new Error(data.error || `HTTP ${response.status}: ${response.statusText}`);
    } catch (parseError) {
      // If JSON parsing fails, use status text
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
  }

  // Only try to parse JSON if response is ok
  try {
    const data = await response.json();
    return data;
  } catch (parseError) {
    throw new Error('Invalid JSON response from server');
  }
};

// Roles API
export const rolesApi = {
  getAll: () => apiRequest('/roles'),
  create: (roleData: any) => apiRequest('/roles', {
    method: 'POST',
    body: JSON.stringify(roleData),
  }),
  update: (id: string, roleData: any) => apiRequest(`/roles/${id}`, {
    method: 'PUT',
    body: JSON.stringify(roleData),
  }),
  delete: (id: string) => apiRequest(`/roles/${id}`, {
    method: 'DELETE',
  }),
  getAvailablePermissions: () => apiRequest('/roles/available-permissions'),
};

// Operator Entities API
export const operatorEntitiesApi = {
  getAll: () => apiRequest('/operator-entities'),
  create: (entityData: any) => apiRequest('/operator-entities', {
    method: 'POST',
    body: JSON.stringify(entityData),
  }),
  update: (id: string, entityData: any) => apiRequest(`/operator-entities/${id}`, {
    method: 'PUT',
    body: JSON.stringify(entityData),
  }),
  delete: (id: string) => apiRequest(`/operator-entities/${id}`, {
    method: 'DELETE',
  }),
  getRoles: () => apiRequest('/operator-entities/roles'),
};

// Admin Users API
export const adminUsersApi = {
  getAll: () => apiRequest('/admin-users'),
  create: (userData: any) => apiRequest('/admin-users', {
    method: 'POST',
    body: JSON.stringify(userData),
  }),
  update: (id: string, userData: any) => apiRequest(`/admin-users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(userData),
  }),
  delete: (id: string) => apiRequest(`/admin-users/${id}`, {
    method: 'DELETE',
  }),
  getOperatorEntities: () => apiRequest('/admin-users/operator-entities'),
  resetPassword: (id: string, password: string) => apiRequest(`/admin-users/${id}/reset-password`, {
    method: 'PUT',
    body: JSON.stringify({ password }),
  }),
};

// Users API
export const usersApi = {
  getAll: (params?: any) => {
    const queryString = new URLSearchParams(params).toString();
    return apiRequest(`/users?${queryString}`);
  },
  getById: (id: string) => apiRequest(`/users/${id}`),
  updateKyc: (id: string, kycData: any) => apiRequest(`/users/${id}/kyc`, {
    method: 'PUT',
    body: JSON.stringify(kycData),
  }),
  getPlatformRevenue: () => apiRequest('/users/revenue/platform'),
};

// Auth API
export const authApi = {
  login: (credentials: { username: string; password: string }) => apiRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  }),
  logout: () => apiRequest('/auth/logout', {
    method: 'POST',
  }),
  getProfile: () => apiRequest('/auth/me'),
  
  verifyMFA: async (data: { adminId: string; token: string }) => {
    const response = await fetch(`${API_BASE_URL}/auth/verify-mfa`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return response.json();
  },
  
  enableMFA: async (data: { adminId: string; token: string }) => {
    const response = await fetch(`${API_BASE_URL}/auth/enable-mfa`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return response.json();
  },
  
  verifyBackupCode: async (data: { adminId: string; backupCode: string }) => {
    const response = await fetch(`${API_BASE_URL}/auth/verify-backup-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return response.json();
  },
  
  changePassword: (oldPassword: string, newPassword: string) => apiRequest('/auth/change-password', {
    method: 'PUT',
    body: JSON.stringify({ oldPassword, newPassword }),
  }),
};

// UCP (Settlement Group) API
export const ucpApi = {
  getAll: async (params?: any) => {
    const queryString = new URLSearchParams(params).toString();
    const response = await fetch(`${API_BASE_URL}/ucp?${queryString}`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getAuthToken()}`,
      },
    });
    const responseData = await response.json();
    if (!response.ok) {
      throw new Error(responseData.error || 'API request failed');
    }
    return responseData;
  },

  getById: async (id: string) => {
    const response = await fetch(`${API_BASE_URL}/ucp/${id}`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getAuthToken()}`,
      },
    });
    const responseData = await response.json();
    if (!response.ok) {
      throw new Error(responseData.error || 'API request failed');
    }
    return responseData;
  },

  create: async (data: any) => {
    const response = await fetch(`${API_BASE_URL}/ucp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getAuthToken()}`,
      },
      body: JSON.stringify(data),
    });
    const responseData = await response.json();
    if (!response.ok) {
      throw new Error(responseData.error || 'API request failed');
    }
    return responseData;
  },

  update: async (id: string, data: any) => {
    const response = await fetch(`${API_BASE_URL}/ucp/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getAuthToken()}`,
      },
      body: JSON.stringify(data),
    });
    const responseData = await response.json();
    if (!response.ok) {
      throw new Error(responseData.error || 'API request failed');
    }
    return responseData;
  },

  delete: async (id: string) => {
    const response = await fetch(`${API_BASE_URL}/ucp/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getAuthToken()}`,
      },
    });
    const responseData = await response.json();
    if (!response.ok) {
      throw new Error(responseData.error || 'API request failed');
    }
    return responseData;
  },
};

// Journals API
export const journalsApi = {
  getStripePayments: async (params?: any) => {
    const queryString = new URLSearchParams(params).toString();
    const response = await fetch(`${API_BASE_URL}/journals/stripe-payments?${queryString}`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getAuthToken()}`,
      },
    });
    const responseData = await response.json();
    if (!response.ok) {
      throw new Error(responseData.error || 'API request failed');
    }
    return responseData;
  },

  getStripePaymentById: async (id: string) => {
    const response = await fetch(`${API_BASE_URL}/journals/stripe-payments/${id}`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getAuthToken()}`,
      },
    });
    const responseData = await response.json();
    if (!response.ok) {
      throw new Error(responseData.error || 'API request failed');
    }
    return responseData;
  },

  // Snap Fee Report
  getSnapFees: async (params: URLSearchParams) => {
    const response = await fetch(`${API_BASE_URL}/journals/snap-fees?${params}`, {
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`,
      },
    });
    return response.json();
  },

  getSnapFeeById: async (id: string) => {
    const response = await fetch(`${API_BASE_URL}/journals/snap-fees/${id}`, {
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`,
      },
    });
    return response.json();
  },

  // Audit Report
  getAuditTransactions: async (params: URLSearchParams) => {
    const response = await fetch(`${API_BASE_URL}/journals/audit?${params}`, {
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`,
      },
    });
    return response.json();
  },

  getAuditTransactionById: async (id: string) => {
    const response = await fetch(`${API_BASE_URL}/journals/audit/${id}`, {
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`,
      },
    });
    return response.json();
  },

  exportAuditTransactions: async (params: URLSearchParams) => {
    const response = await fetch(`${API_BASE_URL}/journals/audit/export?${params}`, {
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`,
      },
    });
    return response.json();
  },

  exportStripePayments: async (params: URLSearchParams) => {
    const response = await fetch(`${API_BASE_URL}/journals/stripe-payments/export?${params}`, {
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`,
      },
    });
    return response.json();
  },

  exportSnapFees: async (params: URLSearchParams) => {
    const response = await fetch(`${API_BASE_URL}/journals/snap-fees/export?${params}`, {
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`,
      },
    });
    return response.json();
  },
};

// Orders API
export const ordersApi = {
  getOrders: async (params?: any) => {
    const queryString = new URLSearchParams(params).toString();
    const response = await fetch(`${API_BASE_URL}/orders?${queryString}`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getAuthToken()}`,
      },
    });
    const responseData = await response.json();
    if (!response.ok) {
      throw new Error(responseData.error || 'API request failed');
    }
    return responseData;
  },

  getOrdersCount: async () => {
    const response = await fetch(`${API_BASE_URL}/orders/count`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getAuthToken()}`,
      },
    });
    const responseData = await response.json();
    if (!response.ok) {
      throw new Error(responseData.error || 'API request failed');
    }
    return responseData;
  },

  getOrderById: async (id: string) => {
    const response = await fetch(`${API_BASE_URL}/orders/${id}`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getAuthToken()}`,
      },
    });
    const responseData = await response.json();
    if (!response.ok) {
      throw new Error(responseData.error || 'API request failed');
    }
    return responseData;
  },

  updateOrderStatus: async (id: string, status: string) => {
    const response = await fetch(`${API_BASE_URL}/orders/${id}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getAuthToken()}`,
      },
      body: JSON.stringify({ status }),
    });
    const responseData = await response.json();
    if (!response.ok) {
      throw new Error(responseData.error || 'API request failed');
    }
    return responseData;
  },

  exportOrders: async (params: URLSearchParams) => {
    const response = await fetch(`${API_BASE_URL}/orders/export?${params}`, {
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`,
      },
    });
    return response.json();
  },

  downloadInvoice: async (id: string) => {
    const response = await fetch(`${API_BASE_URL}/orders/${id}/invoice`, {
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`,
      },
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to download invoice');
    }
    
    const blob = await response.blob();
    return blob;
  },
};

// Products API
export const productsApi = {
  getProducts: async (params?: any) => {
    const queryString = new URLSearchParams(params).toString();
    const response = await fetch(`${API_BASE_URL}/products?${queryString}`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getAuthToken()}`,
      },
    });
    const responseData = await response.json();
    if (!response.ok) {
      throw new Error(responseData.error || 'API request failed');
    }
    return responseData;
  },

  getProductsCount: async () => {
    const response = await fetch(`${API_BASE_URL}/products/count`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getAuthToken()}`,
      },
    });
    const responseData = await response.json();
    if (!response.ok) {
      throw new Error(responseData.error || 'API request failed');
    }
    return responseData;
  },

  getProductById: async (id: string) => {
    const response = await fetch(`${API_BASE_URL}/products/${id}`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getAuthToken()}`,
      },
    });
    const responseData = await response.json();
    if (!response.ok) {
      throw new Error(responseData.error || 'API request failed');
    }
    return responseData;
  },

  updateProductStatus: async (id: string, status: string) => {
    const response = await fetch(`${API_BASE_URL}/products/${id}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getAuthToken()}`,
      },
      body: JSON.stringify({ status }),
    });
    const responseData = await response.json();
    if (!response.ok) {
      throw new Error(responseData.error || 'API request failed');
    }
    return responseData;
  },

  exportProducts: async (params: URLSearchParams) => {
    const response = await fetch(`${API_BASE_URL}/products/export?${params}`, {
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`,
      },
    });
    return response.json();
  },
};

// Payment Gateways API
export const paymentGatewaysApi = {
  getPaymentGateways: async (params?: any) => {
    const queryString = new URLSearchParams(params).toString();
    const response = await fetch(`${API_BASE_URL}/payment-gateways?${queryString}`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getAuthToken()}`,
      },
    });
    const responseData = await response.json();
    if (!response.ok) {
      throw new Error(responseData.error || 'API request failed');
    }
    return responseData;
  },

  getPaymentGatewayById: async (id: string) => {
    const response = await fetch(`${API_BASE_URL}/payment-gateways/${id}`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getAuthToken()}`,
      },
    });
    const responseData = await response.json();
    if (!response.ok) {
      throw new Error(responseData.error || 'API request failed');
    }
    return responseData;
  },

  createPaymentGateway: async (data: any) => {
    const response = await fetch(`${API_BASE_URL}/payment-gateways`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getAuthToken()}`,
      },
      body: JSON.stringify(data),
    });
    const responseData = await response.json();
    if (!response.ok) {
      throw new Error(responseData.error || 'API request failed');
    }
    return responseData;
  },

  updatePaymentGateway: async (id: string, data: any) => {
    const response = await fetch(`${API_BASE_URL}/payment-gateways/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getAuthToken()}`,
      },
      body: JSON.stringify(data),
    });
    const responseData = await response.json();
    if (!response.ok) {
      throw new Error(responseData.error || 'API request failed');
    }
    return responseData;
  },

  deletePaymentGateway: async (id: string) => {
    const response = await fetch(`${API_BASE_URL}/payment-gateways/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getAuthToken()}`,
      },
    });
    const responseData = await response.json();
    if (!response.ok) {
      throw new Error(responseData.error || 'API request failed');
    }
    return responseData;
  },

  getPaymentGatewayTypes: async () => {
    const response = await fetch(`${API_BASE_URL}/payment-gateways/types`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getAuthToken()}`,
      },
    });
    const responseData = await response.json();
    if (!response.ok) {
      throw new Error(responseData.error || 'API request failed');
    }
    return responseData;
  },

  getPaymentGatewayCountries: async () => {
    const response = await fetch(`${API_BASE_URL}/payment-gateways/countries`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getAuthToken()}`,
      },
    });
    const responseData = await response.json();
    if (!response.ok) {
      throw new Error(responseData.error || 'API request failed');
    }
    return responseData;
  },

  getPaymentGatewayCurrencies: async () => {
    const response = await fetch(`${API_BASE_URL}/payment-gateways/currencies`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getAuthToken()}`,
      },
    });
    const responseData = await response.json();
    if (!response.ok) {
      throw new Error(responseData.error || 'API request failed');
    }
    return responseData;
  },
};

// Ride Applications API
export const riderApplicationsApi = {
  getAll: (params?: any) => {
    const queryString = params ? `?${new URLSearchParams(params).toString()}` : '';
    return apiRequest(`/rider-applications${queryString}`);
  },
  getById: (id: string) => apiRequest(`/rider-applications/${id}`),
  approve: (id: string, data?: any) => apiRequest(`/rider-applications/${id}/approve`, {
    method: 'PUT',
    body: JSON.stringify(data || {}),
  }),
  reject: (id: string, data: { rejectionReason: string }) => apiRequest(`/rider-applications/${id}/reject`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  suspend: (id: string, data: { rejectionReason: string }) => apiRequest(`/rider-applications/${id}/suspend`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  getStats: {
    overview: () => apiRequest('/rider-applications/stats/overview'),
    byStatus: () => apiRequest('/rider-applications/stats/by-status'),
    byVehicleType: () => apiRequest('/rider-applications/stats/by-vehicle-type'),
  },
};

// Driver Management API
export const driverManagementApi = {
  getAll: (params?: any) => {
    const queryString = params ? `?${new URLSearchParams(params).toString()}` : '';
    return apiRequest(`/driver-management${queryString}`);
  },
  getById: (id: string) => apiRequest(`/driver-management/${id}`),
  suspend: (id: string, data: { reason: string }) => apiRequest(`/driver-management/${id}/suspend`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  activate: (id: string) => apiRequest(`/driver-management/${id}/activate`, {
    method: 'PUT',
  }),
  getPerformance: (id: string, params?: any) => {
    const queryString = params ? `?${new URLSearchParams(params).toString()}` : '';
    return apiRequest(`/driver-management/${id}/performance${queryString}`);
  },
  getStats: {
    overview: () => apiRequest('/driver-management/stats/overview'),
    byStatus: () => apiRequest('/driver-management/stats/by-status'),
  },
};

// Ride Management API
export const rideManagementApi = {
  getAll: (params?: any) => {
    const queryString = params ? `?${new URLSearchParams(params).toString()}` : '';
    return apiRequest(`/ride-management${queryString}`);
  },
  getById: (id: string) => apiRequest(`/ride-management/${id}`),
  getStats: {
    overview: () => apiRequest('/ride-management/stats/overview'),
    byStatus: () => apiRequest('/ride-management/stats/by-status'),
    byType: () => apiRequest('/ride-management/stats/by-type'),
    byPaymentMethod: () => apiRequest('/ride-management/stats/by-payment-method'),
    revenue: (params?: any) => {
      const queryString = params ? `?${new URLSearchParams(params).toString()}` : '';
      return apiRequest(`/ride-management/stats/revenue${queryString}`);
    },
  },
};

// Ride Analytics API
export const rideAnalyticsApi = {
  getDashboard: () => apiRequest('/ride-analytics/dashboard'),
  getRevenue: (params?: any) => {
    const queryString = params ? `?${new URLSearchParams(params).toString()}` : '';
    return apiRequest(`/ride-analytics/revenue${queryString}`);
  },
  getPerformance: (params?: any) => {
    const queryString = params ? `?${new URLSearchParams(params).toString()}` : '';
    return apiRequest(`/ride-analytics/performance${queryString}`);
  },
};

class ApiService {
  private baseURL: string;
  private useMockData: boolean;

  constructor() {
    this.baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';
    this.useMockData = false; // Force real API - no mock data
  }

  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    if (this.useMockData) {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));
      return this.handleMockRequest<T>(endpoint, options);
    }

    const url = `${this.baseURL}${endpoint}`;
    const token = getAuthToken();
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options?.headers,
      },
      ...options,
    };

    const response = await fetch(url, config);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error: ${response.status}`);
    }

    return response.json();
  }

  private handleMockRequest<T>(endpoint: string, options?: RequestInit): T {
    // Parse query parameters
    const url = new URL(`http://localhost${endpoint}`);
    const params = Object.fromEntries(url.searchParams.entries());

    switch (endpoint.split('?')[0]) {
      // Dashboard
      case '/admin/analytics/dashboard':
        return mockDashboardData as T;

      // Users
      case '/admin/users':
        return this.getMockUsers(params) as T;
      
      case '/admin/users/1':
      case '/admin/users/2':
      case '/admin/users/3':
      case '/admin/users/4':
      case '/admin/users/5':
        const userId = endpoint.split('/').pop()!;
        const user = mockUsers.find(u => u.id === userId);
        return user as T;

      // Settlements
      case '/admin/settlements':
        return this.getMockSettlements(params) as T;

      case '/admin/settlements/S12345':
      case '/admin/settlements/S12346':
      case '/admin/settlements/S12347':
        const settlementId = endpoint.split('/').pop()!;
        const settlement = mockSettlements.find(s => s.id === settlementId);
        return settlement as T;

      // Products
      case '/admin/products':
        return this.getMockProducts(params) as T;

      // Orders
      case '/admin/orders':
        return this.getMockOrders(params) as T;

      // Categories
      case '/categories':
        return this.getMockCategories(params) as T;

      default:
        throw new Error(`Mock endpoint not found: ${endpoint}`);
    }
  }

  private getMockUsers(params: any): PaginatedResponse<User> {
    let filteredUsers = [...mockUsers];

    // Apply search filter
    if (params.search) {
      const search = params.search.toLowerCase();
      filteredUsers = filteredUsers.filter(user => 
        `${user.firstName} ${user.lastName}`.toLowerCase().includes(search) ||
        user.email.toLowerCase().includes(search) ||
        user.phoneNumber.includes(search)
      );
    }

    // Apply status filter
    if (params.status && params.status !== 'all') {
      filteredUsers = filteredUsers.filter(user => user.status === params.status);
    }

    // Apply type filter
    if (params.type && params.type !== 'all') {
      filteredUsers = filteredUsers.filter(user => user.type === params.type);
    }

    // Apply KYC status filter
    if (params.kycStatus && params.kycStatus !== 'all') {
      filteredUsers = filteredUsers.filter(user => 
        user.sellerKyc?.status === params.kycStatus
      );
    }

    const page = parseInt(params.page) || 1;
    const limit = parseInt(params.limit) || 10;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

    return {
      data: paginatedUsers,
      pagination: {
        page,
        limit,
        total: filteredUsers.length,
        totalPages: Math.ceil(filteredUsers.length / limit)
      }
    };
  }

  private getMockSettlements(params: any): PaginatedResponse<Settlement> {
    let filteredSettlements = [...mockSettlements];

    // Apply search filter
    if (params.search) {
      const search = params.search.toLowerCase();
      filteredSettlements = filteredSettlements.filter(settlement => 
        settlement.id.toLowerCase().includes(search)
      );
    }

    // Apply status filter
    if (params.status && params.status !== 'all' && params.status !== 'undefined') {
      filteredSettlements = filteredSettlements.filter(settlement => 
        settlement.status === params.status
      );
    }

    const page = parseInt(params.page) || 1;
    const limit = parseInt(params.limit) || 10;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedSettlements = filteredSettlements.slice(startIndex, endIndex);

    return {
      data: paginatedSettlements,
      pagination: {
        page,
        limit,
        total: filteredSettlements.length,
        totalPages: Math.ceil(filteredSettlements.length / limit)
      }
    };
  }

  private getMockProducts(params: any): PaginatedResponse<Product> {
    let filteredProducts = [...mockProducts];

    // Apply search filter
    if (params.search) {
      const search = params.search.toLowerCase();
      filteredProducts = filteredProducts.filter(product => 
        product.title.toLowerCase().includes(search) ||
        product.description?.toLowerCase().includes(search)
      );
    }

    // Apply status filter
    if (params.status && params.status !== 'all') {
      filteredProducts = filteredProducts.filter(product => 
        product.status === params.status
      );
    }

    const page = parseInt(params.page) || 1;
    const limit = parseInt(params.limit) || 10;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedProducts = filteredProducts.slice(startIndex, endIndex);

    return {
      data: paginatedProducts,
      pagination: {
        page,
        limit,
        total: filteredProducts.length,
        totalPages: Math.ceil(filteredProducts.length / limit)
      }
    };
  }

  private getMockOrders(params: any): PaginatedResponse<Order> {
    let filteredOrders = [...mockOrders];

    // Apply search filter
    if (params.search) {
      const search = params.search.toLowerCase();
      filteredOrders = filteredOrders.filter(order => 
        order.orderNumber.toLowerCase().includes(search)
      );
    }

    // Apply status filter
    if (params.status && params.status !== 'all') {
      filteredOrders = filteredOrders.filter(order => 
        order.status === params.status
      );
    }

    const page = parseInt(params.page) || 1;
    const limit = parseInt(params.limit) || 10;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedOrders = filteredOrders.slice(startIndex, endIndex);

    return {
      data: paginatedOrders,
      pagination: {
        page,
        limit,
        total: filteredOrders.length,
        totalPages: Math.ceil(filteredOrders.length / limit)
      }
    };
  }

  private getMockCategories(params: any): PaginatedResponse<any> {
    // Create some mock categories for testing
    const mockCategories = [
      {
        id: '1',
        name: 'Electronics',
        slug: 'electronics',
        description: 'Electronic devices and gadgets',
        imageUrl: '',
        order: 1,
        isActive: true,
        parentId: null,
        parent: null,
        children: [],
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        _count: { products: 5, children: 2 }
      },
      {
        id: '2',
        name: 'Clothing',
        slug: 'clothing',
        description: 'Fashion and apparel',
        imageUrl: '',
        order: 2,
        isActive: true,
        parentId: null,
        parent: null,
        children: [],
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        _count: { products: 8, children: 0 }
      },
      {
        id: '3',
        name: 'Books',
        slug: 'books',
        description: 'Books and literature',
        imageUrl: '',
        order: 3,
        isActive: true,
        parentId: null,
        parent: null,
        children: [],
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        _count: { products: 12, children: 0 }
      },
      {
        id: '4',
        name: 'Home & Garden',
        slug: 'home-garden',
        description: 'Home improvement and gardening',
        imageUrl: '',
        order: 4,
        isActive: true,
        parentId: null,
        parent: null,
        children: [],
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        _count: { products: 6, children: 1 }
      },
      {
        id: '5',
        name: 'Sports',
        slug: 'sports',
        description: 'Sports equipment and accessories',
        imageUrl: '',
        order: 5,
        isActive: true,
        parentId: null,
        parent: null,
        children: [],
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        _count: { products: 4, children: 0 }
      },
      {
        id: '6',
        name: 'Toys',
        slug: 'toys',
        description: 'Toys and games',
        imageUrl: '',
        order: 6,
        isActive: true,
        parentId: null,
        parent: null,
        children: [],
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        _count: { products: 7, children: 0 }
      },
      {
        id: '7',
        name: 'Automotive',
        slug: 'automotive',
        description: 'Automotive parts and accessories',
        imageUrl: '',
        order: 7,
        isActive: true,
        parentId: null,
        parent: null,
        children: [],
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        _count: { products: 3, children: 0 }
      },
      {
        id: '8',
        name: 'Health & Beauty',
        slug: 'health-beauty',
        description: 'Health and beauty products',
        imageUrl: '',
        order: 8,
        isActive: true,
        parentId: null,
        parent: null,
        children: [],
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        _count: { products: 9, children: 0 }
      },
      {
        id: '9',
        name: 'Food & Beverages',
        slug: 'food-beverages',
        description: 'Food and beverage products',
        imageUrl: '',
        order: 9,
        isActive: false,
        parentId: null,
        parent: null,
        children: [],
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        _count: { products: 2, children: 0 }
      },
      {
        id: '10',
        name: 'Jewelry',
        slug: 'jewelry',
        description: 'Jewelry and accessories',
        imageUrl: '',
        order: 10,
        isActive: true,
        parentId: null,
        parent: null,
        children: [],
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        _count: { products: 1, children: 0 }
      },
      {
        id: '11',
        name: 'Pet Supplies',
        slug: 'pet-supplies',
        description: 'Pet food and supplies',
        imageUrl: '',
        order: 11,
        isActive: true,
        parentId: null,
        parent: null,
        children: [],
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        _count: { products: 4, children: 0 }
      },
      {
        id: '12',
        name: 'Office Supplies',
        slug: 'office-supplies',
        description: 'Office and stationery supplies',
        imageUrl: '',
        order: 12,
        isActive: true,
        parentId: null,
        parent: null,
        children: [],
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        _count: { products: 6, children: 0 }
      }
    ];

    let filteredCategories = [...mockCategories];

    // Apply search filter
    if (params.search) {
      const search = params.search.toLowerCase();
      filteredCategories = filteredCategories.filter(category => 
        category.name.toLowerCase().includes(search) ||
        category.slug.toLowerCase().includes(search) ||
        category.description.toLowerCase().includes(search)
      );
    }

    // Apply status filter
    if (params.isActive !== undefined && params.isActive !== 'all') {
      const isActive = params.isActive === 'true';
      filteredCategories = filteredCategories.filter(category => 
        category.isActive === isActive
      );
    }

    const page = parseInt(params.page) || 1;
    const limit = parseInt(params.limit) || 10;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedCategories = filteredCategories.slice(startIndex, endIndex);

    return {
      data: paginatedCategories,
      pagination: {
        page,
        limit,
        total: filteredCategories.length,
        totalPages: Math.ceil(filteredCategories.length / limit)
      }
    };
  }

  // Dashboard Analytics
  async getDashboardData(): Promise<DashboardData> {
    const response = await this.request<{ success: boolean; data: DashboardData }>('/dashboard');
    return response.data;
  }

  // User Management
  async getUsers(params?: UserListParams): Promise<PaginatedResponse<User>> {
    const queryString = new URLSearchParams(params as any).toString();
    return this.request<PaginatedResponse<User>>(`/users?${queryString}`);
  }

  async getUserById(id: string): Promise<User> {
    return this.request<User>(`/users/${id}`);
  }

  async updateUserStatus(id: string, status: string): Promise<User> {
    return this.request<User>(`/users/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  }

  // Settlement Management
  async getSettlements(params?: SettlementListParams): Promise<PaginatedResponse<Settlement>> {
    const queryString = new URLSearchParams(params as any).toString();
    return this.request<PaginatedResponse<Settlement>>(`/settlements?${queryString}`);
  }

  async getSettlementById(id: string): Promise<ApiResponse<Settlement>> {
    return this.request<ApiResponse<Settlement>>(`/settlements/${id}`);
  }

  async updateSettlementStatus(id: string, status: string): Promise<ApiResponse<Settlement>> {
    return this.request<ApiResponse<Settlement>>(`/settlements/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  }

  async bulkUpdateSettlementStatus(ids: string[], status: string): Promise<ApiResponse<any>> {
    return this.request<ApiResponse<any>>('/settlements/bulk-update-status', {
      method: 'PUT',
      body: JSON.stringify({ ids, status }),
    });
  }

  async getCumulativeEntries(params?: any): Promise<ApiResponse<any>> {
    const queryString = new URLSearchParams(params as any).toString();
    return this.request<ApiResponse<any>>(`/settlements/cumulative-entries?${queryString}`);
  }

  // Product Management
  async getProducts(params?: any): Promise<PaginatedResponse<Product>> {
    const queryString = new URLSearchParams(params as any).toString();
    return this.request<PaginatedResponse<Product>>(`/products?${queryString}`);
  }

  async getProductById(id: string): Promise<Product> {
    return this.request<Product>(`/products/${id}`);
  }

  // Order Management
  async getOrders(params?: any): Promise<PaginatedResponse<Order>> {
    const queryString = new URLSearchParams(params as any).toString();
    return this.request<PaginatedResponse<Order>>(`/orders?${queryString}`);
  }

  async getOrderById(id: string): Promise<Order> {
    return this.request<Order>(`/orders/${id}`);
  }

  // Category Management
  async getCategories(params?: any): Promise<PaginatedResponse<any>> {
    const queryString = new URLSearchParams(params as any).toString();
    return this.request<PaginatedResponse<any>>(`/categories?${queryString}`);
  }

  async getCategoryById(id: string): Promise<any> {
    return this.request<any>(`/categories/${id}`);
  }

  async createCategory(data: any): Promise<ApiResponse<any>> {
    return this.request<ApiResponse<any>>('/categories', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateCategory(id: string, data: any): Promise<ApiResponse<any>> {
    return this.request<ApiResponse<any>>(`/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteCategory(id: string): Promise<ApiResponse<any>> {
    return this.request<ApiResponse<any>>(`/categories/${id}`, {
      method: 'DELETE',
    });
  }

  // Ride Services
  async getRideServices(params?: any): Promise<PaginatedResponse<any>> {
    const filteredParams = params ? Object.fromEntries(
      Object.entries(params).filter(([_, value]) => value !== undefined && value !== null)
    ) : {};
    const queryString = new URLSearchParams(filteredParams as any).toString();
    return this.request<PaginatedResponse<any>>(`/ride-services?${queryString}`);
  }

  async getRideService(id: string): Promise<any> {
    return this.request<any>(`/ride-services/${id}`);
  }

  async createRideService(data: any): Promise<ApiResponse<any>> {
    return this.request<ApiResponse<any>>('/ride-services', { 
      method: 'POST', 
      body: JSON.stringify(data) 
    });
  }

  async updateRideService(id: string, data: any): Promise<ApiResponse<any>> {
    return this.request<ApiResponse<any>>(`/ride-services/${id}`, { 
      method: 'PUT', 
      body: JSON.stringify(data) 
    });
  }

  async deleteRideService(id: string): Promise<ApiResponse<any>> {
    return this.request<ApiResponse<any>>(`/ride-services/${id}`, { 
      method: 'DELETE' 
    });
  }

  async getVehicleTypes(): Promise<ApiResponse<any>> {
    return this.request<ApiResponse<any>>('/ride-services/vehicle-types');
  }

  // Ride Service Tiers
  async getRideServiceTiers(params?: any): Promise<PaginatedResponse<any>> {
    const filteredParams = params ? Object.fromEntries(
      Object.entries(params).filter(([_, value]) => value !== undefined && value !== null)
    ) : {};
    const queryString = new URLSearchParams(filteredParams as any).toString();
    return this.request<PaginatedResponse<any>>(`/ride-service-tiers?${queryString}`);
  }

  async getRideServiceTiersKPIs(): Promise<ApiResponse<any>> {
    return this.request<ApiResponse<any>>('/ride-service-tiers/kpis');
  }

  async getAvailableRideServices(): Promise<ApiResponse<any>> {
    return this.request<ApiResponse<any>>('/ride-service-tiers/available-ride-services');
  }

  async assignDriverToRideService(driverId: string, rideServiceId: string): Promise<ApiResponse<any>> {
    return this.request<ApiResponse<any>>(`/ride-service-tiers/${driverId}/assign`, {
      method: 'PUT',
      body: JSON.stringify({ rideServiceId })
    });
  }

  async unassignDriverFromRideService(driverId: string): Promise<ApiResponse<any>> {
    return this.request<ApiResponse<any>>(`/ride-service-tiers/${driverId}/unassign`, {
      method: 'PUT'
    });
  }

  async getDriverPerformanceMetrics(driverId: string, dateFilter: string): Promise<ApiResponse<any>> {
    return this.request<ApiResponse<any>>(`/ride-service-tiers/${driverId}/performance?dateFilter=${dateFilter}`);
  }

  async updateDriverStatus(driverId: string, status: string): Promise<ApiResponse<any>> {
    return this.request<ApiResponse<any>>(`/ride-service-tiers/${driverId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status })
    });
  }
}

export const apiService = new ApiService();

// Analytics API functions
export const analyticsApi = {
  getRevenueOverview: (period: string = '30', currency: string = 'GMD') => 
    apiRequest(`/analytics/revenue/overview?period=${period}&currency=${currency}`),
  getAvailableCurrencies: () => apiRequest('/analytics/revenue/available-currencies'),
  getInactiveDrivers: (period: string = '30') => apiRequest(`/analytics/revenue/ride/inactive-drivers?period=${period}`),
  getUnpaidRides: (currency: string = 'GMD') => apiRequest(`/analytics/revenue/ride/unpaid-rides?currency=${currency}`),
  getUnsettledDrivers: (period: string = '30', currency: string = 'GMD') => apiRequest(`/analytics/revenue/ride/unsettled-drivers?period=${period}&currency=${currency}`),
  getHighDistanceUnpaidRides: (minDistance: string = '10', currency: string = 'GMD') => apiRequest(`/analytics/revenue/ride/high-distance-unpaid?minDistance=${minDistance}&currency=${currency}`),
  getRepeatCustomers: (date: string, currency: string = 'GMD') => apiRequest(`/analytics/revenue/ride/repeat-customers?date=${date}&currency=${currency}`),
  getNoTokenRides: (currency: string = 'GMD') => apiRequest(`/analytics/revenue/ride/no-token-rides?currency=${currency}`),
  getUnpaidOrders: (currency: string = 'GMD') => apiRequest(`/analytics/revenue/ecommerce/unpaid-orders?currency=${currency}`),
  getSellersNoOrders: (period: string = '30') => apiRequest(`/analytics/revenue/ecommerce/sellers-no-orders?period=${period}`),
  getUnsettledSellers: (period: string = '30', currency: string = 'GMD') => apiRequest(`/analytics/revenue/ecommerce/sellers-unsettled?period=${period}&currency=${currency}`),
  
  // Drill-down endpoints
  getTotalRevenueDetails: (period: string = '30', page: string = '1', limit: string = '10', currency: string = 'GMD') => 
    apiRequest(`/analytics/revenue/total-revenue-details?period=${period}&page=${page}&limit=${limit}&currency=${currency}`),
  getRideRevenueDetails: (period: string = '30', page: string = '1', limit: string = '10', currency: string = 'GMD') => 
    apiRequest(`/analytics/revenue/ride-revenue-details?period=${period}&page=${page}&limit=${limit}&currency=${currency}`),
  getEcommerceRevenueDetails: (period: string = '30', page: string = '1', limit: string = '10', currency: string = 'GMD') => 
    apiRequest(`/analytics/revenue/ecommerce-revenue-details?period=${period}&page=${page}&limit=${limit}&currency=${currency}`),
  
  // External Transactions endpoints
  getExternalTransactionsOverview: (period: string = '30', currency: string = 'GMD') => 
    apiRequest(`/analytics/revenue/external-transactions-overview?period=${period}&currency=${currency}`),
  getExternalTransactionsDetails: (period: string = '30', page: string = '1', limit: string = '10', currency: string = 'GMD') => 
    apiRequest(`/analytics/revenue/external-transactions-details?period=${period}&page=${page}&limit=${limit}&currency=${currency}`),
};

// Rental Requests API
export const rentalRequestsApi = {
  getAll: (params?: any) => {
    const queryString = new URLSearchParams(params).toString();
    return apiRequest(`/rental-requests?${queryString}`);
  },
  getById: (id: string) => apiRequest(`/rental-requests/${id}`),
  updateStatus: (id: string, status: string, notes?: string) => 
    apiRequest(`/rental-requests/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, notes }),
    }),
  exportCSV: async (params?: any) => {
    const queryString = new URLSearchParams(params).toString();
    const response = await fetch(`${API_BASE_URL}/rental-requests/export/csv?${queryString}`, {
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.text();
  },
};

// Branches API
export const branchesApi = {
  getAll: (params?: {
    page?: number;
    limit?: number;
    timeFilter?: 'all' | 'week' | 'month' | 'quarter' | 'year' | 'custom';
    startDate?: string;
    endDate?: string;
  }) => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.timeFilter) queryParams.append('timeFilter', params.timeFilter);
    if (params?.startDate) queryParams.append('startDate', params.startDate);
    if (params?.endDate) queryParams.append('endDate', params.endDate);
    
    const queryString = queryParams.toString();
    return apiRequest(`/branches${queryString ? `?${queryString}` : ''}`);
  },
  getParentSellers: (params?: {
    page?: number;
    limit?: number;
    timeFilter?: 'all' | 'week' | 'month' | 'quarter' | 'year' | 'custom';
    startDate?: string;
    endDate?: string;
  }) => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.timeFilter) queryParams.append('timeFilter', params.timeFilter);
    if (params?.startDate) queryParams.append('startDate', params.startDate);
    if (params?.endDate) queryParams.append('endDate', params.endDate);
    
    const queryString = queryParams.toString();
    return apiRequest(`/branches/parent-sellers${queryString ? `?${queryString}` : ''}`);
  },
  getParentSellerById: (id: string) => apiRequest(`/branches/parent-sellers/${id}`),
  getById: (id: string) => apiRequest(`/branches/${id}`),
  create: (data: any) => apiRequest('/branches', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (id: string, data: any) => apiRequest(`/branches/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  delete: (id: string) => apiRequest(`/branches/${id}`, {
    method: 'DELETE',
  }),
  getSalesReps: (branchId: string) => apiRequest(`/branches/${branchId}/sales-reps`),
};

// Sales Reps API
export const salesRepsApi = {
  getAll: () => apiRequest('/sales-reps'),
  getById: (id: string) => apiRequest(`/sales-reps/${id}`),
  create: (data: any) => apiRequest('/sales-reps', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (id: string, data: any) => apiRequest(`/sales-reps/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  delete: (id: string) => apiRequest(`/sales-reps/${id}`, {
    method: 'DELETE',
  }),
  getPerformance: (id: string, startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    
    const queryString = params.toString();
    const url = queryString ? `/sales-reps/${id}/performance?${queryString}` : `/sales-reps/${id}/performance`;
    
    return apiRequest(url);
  },
}; 

// Principal Business API
export const principalBusinessApi = {
  getPrincipals: () => apiRequest('/principal-business'),
  getChildrenWithActivity: (userId: string) => apiRequest(`/principal-business/${userId}/children`),
  getAnalytics: (userId: string, params?: { startDate?: string; endDate?: string }) => {
    const filtered: Record<string, string> = {};
    if (params?.startDate) filtered.startDate = params.startDate;
    if (params?.endDate) filtered.endDate = params.endDate;
    const query = new URLSearchParams(filtered).toString();
    return apiRequest(`/principal-business/${userId}/analytics${query ? `?${query}` : ''}`);
  },
};