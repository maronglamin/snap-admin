"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const prisma = new client_1.PrismaClient();
async function testConnection() {
    try {
        console.log('🔌 Testing database connection...');
        console.log('📊 Database URL:', process.env.DATABASE_URL?.replace(/\/\/.*@/, '//***:***@'));
        await prisma.$connect();
        console.log('✅ Database connection successful!');
        const result = await prisma.$queryRaw `SELECT 1 as test`;
        console.log('✅ Database query successful:', result);
        const databases = await prisma.$queryRaw `
      SELECT datname FROM pg_database 
      WHERE datistemplate = false
    `;
        console.log('📋 Available databases:', databases);
    }
    catch (error) {
        console.error('❌ Database connection failed:', error);
    }
    finally {
        await prisma.$disconnect();
    }
}
testConnection();
//# sourceMappingURL=testConnection.js.map