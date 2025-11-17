import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth';
import puppeteer from 'puppeteer';
import * as fs from 'fs';
import * as path from 'path';

const router = Router();
const prisma = new PrismaClient();

// Load SNAP logo SVG from public folder and convert to data URL (once at startup)
function getLogoDataUrl(): string {
  try {
    const rootPublicPath = path.resolve(__dirname, '../../..', 'public', 'snap.svg');
    const adminPanelPublicPath = path.resolve(__dirname, '../../..', 'admin-panel', 'public', 'snap.svg');
    let logoPath = '';
    if (fs.existsSync(rootPublicPath)) {
      logoPath = rootPublicPath;
    } else if (fs.existsSync(adminPanelPublicPath)) {
      logoPath = adminPanelPublicPath;
    } else {
      return '';
    }
    const svgContent = fs.readFileSync(logoPath, 'utf8');
    return `data:image/svg+xml;utf8,${encodeURIComponent(svgContent)}`;
  } catch {
    return '';
  }
}
const logoSvgDataUrl = getLogoDataUrl();

// @route   GET /api/orders/count
// @desc    Get total count of orders for debugging
// @access  Private
router.get('/count', authenticate, async (req: any, res) => {
  try {
    const total = await (prisma as any).orders.count();
    console.log('Total Orders in Database:', total);
    
    res.json({
      success: true,
      total,
      message: 'Total orders count retrieved successfully',
    });
  } catch (error) {
    console.error('Get orders count error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
    });
  }
});

// @route   GET /api/orders
// @desc    Get all orders with filtering, search, and pagination
// @access  Private
router.get('/', authenticate, async (req: any, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search = '', 
      status = 'all',
      paymentStatus = 'all',
      dateFrom = '',
      dateTo = '',
    } = req.query;

    console.log('Orders API Query Parameters:', {
      page,
      limit,
      search,
      status,
      paymentStatus,
      dateFrom,
      dateTo,
    });

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Build where clause for orders
    const where: any = {};

    // Add search filter
    if (search) {
      where.OR = [
        { orderNumber: { contains: search, mode: 'insensitive' } },
        { customerName: { contains: search, mode: 'insensitive' } },
        { customerEmail: { contains: search, mode: 'insensitive' } },
        { customerPhone: { contains: search, mode: 'insensitive' } },
        { totalAmount: { equals: parseFloat(search) || undefined } },
        { User_orders_userIdToUser: { 
          OR: [
            { firstName: { contains: search, mode: 'insensitive' } },
            { lastName: { contains: search, mode: 'insensitive' } },
            { phoneNumber: { contains: search, mode: 'insensitive' } }
          ]
        }},
        { User_orders_sellerIdToUser: { 
          OR: [
            { firstName: { contains: search, mode: 'insensitive' } },
            { lastName: { contains: search, mode: 'insensitive' } },
            { phoneNumber: { contains: search, mode: 'insensitive' } }
          ]
        }},
      ];
    }

    // Add status filter
    if (status && status !== 'all') {
      where.status = status;
    }

    // Add payment status filter
    if (paymentStatus && paymentStatus !== 'all') {
      where.paymentStatus = paymentStatus;
    }

    // Add date range filter
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) {
        const startDate = new Date(dateFrom as string);
        where.createdAt.gte = startDate;
        console.log('Date From Filter:', startDate);
      }
      if (dateTo) {
        const endDate = new Date(dateTo as string);
        where.createdAt.lte = endDate;
        console.log('Date To Filter:', endDate);
      }
    }

    console.log('Final Where Clause:', JSON.stringify(where, null, 2));

    // Get total count
    const total = await (prisma as any).orders.count({ where });
    const totalPages = Math.ceil(total / limitNum);

    console.log('Total Orders Found:', total);
    console.log('Total Pages:', totalPages);
    console.log('Current Page:', pageNum);
    console.log('Limit:', limitNum);
    console.log('Skip:', skip);

    // Get total count without any filters for debugging
    const totalWithoutFilters = await (prisma as any).orders.count();
    console.log('Total Orders in Database (no filters):', totalWithoutFilters);

    // Get paginated data with related information
    const orders = await (prisma as any).orders.findMany({
      where,
      include: {
        User_orders_userIdToUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phoneNumber: true,
          }
        },
        User_orders_sellerIdToUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phoneNumber: true,
          }
        },
        items: {
          select: {
            id: true,
            productId: true,
            quantity: true,
            unitPrice: true,
            totalPrice: true,
            status: true,
            productSnapshot: true,
            createdAt: true,
            updatedAt: true,
            product: {
              select: {
                id: true,
                title: true,
                price: true,
                currencyCode: true,
              }
            }
          }
        },
        externalTransactions: {
          select: {
            id: true,
            appTransactionId: true,
            amount: true,
            status: true,
            transactionType: true,
            gatewayProvider: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limitNum,
    });

    res.json({
      success: true,
      data: orders,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages,
        hasNext: pageNum < totalPages,
        hasPrev: pageNum > 1,
      },
    });
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
    });
  }
});

