import { 
  User, 
  Product, 
  Order, 
  Settlement, 
  DashboardData, 
  ChartData,
  UserStatus,
  UserType,
  KycStatus,
  ProductStatus,
  ProductCondition,
  OrderStatus,
  SettlementStatus,
  SettlementType,
  PaymentStatus
} from '@/types';

// Mock Users Data
export const mockUsers: User[] = [
  {
    id: '1',
    firstName: 'John',
    lastName: 'Doe',
    phoneNumber: '+1 234 567 8901',
    email: 'john.doe@example.com',
    createdAt: new Date('2023-01-15'),
    updatedAt: new Date('2023-12-01'),
    status: UserStatus.ACTIVE,
    type: UserType.BUYER,
    products: [],
    orders: [],
    settlements: []
  },
  {
    id: '2',
    firstName: 'Sarah',
    lastName: 'Miller',
    phoneNumber: '+1 234 567 8902',
    email: 'sarah.miller@example.com',
    createdAt: new Date('2023-02-20'),
    updatedAt: new Date('2023-12-01'),
    status: UserStatus.ACTIVE,
    type: UserType.SELLER,
    sellerKyc: {
      id: 'kyc1',
      userId: '2',
      status: KycStatus.VERIFIED,
      documents: [
        {
          id: 'doc1',
          type: 'government_id',
          url: '/documents/id.jpg',
          uploadedAt: new Date('2023-02-25')
        }
      ],
      submittedAt: new Date('2023-02-25'),
      verifiedAt: new Date('2023-03-01')
    },
    products: [],
    orders: [],
    settlements: []
  },
  {
    id: '3',
    firstName: 'Michael',
    lastName: 'Brown',
    phoneNumber: '+1 234 567 8903',
    email: 'michael.brown@example.com',
    createdAt: new Date('2023-03-10'),
    updatedAt: new Date('2023-12-01'),
    status: UserStatus.INACTIVE,
    type: UserType.BUYER,
    products: [],
    orders: [],
    settlements: []
  },
  {
    id: '4',
    firstName: 'Lisa',
    lastName: 'Johnson',
    phoneNumber: '+1 234 567 8904',
    email: 'lisa.johnson@example.com',
    createdAt: new Date('2023-04-05'),
    updatedAt: new Date('2023-12-01'),
    status: UserStatus.ACTIVE,
    type: UserType.SELLER,
    sellerKyc: {
      id: 'kyc2',
      userId: '4',
      status: KycStatus.PENDING,
      documents: [
        {
          id: 'doc2',
          type: 'government_id',
          url: '/documents/id2.jpg',
          uploadedAt: new Date('2023-12-01')
        }
      ],
      submittedAt: new Date('2023-12-01')
    },
    products: [],
    orders: [],
    settlements: []
  },
  {
    id: '5',
    firstName: 'Robert',
    lastName: 'Wilson',
    phoneNumber: '+1 234 567 8905',
    email: 'robert.wilson@example.com',
    createdAt: new Date('2023-05-15'),
    updatedAt: new Date('2023-12-01'),
    status: UserStatus.SUSPENDED,
    type: UserType.SELLER,
    sellerKyc: {
      id: 'kyc3',
      userId: '5',
      status: KycStatus.REJECTED,
      documents: [
        {
          id: 'doc3',
          type: 'government_id',
          url: '/documents/id3.jpg',
          uploadedAt: new Date('2023-05-20')
        }
      ],
      submittedAt: new Date('2023-05-20'),
      rejectedAt: new Date('2023-05-25'),
      rejectionReason: 'Document quality insufficient'
    },
    products: [],
    orders: [],
    settlements: []
  },
  {
    id: '6',
    firstName: 'Emma',
    lastName: 'Taylor',
    phoneNumber: '+1 234 567 8906',
    email: 'emma.taylor@example.com',
    createdAt: new Date('2023-06-10'),
    updatedAt: new Date('2023-12-01'),
    status: UserStatus.ACTIVE,
    type: UserType.BUYER,
    products: [],
    orders: [],
    settlements: []
  },
  {
    id: '7',
    firstName: 'David',
    lastName: 'Lee',
    phoneNumber: '+1 234 567 8907',
    email: 'david.lee@example.com',
    createdAt: new Date('2023-07-05'),
    updatedAt: new Date('2023-12-01'),
    status: UserStatus.ACTIVE,
    type: UserType.SELLER,
    sellerKyc: {
      id: 'kyc4',
      userId: '7',
      status: KycStatus.VERIFIED,
      documents: [
        {
          id: 'doc4',
          type: 'government_id',
          url: '/documents/id4.jpg',
          uploadedAt: new Date('2023-07-10')
        }
      ],
      submittedAt: new Date('2023-07-10'),
      verifiedAt: new Date('2023-07-15')
    },
    products: [],
    orders: [],
    settlements: []
  },
  {
    id: '8',
    firstName: 'Jennifer',
    lastName: 'Garcia',
    phoneNumber: '+1 234 567 8908',
    email: 'jennifer.garcia@example.com',
    createdAt: new Date('2023-08-20'),
    updatedAt: new Date('2023-12-01'),
    status: UserStatus.ACTIVE,
    type: UserType.BUYER,
    products: [],
    orders: [],
    settlements: []
  },
  {
    id: '9',
    firstName: 'James',
    lastName: 'Anderson',
    phoneNumber: '+1 234 567 8909',
    email: 'james.anderson@example.com',
    createdAt: new Date('2023-09-15'),
    updatedAt: new Date('2023-12-01'),
    status: UserStatus.INACTIVE,
    type: UserType.SELLER,
    sellerKyc: {
      id: 'kyc5',
      userId: '9',
      status: KycStatus.PENDING,
      documents: [
        {
          id: 'doc5',
          type: 'government_id',
          url: '/documents/id5.jpg',
          uploadedAt: new Date('2023-09-20')
        }
      ],
      submittedAt: new Date('2023-09-20')
    },
    products: [],
    orders: [],
    settlements: []
  },
  {
    id: '10',
    firstName: 'Maria',
    lastName: 'Rodriguez',
    phoneNumber: '+1 234 567 8910',
    email: 'maria.rodriguez@example.com',
    createdAt: new Date('2023-10-01'),
    updatedAt: new Date('2023-12-01'),
    status: UserStatus.ACTIVE,
    type: UserType.BUYER,
    products: [],
    orders: [],
    settlements: []
  },
  {
    id: '11',
    firstName: 'Thomas',
    lastName: 'Martinez',
    phoneNumber: '+1 234 567 8911',
    email: 'thomas.martinez@example.com',
    createdAt: new Date('2023-10-15'),
    updatedAt: new Date('2023-12-01'),
    status: UserStatus.ACTIVE,
    type: UserType.SELLER,
    sellerKyc: {
      id: 'kyc6',
      userId: '11',
      status: KycStatus.VERIFIED,
      documents: [
        {
          id: 'doc6',
          type: 'government_id',
          url: '/documents/id6.jpg',
          uploadedAt: new Date('2023-10-20')
        }
      ],
      submittedAt: new Date('2023-10-20'),
      verifiedAt: new Date('2023-10-25')
    },
    products: [],
    orders: [],
    settlements: []
  },
  {
    id: '12',
    firstName: 'Amanda',
    lastName: 'White',
    phoneNumber: '+1 234 567 8912',
    email: 'amanda.white@example.com',
    createdAt: new Date('2023-11-01'),
    updatedAt: new Date('2023-12-01'),
    status: UserStatus.SUSPENDED,
    type: UserType.BUYER,
    products: [],
    orders: [],
    settlements: []
  },
  {
    id: '13',
    firstName: 'Christopher',
    lastName: 'Clark',
    phoneNumber: '+1 234 567 8913',
    email: 'christopher.clark@example.com',
    createdAt: new Date('2023-11-10'),
    updatedAt: new Date('2023-12-01'),
    status: UserStatus.ACTIVE,
    type: UserType.SELLER,
    sellerKyc: {
      id: 'kyc7',
      userId: '13',
      status: KycStatus.REJECTED,
      documents: [
        {
          id: 'doc7',
          type: 'government_id',
          url: '/documents/id7.jpg',
          uploadedAt: new Date('2023-11-15')
        }
      ],
      submittedAt: new Date('2023-11-15'),
      rejectedAt: new Date('2023-11-20'),
      rejectionReason: 'Invalid document type'
    },
    products: [],
    orders: [],
    settlements: []
  },
  {
    id: '14',
    firstName: 'Jessica',
    lastName: 'Lewis',
    phoneNumber: '+1 234 567 8914',
    email: 'jessica.lewis@example.com',
    createdAt: new Date('2023-11-20'),
    updatedAt: new Date('2023-12-01'),
    status: UserStatus.ACTIVE,
    type: UserType.BUYER,
    products: [],
    orders: [],
    settlements: []
  },
  {
    id: '15',
    firstName: 'Daniel',
    lastName: 'Walker',
    phoneNumber: '+1 234 567 8915',
    email: 'daniel.walker@example.com',
    createdAt: new Date('2023-12-01'),
    updatedAt: new Date('2023-12-01'),
    status: UserStatus.PENDING,
    type: UserType.SELLER,
    products: [],
    orders: [],
    settlements: []
  }
];

