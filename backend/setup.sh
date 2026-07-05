#!/bin/bash

echo "🚀 Setting up SNAP Admin Backend..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check if PostgreSQL is running (basic check)
if ! pg_isready -h snap-admin.cloudnexus.biz -p 5432 &> /dev/null; then
    echo "⚠️  PostgreSQL doesn't seem to be running on snap-admin.cloudnexus.biz:5432"
    echo "Please make sure PostgreSQL is running and accessible"
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cat > .env << EOF
# Database Configuration
DATABASE_URL="postgresql://snap_user:snap_password@snap-admin.cloudnexus.biz:5432/snap_admin_db?schema=public"

# Server Configuration
PORT=3001
NODE_ENV=development
PUBLIC_URL=http://localhost:3001

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=24h

# CORS Configuration (frontend origin(s), comma-separated)
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Admin Default Credentials
ADMIN_EMAIL=admin@snap.com
ADMIN_PASSWORD=admin123
ADMIN_NAME=Admin User
EOF
    echo "✅ .env file created. Please update the DATABASE_URL with your actual database credentials."
fi

echo "🎉 Setup completed!"
echo ""
echo "Next steps:"
echo "1. Update the DATABASE_URL in .env with your PostgreSQL credentials"
echo "2. Run: npm run db:generate"
echo "3. Run: npm run db:push"
echo "4. Run: npm run db:seed"
echo "5. Run: npm run dev"
echo ""
echo "Default admin credentials:"
echo "Email: admin@snap.com"
echo "Password: admin123" 