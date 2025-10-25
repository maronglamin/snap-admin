#!/bin/bash

echo "🚀 SNAP Admin Panel MFA Testing Script"
echo "======================================"
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Please run this script from the adminPanel root directory"
    exit 1
fi

echo "📋 Prerequisites Check:"
echo "----------------------"

# Check if backend dependencies are installed
if [ -d "backend/node_modules" ]; then
    echo "✅ Backend dependencies installed"
else
    echo "❌ Backend dependencies not found"
    echo "   Run: cd backend && npm install"
    exit 1
fi

# Check if frontend dependencies are installed
if [ -d "admin-panel/node_modules" ]; then
    echo "✅ Frontend dependencies installed"
else
    echo "❌ Frontend dependencies not found"
    echo "   Run: cd admin-panel && npm install"
    exit 1
fi

echo ""
echo "🔧 Starting Services:"
echo "-------------------"

# Start backend server in background
echo "Starting backend server..."
cd backend
npm run dev &
BACKEND_PID=$!
cd ..

# Wait a moment for backend to start
sleep 3

# Start frontend server in background
echo "Starting frontend server..."
cd admin-panel
npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo "⏳ Waiting for services to start..."
sleep 5

echo ""
echo "🌐 Services Status:"
echo "-----------------"

# Check if backend is running
if curl -s http://snap-admin.cloudnexus.biz:3001/api/auth/login > /dev/null 2>&1; then
    echo "✅ Backend server running on http://snap-admin.cloudnexus.biz:3001"
else
    echo "❌ Backend server not responding"
fi

# Check if frontend is running
if curl -s http://snap-admin.cloudnexus.biz:3000 > /dev/null 2>&1; then
    echo "✅ Frontend server running on http://snap-admin.cloudnexus.biz:3000"
else
    echo "❌ Frontend server not responding"
fi

echo ""
echo "🧪 Testing Instructions:"
echo "----------------------"
echo "1. Open http://snap-admin.cloudnexus.biz:3000 in your browser"
echo "2. Attempt to login with existing admin credentials"
echo "3. Complete MFA setup flow (first time users)"
echo "4. Test MFA verification (subsequent logins)"
echo "5. Test backup code functionality"
echo ""
echo "📱 Authenticator App Setup:"
echo "---------------------------"
echo "- Install Google Authenticator, Authy, or similar app"
echo "- Scan QR code during MFA setup"
echo "- Use generated 6-digit codes for verification"
echo ""
echo "🔒 Security Notes:"
echo "-----------------"
echo "- All admin logins now require MFA"
echo "- Backup codes are one-time use only"
echo "- MFA secrets are stored securely in database"
echo ""
echo "⏹️  To stop services:"
echo "-------------------"
echo "Press Ctrl+C to stop both servers"
echo "Or run: kill $BACKEND_PID $FRONTEND_PID"

# Wait for user to stop
wait