// Mock Products Data
export const mockProducts: Product[] = [
  {
    id: '1',
    sellerId: '2',
    title: 'iPhone 14 Pro',
    description: 'Latest iPhone with advanced camera system',
    price: 999.99,
    currencyCode: 'USD',
    quantity: 5,
    status: ProductStatus.ACTIVE,
    condition: ProductCondition.NEW,
    categoryId: 'electronics',
    locationId: 'nyc',
    isFeatured: true,
    rating: 4.8,
    ratingCount: 12,
    views: 150,
    favorites: 25,
    createdAt: '2023-11-15T10:30:00Z',
    updatedAt: '2023-12-01T15:45:00Z'
  },
  {
    id: '2',
    sellerId: '2',
    title: 'MacBook Air M2',
    description: 'Powerful laptop with M2 chip',
    price: 1199.99,
    currencyCode: 'USD',
    quantity: 3,
    status: ProductStatus.ACTIVE,
    condition: ProductCondition.LIKE_NEW,
    categoryId: 'electronics',
    locationId: 'nyc',
    isFeatured: false,
    rating: 4.9,
    ratingCount: 8,
    views: 89,
    favorites: 15,
    createdAt: '2023-11-20T14:20:00Z',
    updatedAt: '2023-12-01T15:45:00Z'
  },
  {
    id: '3',
    sellerId: '4',
    title: 'Nike Air Jordan 1',
    description: 'Classic basketball shoes',
    price: 180.00,
    currencyCode: 'USD',
    quantity: 10,
    status: ProductStatus.ACTIVE,
    condition: ProductCondition.NEW,
    categoryId: 'fashion',
    locationId: 'la',
    isFeatured: true,
    rating: 4.7,
    ratingCount: 20,
    views: 200,
    favorites: 45,
    createdAt: '2023-11-10T09:15:00Z',
    updatedAt: '2023-12-01T15:45:00Z'
  }
];

