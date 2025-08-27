"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const dotenv_1 = __importDefault(require("dotenv"));
const auth_1 = __importDefault(require("./routes/auth"));
const users_1 = __importDefault(require("./routes/users"));
const products_1 = __importDefault(require("./routes/products"));
const orders_1 = __importDefault(require("./routes/orders"));
const settlements_1 = __importDefault(require("./routes/settlements"));
const dashboard_1 = __importDefault(require("./routes/dashboard"));
const roles_1 = __importDefault(require("./routes/roles"));
const operator_entities_1 = __importDefault(require("./routes/operator-entities"));
const admin_users_1 = __importDefault(require("./routes/admin-users"));
const ucp_1 = __importDefault(require("./routes/ucp"));
const journals_1 = __importDefault(require("./routes/journals"));
const categories_1 = __importDefault(require("./routes/categories"));
const payment_gateways_1 = __importDefault(require("./routes/payment-gateways"));
const rider_applications_1 = __importDefault(require("./routes/rider-applications"));
const driver_management_1 = __importDefault(require("./routes/driver-management"));
const ride_management_1 = __importDefault(require("./routes/ride-management"));
const ride_analytics_1 = __importDefault(require("./routes/ride-analytics"));
const ride_services_1 = __importDefault(require("./routes/ride-services"));
const ride_service_tiers_1 = __importDefault(require("./routes/ride-service-tiers"));
const rental_requests_1 = __importDefault(require("./routes/rental-requests"));
const analytics_1 = __importDefault(require("./routes/analytics"));
const errorHandler_1 = require("./middleware/errorHandler");
const notFound_1 = require("./middleware/notFound");
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 8080;
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3001',
    credentials: true,
}));
if (process.env.NODE_ENV === 'production') {
    const limiter = (0, express_rate_limit_1.default)({
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
        max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
        message: 'Too many requests from this IP, please try again later.',
    });
    app.use(limiter);
}
else {
    const devLimiter = (0, express_rate_limit_1.default)({
        windowMs: 1 * 60 * 1000,
        max: 1000,
        message: 'Too many requests from this IP, please try again later.',
    });
    app.use(devLimiter);
}
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true }));
if (process.env.NODE_ENV === 'development') {
    app.use((0, morgan_1.default)('dev'));
}
else {
    app.use((0, morgan_1.default)('combined'));
}
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV,
    });
});
app.use('/api/auth', auth_1.default);
app.use('/api/users', users_1.default);
app.use('/api/products', products_1.default);
app.use('/api/orders', orders_1.default);
app.use('/api/settlements', settlements_1.default);
app.use('/api/dashboard', dashboard_1.default);
app.use('/api/roles', roles_1.default);
app.use('/api/operator-entities', operator_entities_1.default);
app.use('/api/admin-users', admin_users_1.default);
app.use('/api/ucp', ucp_1.default);
app.use('/api/journals', journals_1.default);
app.use('/api/categories', categories_1.default);
app.use('/api/payment-gateways', payment_gateways_1.default);
app.use('/api/rider-applications', rider_applications_1.default);
app.use('/api/driver-management', driver_management_1.default);
app.use('/api/ride-management', ride_management_1.default);
app.use('/api/ride-analytics', ride_analytics_1.default);
app.use('/api/ride-services', ride_services_1.default);
app.use('/api/ride-service-tiers', ride_service_tiers_1.default);
app.use('/api/rental-requests', rental_requests_1.default);
app.use('/api/analytics', analytics_1.default);
app.use(notFound_1.notFound);
app.use(errorHandler_1.errorHandler);
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV}`);
    console.log(`🔗 Health check: http://localhost:${PORT}/health`);
});
exports.default = app;
//# sourceMappingURL=index.js.map