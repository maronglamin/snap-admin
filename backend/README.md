# SNAP Admin Backend

Backend API for the SNAP Marketplace Admin Panel built with Express.js, TypeScript, Prisma ORM, and PostgreSQL.

## Features

- 🔐 **Authentication & Authorization**: JWT-based auth with role-based access control
- 👥 **User Management**: Complete CRUD operations for users and KYC verification
- 📦 **Product Management**: Product catalog with moderation capabilities
- 🛒 **Order Management**: Order tracking and status management
- 💰 **Settlement Management**: Payment processing and settlement tracking
- 📊 **Dashboard Analytics**: Real-time metrics and reporting
- 🛡️ **Security**: Rate limiting, CORS, helmet, input validation
- 🗄️ **Database**: PostgreSQL with Prisma ORM for type-safe database operations

## Tech Stack

- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Authentication**: JWT with bcrypt
- **Validation**: express-validator
- **Security**: helmet, cors, rate-limiting

## Prerequisites

- Node.js 18+
- PostgreSQL 12+
- npm or yarn

## Installation

1. **Clone the repository**
   ```bash
   cd backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Update the `.env` file with your database credentials:
   ```env
   DATABASE_URL="postgresql://username:password@snap-admin.cloudnexus.biz:5432/snap_admin_db?schema=public"
   JWT_SECRET="your-super-secret-jwt-key"
   ```

4. **Set up the database**
   ```bash
   # Generate Prisma client
   npm run db:generate
   
   # Push schema to database
   npm run db:push
   
   # Seed the database with initial data
   npm run db:seed
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

## Database Setup

### Using Docker (Recommended)

1. **Start PostgreSQL container**
   ```bash
   docker run --name snap-postgres \
     -e POSTGRES_DB=snap_admin_db \
     -e POSTGRES_USER=snap_user \
     -e POSTGRES_PASSWORD=snap_password \
     -p 5432:5432 \
     -d postgres:15
   ```

2. **Update DATABASE_URL in .env**
   ```env
   DATABASE_URL="postgresql://snap_user:snap_password@snap-admin.cloudnexus.biz:5432/snap_admin_db?schema=public"
   ```

### Using Local PostgreSQL

1. **Create database**
   ```sql
   CREATE DATABASE snap_admin_db;
   CREATE USER snap_user WITH PASSWORD 'snap_password';
   GRANT ALL PRIVILEGES ON DATABASE snap_admin_db TO snap_user;
   ```

## API Endpoints

### Authentication
- `POST /api/auth/login` - Admin login
- `GET /api/auth/me` - Get current admin profile
- `POST /api/auth/logout` - Admin logout

### Users
- `GET /api/users` - Get all users (with pagination and filters)
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/:id/status` - Update user status
- `GET /api/users/:id/kyc` - Get user KYC details
- `PUT /api/users/:id/kyc` - Update KYC status

### Products
- `GET /api/products` - Get all products
- `GET /api/products/:id` - Get product by ID
- `PUT /api/products/:id/status` - Update product status

### Orders
- `GET /api/orders` - Get all orders
- `GET /api/orders/:id` - Get order by ID
- `PUT /api/orders/:id/status` - Update order status

### Settlements
- `GET /api/settlements` - Get all settlements
- `GET /api/settlements/:id` - Get settlement by ID
- `PUT /api/settlements/:id/process` - Process settlement

### Dashboard
- `GET /api/dashboard` - Get dashboard analytics
- `GET /api/dashboard/users` - Get user growth data
- `GET /api/dashboard/revenue` - Get revenue data

## Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run db:generate` - Generate Prisma client
- `npm run db:push` - Push schema changes to database
- `npm run db:migrate` - Run database migrations
- `npm run db:studio` - Open Prisma Studio
- `npm run db:seed` - Seed database with sample data

## Environment Variables

```env
# Database
DATABASE_URL="postgresql://username:password@snap-admin.cloudnexus.biz:5432/snap_admin_db?schema=public"

# Server
PORT=3001
NODE_ENV=development

# JWT
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=24h

# CORS
CORS_ORIGIN=http://snap-admin.cloudnexus.biz:3001

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Admin Default
ADMIN_EMAIL=admin@snap.com
ADMIN_PASSWORD=admin123
ADMIN_NAME=Admin User
```

## Database Schema

The database includes the following main entities:

- **Users**: Buyers and sellers with KYC verification
- **Products**: Product catalog with moderation
- **Orders**: Order management and tracking
- **Settlements**: Payment processing and settlements
- **Admins**: Admin user management

## Security Features

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: bcrypt for password security
- **Rate Limiting**: Prevent abuse with request limiting
- **Input Validation**: express-validator for data validation
- **CORS Protection**: Configured for frontend access
- **Helmet**: Security headers for Express

## Development

### Project Structure
```
src/
├── controllers/     # Route controllers
├── middleware/      # Custom middleware
├── routes/          # API routes
├── services/        # Business logic
├── types/           # TypeScript types
├── utils/           # Utility functions
└── scripts/         # Database scripts
```

### Adding New Features

1. **Create database model** in `prisma/schema.prisma`
2. **Generate Prisma client**: `npm run db:generate`
3. **Create types** in `src/types/`
4. **Create service** in `src/services/`
5. **Create controller** in `src/controllers/`
6. **Create routes** in `src/routes/`
7. **Add to main app** in `src/index.ts`

## Production Deployment

1. **Build the application**
   ```bash
   npm run build
   ```

2. **Set production environment variables**
   ```env
   NODE_ENV=production
   DATABASE_URL="your-production-database-url"
   JWT_SECRET="your-production-jwt-secret"
   ```

3. **Start the server**
   ```bash
   npm start
   ```

## API Documentation

The API follows RESTful conventions and returns JSON responses with the following structure:

```json
{
  "success": true,
  "data": {},
  "message": "Operation successful"
}
```

Error responses:
```json
{
  "success": false,
  "error": "Error message"
}
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License 