// @route   GET /api/orders/export
// @desc    Export all orders with current filters (no pagination)
// @access  Private
router.get('/export', authenticate, async (req: any, res) => {
  try {
    const { 
      search = '', 
      status = 'all',
      paymentStatus = 'all',
      dateFrom = '',
      dateTo = '',
    } = req.query;

    // Build where clause for orders
    const where: any = {};

    // Add search filter
    if (search) {
      where.OR = [
        { orderNumber: { contains: search, mode: 'insensitive' } },
        { customerName: { contains: search, mode: 'insensitive' } },
        { customerEmail: { contains: search, mode: 'insensitive' } },
        { customerPhone: { contains: search, mode: 'insensitive' } },
        { totalAmount: { equals: parseFloat(search) || undefined } },
        { User_orders_userIdToUser: { 
          OR: [
            { firstName: { contains: search, mode: 'insensitive' } },
            { lastName: { contains: search, mode: 'insensitive' } },
            { phoneNumber: { contains: search, mode: 'insensitive' } }
          ]
        }},
        { User_orders_sellerIdToUser: { 
          OR: [
            { firstName: { contains: search, mode: 'insensitive' } },
            { lastName: { contains: search, mode: 'insensitive' } },
            { phoneNumber: { contains: search, mode: 'insensitive' } }
          ]
        }},
      ];
    }

    // Add status filter
    if (status && status !== 'all') {
      where.status = status;
    }

    // Add payment status filter
    if (paymentStatus && paymentStatus !== 'all') {
      where.paymentStatus = paymentStatus;
    }

    // Add date range filter
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) {
        const startDate = new Date(dateFrom as string);
        where.createdAt.gte = startDate;
      }
      if (dateTo) {
        const endDate = new Date(dateTo as string);
        where.createdAt.lte = endDate;
      }
    }

    // Get all data with related information (no pagination for export)
    const orders = await (prisma as any).orders.findMany({
      where,
      include: {
        User_orders_userIdToUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phoneNumber: true,
          }
        },
        User_orders_sellerIdToUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phoneNumber: true,
          }
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                title: true,
                price: true,
                currencyCode: true,
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      data: orders,
      total: orders.length,
    });
  } catch (error) {
    console.error('Export orders error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
    });
  }
});