// Mock Orders Data
export const mockOrders: Order[] = [
  {
    id: '1',
    orderNumber: 'ORD-001',
    userId: '1',
    sellerId: '2',
    status: OrderStatus.DELIVERED,
    totalAmount: 999.99,
    currencyCode: 'USD',
    paymentStatus: PaymentStatus.PAID,
    createdAt: new Date('2023-11-25'),
    updatedAt: new Date('2023-11-30'),
    items: [
      {
        id: 'item1',
        productId: '1',
        quantity: 1,
        price: 999.99,
        product: mockProducts[0]
      }
    ]
  },
  {
    id: '2',
    orderNumber: 'ORD-002',
    userId: '3',
    sellerId: '2',
    status: OrderStatus.SHIPPED,
    totalAmount: 1199.99,
    currencyCode: 'USD',
    paymentStatus: PaymentStatus.PAID,
    createdAt: new Date('2023-11-28'),
    updatedAt: new Date('2023-12-01'),
    items: [
      {
        id: 'item2',
        productId: '2',
        quantity: 1,
        price: 1199.99,
        product: mockProducts[1]
      }
    ]
  },
  {
    id: '3',
    orderNumber: 'ORD-003',
    userId: '1',
    sellerId: '4',
    status: OrderStatus.PENDING,
    totalAmount: 180.00,
    currencyCode: 'USD',
    paymentStatus: PaymentStatus.PENDING,
    createdAt: new Date('2023-12-01'),
    updatedAt: new Date('2023-12-01'),
    items: [
      {
        id: 'item3',
        productId: '3',
        quantity: 1,
        price: 180.00,
        product: mockProducts[2]
      }
    ]
  }
];

