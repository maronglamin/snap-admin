# SNAP Admin Panel

A modern, responsive admin panel for the SNAP marketplace built with Next.js, TypeScript, and Tailwind CSS.

## Features

### ✅ Implemented
- **Dashboard Overview**: Real-time metrics and analytics
- **User Management**: View, search, and manage users with KYC verification
- **Settlement Management**: Process and track settlements
- **Role-Based Access Control**: Comprehensive permission system with navigation, page, and feature-level protection
- **Authentication System**: Secure login/logout with JWT tokens
- **Responsive Design**: Works on desktop, tablet, and mobile
- **Mock Data Integration**: Complete with realistic sample data
- **Modern UI**: Built with Shadcn/ui components
- **State Management**: Zustand for global state
- **Data Fetching**: TanStack Query for efficient data management

### 🚧 Coming Soon
- Product Management
- Order Management
- Advanced Analytics & Reporting
- System Settings
- Real API Integration

## Tech Stack

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Shadcn/ui
- **State Management**: Zustand
- **Data Fetching**: TanStack Query (React Query)
- **Charts**: Recharts
- **Icons**: Lucide React
- **Forms**: React Hook Form + Zod

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd admin-panel
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```

4. **Open your browser**
   Navigate to [http://localhost:3001](http://localhost:3001)

## Project Structure

```
src/
├── app/                    # Next.js app router pages
│   ├── dashboard/         # Dashboard page
│   ├── users/            # User management page
│   ├── settlements/      # Settlement management page
│   ├── products/         # Product management (placeholder)
│   ├── orders/           # Order management (placeholder)
│   ├── analytics/        # Analytics (placeholder)
│   ├── settings/         # Settings (placeholder)
│   ├── layout.tsx        # Root layout
│   └── page.tsx          # Home page (redirects to dashboard)
├── components/           # React components
│   ├── ui/              # Shadcn/ui components
│   ├── layout/          # Layout components (Sidebar, Header, etc.)
│   ├── dashboard/       # Dashboard-specific components
│   ├── users/           # User management components
│   ├── settlements/     # Settlement management components
│   └── providers/       # Context providers
├── hooks/               # Custom React hooks
├── services/            # API services and mock data
├── stores/              # Zustand stores
├── types/               # TypeScript type definitions
└── lib/                 # Utility functions
```

## Key Components

### Dashboard
- **Overview Cards**: Display key metrics (users, products, orders, revenue)
- **Revenue Chart**: Interactive line chart showing revenue trends
- **Quick Actions**: Fast access to common admin tasks
- **Recent Activity**: Latest orders and top products

### User Management
- **User List**: Paginated table with search and filtering
- **User Details**: Modal with comprehensive user information
- **KYC Management**: Approve/reject seller verification
- **Status Management**: Activate/suspend user accounts

### Settlement Management
- **Settlement Overview**: Summary cards for different statuses
- **Settlement List**: Detailed table with processing actions
- **Settlement Details**: Modal with financial breakdown
- **Batch Processing**: Process multiple settlements

## Mock Data

The application includes comprehensive mock data for testing:

- **Users**: 5 sample users with different statuses and KYC states
- **Products**: 3 sample products with various conditions
- **Orders**: 3 sample orders with different statuses
- **Settlements**: 3 sample settlements with different processing states
- **Analytics**: 12 months of revenue and user growth data

## Environment Variables

Create a `.env.local` file in the root directory:

```env
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WS_URL=ws://localhost:3001

# Authentication
NEXTAUTH_SECRET=your-secret-key-here
NEXTAUTH_URL=http://localhost:3001

# Mock Data Configuration
NEXT_PUBLIC_USE_MOCK_DATA=true
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript type checking

## Development Guidelines

### Adding New Features
1. Create types in `src/types/index.ts`
2. Add mock data in `src/services/mockData.ts`
3. Create API service methods in `src/services/api.ts`
4. Add custom hooks in `src/hooks/`
5. Create components in appropriate directories
6. Add pages in `src/app/`

### Styling
- Use Tailwind CSS classes
- Follow the existing design system
- Use Shadcn/ui components when possible
- Maintain responsive design

### State Management
- Use Zustand for global state
- Use React Query for server state
- Keep component state local when possible

## Permission System

The admin panel implements a comprehensive role-based access control (RBAC) system that ensures users can only access features and perform actions they have permission for.

### Key Features
- **Navigation Protection**: Menu items are filtered based on user permissions
- **Page Protection**: Direct URL access is blocked for unauthorized users
- **Feature Protection**: Buttons and actions are conditionally rendered
- **Multi-level Security**: Backend and frontend validation

### Documentation
- **[Complete Documentation](./docs/PERMISSION_SYSTEM.md)**: Detailed implementation guide
- **[Quick Reference](./docs/PERMISSION_QUICK_REFERENCE.md)**: Developer quick start guide

### Quick Example
```typescript
// Protect a page
<PermissionGuard requiredPermission={{ entityType: 'USERS', permission: 'VIEW' }}>
  <UserManagementPage />
</PermissionGuard>

// Check feature access
const featureAccess = useFeatureAccess('USERS');
{featureAccess.canAdd && <Button>Add User</Button>}
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support and questions, please contact the development team.
