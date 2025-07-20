"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
exports.config = {
    database: {
        url: process.env.DATABASE_URL || 'postgresql://username:password@localhost:5432/marketplace_db',
    },
    jwt: {
        secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-here',
    },
    server: {
        port: process.env.PORT || 3001,
        nodeEnv: process.env.NODE_ENV || 'development',
    },
    imageServer: {
        url: process.env.IMAGE_SERVER_URL || 'https://your-image-server.com',
    },
    cors: {
        origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    },
};
exports.default = exports.config;
//# sourceMappingURL=index.js.map