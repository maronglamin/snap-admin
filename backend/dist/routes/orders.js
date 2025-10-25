"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const auth_1 = require("../middleware/auth");
const puppeteer_1 = __importDefault(require("puppeteer"));
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
router.get('/count', auth_1.authenticate, async (req, res) => {
    try {
        const total = await prisma.orders.count();
        console.log('Total Orders in Database:', total);
        res.json({
            success: true,
            total,
            message: 'Total orders count retrieved successfully',
        });
    }
    catch (error) {
        console.error('Get orders count error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error',
        });
    }
});
router.get('/', auth_1.authenticate, async (req, res) => {
    try {
        const { page = 1, limit = 10, search = '', status = 'all', paymentStatus = 'all', dateFrom = '', dateTo = '', } = req.query;
        console.log('Orders API Query Parameters:', {
            page,
            limit,
            search,
            status,
            paymentStatus,
            dateFrom,
            dateTo,
        });
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;
        const where = {};
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
                    } },
                { User_orders_sellerIdToUser: {
                        OR: [
                            { firstName: { contains: search, mode: 'insensitive' } },
                            { lastName: { contains: search, mode: 'insensitive' } },
                            { phoneNumber: { contains: search, mode: 'insensitive' } }
                        ]
                    } },
            ];
        }
        if (status && status !== 'all') {
            where.status = status;
        }
        if (paymentStatus && paymentStatus !== 'all') {
            where.paymentStatus = paymentStatus;
        }
        if (dateFrom || dateTo) {
            where.createdAt = {};
            if (dateFrom) {
                const startDate = new Date(dateFrom);
                where.createdAt.gte = startDate;
                console.log('Date From Filter:', startDate);
            }
            if (dateTo) {
                const endDate = new Date(dateTo);
                where.createdAt.lte = endDate;
                console.log('Date To Filter:', endDate);
            }
        }
        console.log('Final Where Clause:', JSON.stringify(where, null, 2));
        const total = await prisma.orders.count({ where });
        const totalPages = Math.ceil(total / limitNum);
        console.log('Total Orders Found:', total);
        console.log('Total Pages:', totalPages);
        console.log('Current Page:', pageNum);
        console.log('Limit:', limitNum);
        console.log('Skip:', skip);
        const totalWithoutFilters = await prisma.orders.count();
        console.log('Total Orders in Database (no filters):', totalWithoutFilters);
        const orders = await prisma.orders.findMany({
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
    }
    catch (error) {
        console.error('Get orders error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error',
        });
    }
});
router.get('/export', auth_1.authenticate, async (req, res) => {
    try {
        const { search = '', status = 'all', paymentStatus = 'all', dateFrom = '', dateTo = '', } = req.query;
        const where = {};
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
                    } },
                { User_orders_sellerIdToUser: {
                        OR: [
                            { firstName: { contains: search, mode: 'insensitive' } },
                            { lastName: { contains: search, mode: 'insensitive' } },
                            { phoneNumber: { contains: search, mode: 'insensitive' } }
                        ]
                    } },
            ];
        }
        if (status && status !== 'all') {
            where.status = status;
        }
        if (paymentStatus && paymentStatus !== 'all') {
            where.paymentStatus = paymentStatus;
        }
        if (dateFrom || dateTo) {
            where.createdAt = {};
            if (dateFrom) {
                const startDate = new Date(dateFrom);
                where.createdAt.gte = startDate;
            }
            if (dateTo) {
                const endDate = new Date(dateTo);
                where.createdAt.lte = endDate;
            }
        }
        const orders = await prisma.orders.findMany({
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
    }
    catch (error) {
        console.error('Export orders error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error',
        });
    }
});
router.get('/:id', auth_1.authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const order = await prisma.orders.findUnique({
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
    }
    catch (error) {
        console.error('Get order by ID error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error',
        });
    }
});
router.put('/:id/status', auth_1.authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        if (!status) {
            return res.status(400).json({
                success: false,
                error: 'Status is required',
            });
        }
        const order = await prisma.orders.update({
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
    }
    catch (error) {
        console.error('Update order status error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error',
        });
    }
});
router.get('/:id/invoice', auth_1.authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const order = await prisma.orders.findUnique({
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
        const htmlContent = generateInvoiceHTML(order);
        const browser = await puppeteer_1.default.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();
        await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
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
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="invoice-${order.orderNumber}.pdf"`);
        res.send(pdfBuffer);
    }
    catch (error) {
        console.error('Download invoice error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error',
        });
    }
});
function generateInvoiceHTML(order) {
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
          font-size: 28px;
          font-weight: 700;
          color: #1e3a8a;
          margin-bottom: 10px;
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
              <div class="company-logo">SNAP</div>
              <div class="company-details">
                <div>123 Business Street</div>
                <div>Serekunda, The Gambia</div>
                <div>Phone: +220 123 456 789</div>
                <div>Email: info@cloudnexus.biz</div>
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
            ${order.items?.map((item) => `
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
function formatCurrency(amount, currency) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency || 'GMD',
        minimumFractionDigits: 2,
    }).format(amount);
}
function formatShippingAddress(address) {
    if (!address)
        return 'N/A';
    try {
        const parsed = JSON.parse(address);
        if (typeof parsed === 'object' && parsed !== null) {
            const parts = [];
            if (parsed.address)
                parts.push(parsed.address);
            if (parsed.city)
                parts.push(parsed.city);
            if (parsed.state)
                parts.push(parsed.state);
            if (parsed.postalCode)
                parts.push(parsed.postalCode);
            if (parsed.country)
                parts.push(parsed.country);
            return parts.join(', ');
        }
    }
    catch (e) {
    }
    return address;
}
exports.default = router;
//# sourceMappingURL=orders.js.map