// @route   GET /api/orders/:id
// @desc    Get single order with full details
// @access  Private
router.get('/:id', authenticate, async (req: any, res) => {
  try {
    const { id } = req.params;

    const order = await (prisma as any).orders.findUnique({
      where: { id },
      include: {
        User_orders_userIdToUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phoneNumber: true,
          }
        },
        User_orders_sellerIdToUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phoneNumber: true,
          }
        },
        items: {
          select: {
            id: true,
            productId: true,
            quantity: true,
            unitPrice: true,
            totalPrice: true,
            status: true,
            productSnapshot: true,
            createdAt: true,
            updatedAt: true,
            product: {
              select: {
                id: true,
                title: true,
                description: true,
                price: true,
                currencyCode: true,
                condition: true,
                images: {
                  select: {
                    imageUrl: true,
                    isPrimary: true,
                  }
                }
              }
            }
          }
        },
        externalTransactions: {
          include: {
            customer: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                phoneNumber: true,
              }
            },
            seller: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                phoneNumber: true,
              }
            },
            paymentMethod: true
          }
        }
      },
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found',
      });
    }

    res.json({
      success: true,
      data: order,
    });
  } catch (error) {
    console.error('Get order by ID error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
    });
  }
});

// @route   PUT /api/orders/:id/status
// @desc    Update order status
// @access  Private
router.put('/:id/status', authenticate, async (req: any, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        error: 'Status is required',
      });
    }

    const order = await (prisma as any).orders.update({
      where: { id },
      data: { 
        status,
        updatedAt: new Date(),
        ...(status === 'SHIPPED' && { shippedAt: new Date() }),
        ...(status === 'DELIVERED' && { deliveredAt: new Date() }),
        ...(status === 'CANCELLED' && { cancelledAt: new Date() }),
      },
      include: {
        User_orders_userIdToUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phoneNumber: true,
          }
        },
        User_orders_sellerIdToUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phoneNumber: true,
          }
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                title: true,
                price: true,
                currencyCode: true,
              }
            }
          }
        },
      },
    });

    res.json({
      success: true,
      data: order,
      message: 'Order status updated successfully',
    });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
    });
  }
});

// @route   GET /api/orders/:id/invoice
// @desc    Download invoice PDF for a specific order
// @access  Private
router.get('/:id/invoice', authenticate, async (req: any, res) => {
  try {
    const { id } = req.params;

    const order = await (prisma as any).orders.findUnique({
      where: { id },
      include: {
        User_orders_userIdToUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phoneNumber: true,
          }
        },
        User_orders_sellerIdToUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phoneNumber: true,
          }
        },
        items: {
          select: {
            id: true,
            productId: true,
            quantity: true,
            unitPrice: true,
            totalPrice: true,
            status: true,
            productSnapshot: true,
            product: {
              select: {
                id: true,
                title: true,
                price: true,
                currencyCode: true,
              }
            }
          }
        },
        externalTransactions: {
          select: {
            id: true,
            appTransactionId: true,
            amount: true,
            status: true,
            transactionType: true,
            gatewayProvider: true,
          }
        }
      },
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found',
      });
    }

    // Generate PDF content
    const htmlContent = generateInvoiceHTML(order);
    
    // Generate PDF using Puppeteer
    const browser = await puppeteer.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    
    // Set content and wait for fonts to load
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    
    // Generate PDF
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20mm',
        right: '20mm',
        bottom: '20mm',
        left: '20mm'
      }
    });
    
    await browser.close();

    // Set response headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="invoice-${order.orderNumber}.pdf"`);
    
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Download invoice error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
    });
  }
});

