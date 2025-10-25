export interface AuditTransactionForExport {
  id: string;
  appTransactionId: string;
  orderId: string;
  rideRequestId?: string;
  orderNumber?: string;
  requestId?: string;
  customerName?: string;
  customerEmail?: string;
  sellerName?: string;
  sellerEmail?: string;
  amount: number;
  currencyCode: string;
  gatewayChargeFees?: number;
  processedAmount?: number;
  status: string;
  transactionType: string;
  gatewayProvider: string;
  appService: string;
  gatewayTransactionId?: string;
  paymentReference?: string;
  paidThroughGateway: boolean;
  failureReason?: string;
  createdAt: string;
  updatedAt: string;
  processedAt?: string;
}

export interface StripeTransactionForExport {
  id: string;
  appTransactionId: string;
  orderId: string;
  rideRequestId?: string;
  orderNumber?: string;
  requestId?: string;
  customerName?: string;
  customerEmail?: string;
  sellerName?: string;
  sellerEmail?: string;
  amount: number;
  currencyCode: string;
  gatewayChargeFees?: number;
  processedAmount?: number;
  status: string;
  transactionType: string;
  gatewayProvider: string;
  appService: string;
  gatewayTransactionId?: string;
  paymentReference?: string;
  paidThroughGateway: boolean;
  failureReason?: string;
  createdAt: string;
  updatedAt: string;
  processedAt?: string;
}

export interface SnapFeeTransactionForExport {
  id: string;
  appTransactionId: string;
  orderId: string;
  rideRequestId?: string;
  orderNumber?: string;
  requestId?: string;
  customerName?: string;
  customerEmail?: string;
  sellerName?: string;
  sellerEmail?: string;
  amount: number;
  currencyCode: string;
  gatewayChargeFees?: number;
  processedAmount?: number;
  status: string;
  transactionType: string;
  gatewayProvider: string;
  appService: string;
  gatewayTransactionId?: string;
  paymentReference?: string;
  paidThroughGateway: boolean;
  failureReason?: string;
  createdAt: string;
  updatedAt: string;
  processedAt?: string;
}

export interface OrderForExport {
  id: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  sellerName?: string;
  sellerPhone?: string;
  totalAmount: number;
  currencyCode: string;
  status: string;
  paymentStatus: string;
  shippingAddress: string;
  shippingCity: string;
  shippingState: string;
  shippingCountry: string;
  shippingPostalCode: string;
  itemsCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProductForExport {
  id: string;
  title: string;
  description: string;
  price: number;
  currencyCode: string;
  condition: string;
  status: string;
  isFeatured: boolean;
  sellerName?: string;
  sellerPhone?: string;
  categoryName?: string;
  totalOrders: number;
  createdAt: string;
  updatedAt: string;
}

export const exportAuditTransactionsToCSV = (transactions: AuditTransactionForExport[], filename: string = 'audit-report') => {
  // Define CSV headers
  const headers = [
    'Transaction ID',
    'App Transaction ID',
    'Order/Ride Request ID',
    'Order Number/Request ID',
    'Customer Name',
    'Customer Email',
    'Seller Name',
    'Seller Email',
    'Amount',
    'Currency',
    'Gateway Charge Fees',
    'Processed Amount',
    'Status',
    'Transaction Type',
    'Gateway Provider',
    'Access Channel',
    'Gateway Transaction ID',
    'Payment Reference',
    'Paid Through Gateway',
    'Failure Reason',
    'Created At',
    'Updated At',
    'Processed At'
  ];

  // Convert transactions to CSV rows
  const csvRows = transactions.map(transaction => [
    transaction.id,
    transaction.appTransactionId,
    transaction.appService === 'RIDES' ? (transaction.rideRequestId || '') : transaction.orderId,
    transaction.appService === 'RIDES' ? (transaction.requestId || '') : (transaction.orderNumber || ''),
    transaction.customerName || '',
    transaction.customerEmail || '',
    transaction.sellerName || '',
    transaction.sellerEmail || '',
    transaction.amount.toString(),
    transaction.currencyCode,
    transaction.gatewayChargeFees?.toString() || '',
    transaction.processedAmount?.toString() || '',
    transaction.status,
    transaction.transactionType,
    transaction.gatewayProvider,
    transaction.appService,
    transaction.gatewayTransactionId || '',
    transaction.paymentReference || '',
    transaction.paidThroughGateway ? 'Yes' : 'No',
    transaction.failureReason || '',
    new Date(transaction.createdAt).toLocaleString(),
    new Date(transaction.updatedAt).toLocaleString(),
    transaction.processedAt ? new Date(transaction.processedAt).toLocaleString() : ''
  ]);

  // Combine headers and rows
  const csvContent = [headers, ...csvRows]
    .map(row => row.map(field => `"${field}"`).join(','))
    .join('\n');

  // Create and trigger download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

export const formatAmountForCSV = (amount: number, currency: string) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency || 'USD',
  }).format(amount);
};

