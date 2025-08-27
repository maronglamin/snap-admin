import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

// Import routes
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import productRoutes from './routes/products';
import orderRoutes from './routes/orders';
import settlementRoutes from './routes/settlements';
import dashboardRoutes from './routes/dashboard';
import roleRoutes from './routes/roles';
import operatorEntityRoutes from './routes/operator-entities';
import adminUserRoutes from './routes/admin-users';
import ucpRoutes from './routes/ucp';
import journalsRoutes from './routes/journals';
import categoryRoutes from './routes/categories';
import paymentGatewayRoutes from './routes/payment-gateways';
import riderApplicationRoutes from './routes/rider-applications';
import driverManagementRoutes from './routes/driver-management';
import rideManagementRoutes from './routes/ride-management';
import rideAnalyticsRoutes from './routes/ride-analytics';
import rideServicesRoutes from './routes/ride-services';
import rideServiceTiersRoutes from './routes/ride-service-tiers';
import rentalRequestsRoutes from './routes/rental-requests';
import analyticsRoutes from './routes/analytics';

// Import middleware
import { errorHandler } from './middleware/errorHandler';
import { notFound } from './middleware/notFound';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3001',
  credentials: true,
}));

// Rate limiting - only in production
if (process.env.NODE_ENV === 'production') {
  const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'), // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.',
  });
  app.use(limiter);
} else {
  // Development: more lenient rate limiting
  const devLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 1000, // 1000 requests per minute
    message: 'Too many requests from this IP, please try again later.',
  });
  app.use(devLimiter);
}

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/settlements', settlementRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/operator-entities', operatorEntityRoutes);
app.use('/api/admin-users', adminUserRoutes);
app.use('/api/ucp', ucpRoutes);
app.use('/api/journals', journalsRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/payment-gateways', paymentGatewayRoutes);
app.use('/api/rider-applications', riderApplicationRoutes);
app.use('/api/driver-management', driverManagementRoutes);
app.use('/api/ride-management', rideManagementRoutes);
app.use('/api/ride-analytics', rideAnalyticsRoutes);
app.use('/api/ride-services', rideServicesRoutes);
app.use('/api/ride-service-tiers', rideServiceTiersRoutes);
app.use('/api/rental-requests', rentalRequestsRoutes);
app.use('/api/analytics', analyticsRoutes);

// 404 handler
app.use(notFound);

// Error handler
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
});

export default app; 