// Helper function to generate HTML content for PDF
function generateInvoiceHTML(order: any) {
  const pdfContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Invoice - ${order.orderNumber}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: 'Inter', sans-serif;
          line-height: 1.6;
          color: #1a202c;
          background-color: #ffffff;
        }
        
        .invoice-container {
          max-width: 800px;
          margin: 0 auto;
          padding: 40px 20px;
        }
        
        .header {
          border-bottom: 3px solid #1e3a8a;
          padding-bottom: 30px;
          margin-bottom: 40px;
        }
        
        .company-info {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 20px;
        }
        
        .company-logo {
          margin-bottom: 10px;
        }
        
        .company-logo img {
          width: 140px;
          height: auto;
          display: block;
        }
        
        .company-details {
          font-size: 14px;
          color: #4a5568;
          line-height: 1.8;
        }
        
        .invoice-title {
          text-align: right;
          margin-bottom: 20px;
        }
        
        .invoice-title h1 {
          font-size: 36px;
          font-weight: 700;
          color: #1e3a8a;
          margin-bottom: 5px;
        }
        
        .invoice-title .invoice-number {
          font-size: 18px;
          color: #4a5568;
          font-weight: 500;
        }
        
        .invoice-title .date {
          font-size: 14px;
          color: #718096;
        }
        
        .billing-section {
          display: flex;
          justify-content: space-between;
          margin-bottom: 40px;
        }
        
        .billing-box {
          flex: 1;
          margin-right: 40px;
        }
        
        .billing-box:last-child {
          margin-right: 0;
        }
        
        .billing-title {
          font-size: 16px;
          font-weight: 600;
          color: #1e3a8a;
          margin-bottom: 15px;
          padding-bottom: 8px;
          border-bottom: 2px solid #e2e8f0;
        }
        
        .billing-details {
          font-size: 14px;
          color: #4a5568;
          line-height: 1.8;
        }
        
        .billing-details strong {
          color: #1a202c;
          font-weight: 600;
        }
        
        .items-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 30px;
        }
        
        .items-table th {
          background-color: #1e3a8a;
          color: white;
          padding: 15px 12px;
          text-align: left;
          font-weight: 600;
          font-size: 14px;
        }
        
        .items-table td {
          padding: 15px 12px;
          border-bottom: 1px solid #e2e8f0;
          font-size: 14px;
        }
        
        .items-table tr:nth-child(even) {
          background-color: #f7fafc;
        }
        
        .item-name {
          font-weight: 500;
          color: #1a202c;
        }
        
        .item-price {
          text-align: right;
          font-weight: 500;
        }
        
        .item-quantity {
          text-align: center;
        }
        
        .item-total {
          text-align: right;
          font-weight: 600;
          color: #1e3a8a;
        }
        
        .totals-section {
          margin-left: auto;
          width: 300px;
        }
        
        .total-row {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          font-size: 14px;
        }
        
        .total-row.grand-total {
          font-size: 18px;
          font-weight: 700;
          color: #1e3a8a;
          border-top: 2px solid #1e3a8a;
          padding-top: 15px;
          margin-top: 10px;
        }
        
        .footer {
          margin-top: 50px;
          padding-top: 30px;
          border-top: 1px solid #e2e8f0;
          text-align: center;
          color: #718096;
          font-size: 12px;
        }
        
        .status-badge {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
        }
        
        .status-confirmed {
          background-color: #dcfce7;
          color: #166534;
        }
        
        .status-pending {
          background-color: #fef3c7;
          color: #92400e;
        }
        
        .status-cancelled {
          background-color: #fee2e2;
          color: #991b1b;
        }
        
        .payment-paid {
          background-color: #dcfce7;
          color: #166534;
        }
        
        .payment-pending {
          background-color: #fef3c7;
          color: #92400e;
        }
      </style>
    </head>
    <body>
      <div class="invoice-container">
        <div class="header">
          <div class="company-info">
            <div>
              <div class="company-logo">
                ${logoSvgDataUrl ? `<img src="${logoSvgDataUrl}" alt="SNAP Logo" />` : 'SNAP'}
              </div>
              <div class="company-details">
                <div>Serekunda, The Gambia</div>
                <div>Phone: +220 354 7128</div>
                <div>Email: customercare@cloudnexus.biz</div>
              </div>
            </div>
            <div class="invoice-title">
              <h1>INVOICE</h1>
              <div class="invoice-number">#${order.orderNumber}</div>
              <div class="date">Date: ${new Date(order.createdAt).toLocaleDateString()}</div>
            </div>
          </div>
        </div>
        
        <div class="billing-section">
          <div class="billing-box">
            <div class="billing-title">Bill To</div>
            <div class="billing-details">
              <div><strong>${order.User_orders_userIdToUser?.firstName || ''} ${order.User_orders_userIdToUser?.lastName || ''}</strong></div>
              <div>${order.customerName || 'N/A'}</div>
              <div>${order.customerEmail || 'N/A'}</div>
              <div>${order.customerPhone || order.User_orders_userIdToUser?.phoneNumber || 'N/A'}</div>
              <div>${formatShippingAddress(order.shippingAddress)}</div>
            </div>
          </div>
          <div class="billing-box">
            <div class="billing-title">Order Details</div>
            <div class="billing-details">
              <div><strong>Order Status:</strong> <span class="status-badge status-${order.status.toLowerCase()}">${order.status}</span></div>
              <div><strong>Payment Status:</strong> <span class="status-badge payment-${order.paymentStatus.toLowerCase()}">${order.paymentStatus}</span></div>
              <div><strong>Payment Method:</strong> ${order.paymentMethod || 'N/A'}</div>
              <div><strong>Order Date:</strong> ${new Date(order.createdAt).toLocaleDateString()}</div>
              ${order.shippedAt ? `<div><strong>Shipped Date:</strong> ${new Date(order.shippedAt).toLocaleDateString()}</div>` : ''}
              ${order.deliveredAt ? `<div><strong>Delivered Date:</strong> ${new Date(order.deliveredAt).toLocaleDateString()}</div>` : ''}
            </div>
          </div>
        </div>
        
        <table class="items-table">
          <thead>
            <tr>
              <th>Item</th>
              <th>Price</th>
              <th>Qty</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            ${order.items?.map((item: any) => `
              <tr>
                <td class="item-name">${item.product?.title || item.productSnapshot?.title || 'Product'}</td>
                <td class="item-price">${formatCurrency(item.unitPrice, order.currencyCode)}</td>
                <td class="item-quantity">${item.quantity}</td>
                <td class="item-total">${formatCurrency(item.totalPrice, order.currencyCode)}</td>
              </tr>
            `).join('') || ''}
          </tbody>
        </table>
        
        <div class="totals-section">
          <div class="total-row">
            <span>Subtotal:</span>
            <span>${formatCurrency(order.subtotalAmount || order.totalAmount, order.currencyCode)}</span>
          </div>
          ${order.shippingAmount ? `
            <div class="total-row">
              <span>Shipping:</span>
              <span>${formatCurrency(order.shippingAmount, order.currencyCode)}</span>
            </div>
          ` : ''}
          ${order.taxAmount ? `
            <div class="total-row">
              <span>Tax:</span>
              <span>${formatCurrency(order.taxAmount, order.currencyCode)}</span>
            </div>
          ` : ''}
          ${order.discountAmount ? `
            <div class="total-row">
              <span>Discount:</span>
              <span>-${formatCurrency(order.discountAmount, order.currencyCode)}</span>
            </div>
          ` : ''}
          <div class="total-row grand-total">
            <span>Total:</span>
            <span>${formatCurrency(order.totalAmount, order.currencyCode)}</span>
          </div>
        </div>
        
        <div class="footer">
          <p>Thank you for your business!</p>
          <p>This is a computer-generated invoice. No signature required.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return pdfContent;
}

// Helper function to format currency
function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency || 'GMD',
    minimumFractionDigits: 2,
  }).format(amount);
}

// Helper function to format shipping address
function formatShippingAddress(address: string | null) {
  if (!address) return 'N/A';
  
  try {
    // Try to parse as JSON first
    const parsed = JSON.parse(address);
    if (typeof parsed === 'object' && parsed !== null) {
      // If it's an object, format it nicely
      const parts = [];
      if (parsed.address) parts.push(parsed.address);
      if (parsed.city) parts.push(parsed.city);
      if (parsed.state) parts.push(parsed.state);
      if (parsed.postalCode) parts.push(parsed.postalCode);
      if (parsed.country) parts.push(parsed.country);
      return parts.join(', ');
    }
  } catch (e) {
    // If it's not JSON, return as is
  }
  
  return address;
}

export default router; 