// Mock Settlements Data
export const mockSettlements: Settlement[] = [
  {
    id: 'S12345',
    userId: '2',
    amount: 1250.75,
    currency: 'USD',
    status: SettlementStatus.PENDING,
    type: SettlementType.BANK_TRANSFER,
    reference: 'REF-001',
    includedOrderIds: ['1'],
    totalOrdersCount: 1,
    serviceFeesDeducted: 62.54,
    netAmountBeforeFees: 1313.29,
    createdAt: new Date('2023-12-01')
  },
  {
    id: 'S12346',
    userId: '2',
    amount: 890.50,
    currency: 'USD',
    status: SettlementStatus.PROCESSING,
    type: SettlementType.WALLET_TRANSFER,
    reference: 'REF-002',
    includedOrderIds: ['2'],
    totalOrdersCount: 1,
    serviceFeesDeducted: 44.53,
    netAmountBeforeFees: 935.03,
    createdAt: new Date('2023-11-30')
  },
  {
    id: 'S12347',
    userId: '4',
    amount: 2340.00,
    currency: 'USD',
    status: SettlementStatus.COMPLETED,
    type: SettlementType.BANK_TRANSFER,
    reference: 'REF-003',
    includedOrderIds: ['4', '5', '6'],
    totalOrdersCount: 3,
    serviceFeesDeducted: 117.00,
    netAmountBeforeFees: 2457.00,
    createdAt: new Date('2023-11-25'),
    processedAt: new Date('2023-11-26')
  }
];

// Mock Chart Data
export const mockUserGrowth: ChartData[] = [
  { date: '2023-01', value: 150 },
  { date: '2023-02', value: 180 },
  { date: '2023-03', value: 220 },
  { date: '2023-04', value: 280 },
  { date: '2023-05', value: 320 },
  { date: '2023-06', value: 380 },
  { date: '2023-07', value: 450 },
  { date: '2023-08', value: 520 },
  { date: '2023-09', value: 580 },
  { date: '2023-10', value: 650 },
  { date: '2023-11', value: 720 },
  { date: '2023-12', value: 800 }
];

export const mockRevenueData: ChartData[] = [
  { date: '2023-01', value: 15000 },
  { date: '2023-02', value: 18000 },
  { date: '2023-03', value: 22000 },
  { date: '2023-04', value: 28000 },
  { date: '2023-05', value: 32000 },
  { date: '2023-06', value: 38000 },
  { date: '2023-07', value: 45000 },
  { date: '2023-08', value: 52000 },
  { date: '2023-09', value: 58000 },
  { date: '2023-10', value: 65000 },
  { date: '2023-11', value: 72000 },
  { date: '2023-12', value: 80000 }
];

// Mock Dashboard Data
export const mockDashboardData: DashboardData = {
  totalUsers: 800,
  totalProducts: 1250,
  totalOrders: 3200,
  totalRevenue: 800000,
  pendingSettlements: 15,
  pendingKyc: 8,
  userGrowth: mockUserGrowth,
  revenueData: mockRevenueData,
  topProducts: mockProducts.slice(0, 5),
  recentOrders: mockOrders.slice(0, 5)
}; 