export const exportStripeTransactionsToCSV = (transactions: StripeTransactionForExport[], filename: string = 'stripe-payments-report') => {
  // Define CSV headers
  const headers = [
    'Transaction ID',
    'App Transaction ID',
    'Order/Ride Request ID',
    'Order Number/Request ID',
    'Customer Name',
    'Customer Email',
    'Seller Name',
    'Seller Email',
    'Amount',
    'Currency',
    'Gateway Charge Fees',
    'Processed Amount',
    'Status',
    'Transaction Type',
    'Gateway Provider',
    'Access Channel',
    'Gateway Transaction ID',
    'Payment Reference',
    'Paid Through Gateway',
    'Failure Reason',
    'Created At',
    'Updated At',
    'Processed At'
  ];

  // Convert transactions to CSV rows
  const csvRows = transactions.map(transaction => [
    transaction.id,
    transaction.appTransactionId,
    transaction.orderId,
    transaction.orderNumber || '',
    transaction.customerName || '',
    transaction.customerEmail || '',
    transaction.sellerName || '',
    transaction.sellerEmail || '',
    transaction.amount.toString(),
    transaction.currencyCode,
    transaction.gatewayChargeFees?.toString() || '',
    transaction.processedAmount?.toString() || '',
    transaction.status,
    transaction.transactionType,
    transaction.gatewayProvider,
    transaction.gatewayTransactionId || '',
    transaction.paymentReference || '',
    transaction.paidThroughGateway ? 'Yes' : 'No',
    transaction.failureReason || '',
    new Date(transaction.createdAt).toLocaleString(),
    new Date(transaction.updatedAt).toLocaleString(),
    transaction.processedAt ? new Date(transaction.processedAt).toLocaleString() : ''
  ]);

  // Combine headers and rows
  const csvContent = [headers, ...csvRows]
    .map(row => row.map(field => `"${field}"`).join(','))
    .join('\n');

  // Create and trigger download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

export const exportSnapFeeTransactionsToCSV = (transactions: SnapFeeTransactionForExport[], filename: string = 'snap-fees-report') => {
  // Define CSV headers
  const headers = [
    'Transaction ID',
    'App Transaction ID',
    'Order/Ride Request ID',
    'Order Number/Request ID',
    'Customer Name',
    'Customer Email',
    'Seller Name',
    'Seller Email',
    'Amount',
    'Currency',
    'Gateway Charge Fees',
    'Processed Amount',
    'Status',
    'Transaction Type',
    'Gateway Provider',
    'Access Channel',
    'Gateway Transaction ID',
    'Payment Reference',
    'Paid Through Gateway',
    'Failure Reason',
    'Created At',
    'Updated At',
    'Processed At'
  ];

  // Convert transactions to CSV rows
  const csvRows = transactions.map(transaction => [
    transaction.id,
    transaction.appTransactionId,
    transaction.orderId,
    transaction.orderNumber || '',
    transaction.customerName || '',
    transaction.customerEmail || '',
    transaction.sellerName || '',
    transaction.sellerEmail || '',
    transaction.amount.toString(),
    transaction.currencyCode,
    transaction.gatewayChargeFees?.toString() || '',
    transaction.processedAmount?.toString() || '',
    transaction.status,
    transaction.transactionType,
    transaction.gatewayProvider,
    transaction.gatewayTransactionId || '',
    transaction.paymentReference || '',
    transaction.paidThroughGateway ? 'Yes' : 'No',
    transaction.failureReason || '',
    new Date(transaction.createdAt).toLocaleString(),
    new Date(transaction.updatedAt).toLocaleString(),
    transaction.processedAt ? new Date(transaction.processedAt).toLocaleString() : ''
  ]);

  // Combine headers and rows
  const csvContent = [headers, ...csvRows]
    .map(row => row.map(field => `"${field}"`).join(','))
    .join('\n');

  // Create and trigger download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

export const exportOrdersToCSV = (orders: OrderForExport[], filename: string = 'orders-report') => {
  // Define CSV headers
  const headers = [
    'Order ID',
    'Order Number',
    'Customer Name',
    'Customer Email',
    'Customer Phone',
    'Seller Name',
    'Seller Phone',
    'Total Amount',
    'Currency',
    'Status',
    'Payment Status',
    'Shipping Address',
    'Shipping City',
    'Shipping State',
    'Shipping Country',
    'Shipping Postal Code',
    'Items Count',
    'Created At',
    'Updated At'
  ];

  // Convert orders to CSV rows
  const csvRows = orders.map(order => [
    order.id,
    order.orderNumber,
    order.customerName,
    order.customerEmail,
    order.customerPhone,
    order.sellerName || '',
    order.sellerPhone || '',
    order.totalAmount.toString(),
    order.currencyCode,
    order.status,
    order.paymentStatus,
    order.shippingAddress,
    order.shippingCity,
    order.shippingState,
    order.shippingCountry,
    order.shippingPostalCode,
    order.itemsCount.toString(),
    new Date(order.createdAt).toLocaleString(),
    new Date(order.updatedAt).toLocaleString()
  ]);

  // Combine headers and rows
  const csvContent = [headers, ...csvRows]
    .map(row => row.map(field => `"${field}"`).join(','))
    .join('\n');

  // Create and trigger download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

export const exportProductsToCSV = (products: ProductForExport[], filename: string = 'products-report') => {
  // Define CSV headers
  const headers = [
    'Product ID',
    'Title',
    'Description',
    'Price',
    'Currency',
    'Condition',
    'Status',
    'Featured',
    'Seller Name',
    'Seller Phone',
    'Category Name',
    'Total Orders',
    'Created At',
    'Updated At'
  ];

  // Convert products to CSV rows
  const csvRows = products.map(product => [
    product.id,
    product.title,
    product.description,
    product.price.toString(),
    product.currencyCode,
    product.condition,
    product.status,
    product.isFeatured ? 'Yes' : 'No',
    product.sellerName || '',
    product.sellerPhone || '',
    product.categoryName || '',
    product.totalOrders.toString(),
    new Date(product.createdAt).toLocaleString(),
    new Date(product.updatedAt).toLocaleString()
  ]);

  // Combine headers and rows
  const csvContent = [headers, ...csvRows]
    .map(row => row.map(field => `"${field}"`).join(','))
    .join('\n');

  // Create and trigger download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}; 