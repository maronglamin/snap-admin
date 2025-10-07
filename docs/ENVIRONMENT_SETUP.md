# Environment Setup

## Required Environment Variables

Create a `.env` file in the backend directory with the following variables:

```env
# Database
DATABASE_URL="postgresql://username:password@207.154.220.128:5432/marketplace_db"

# JWT Secret
JWT_SECRET="your-super-secret-jwt-key-here"

# Server Configuration
PORT=3001
NODE_ENV=development

# Image Server Configuration
IMAGE_SERVER_URL="https://your-image-server.com"
# or for local development:
# IMAGE_SERVER_URL="http://207.154.220.128:3002"

# Other Configuration
CORS_ORIGIN="http://207.154.220.128:3001"
```

## Image Server Configuration

The `IMAGE_SERVER_URL` is used to construct full URLs for KYC document images. 

### How it works:
- If `documentUrl` in the database is a full URL (starts with http:// or https://), it's used as-is
- If `documentUrl` is a relative path, it's prefixed with `IMAGE_SERVER_URL`

### Examples:
- Database value: `"/uploads/kyc/document123.jpg"`
- With `IMAGE_SERVER_URL="https://cdn.example.com"`
- Result: `"https://cdn.example.com/uploads/kyc/document123.jpg"`

### Setup Steps:
1. Create `.env` file in backend directory
2. Set `IMAGE_SERVER_URL` to your image server domain
3. Restart the backend server
4. KYC document images will now be served from your image server

## Security Notes:
- Keep your `.env` file secure and never commit it to version control
- Use strong, unique JWT secrets in production
- Ensure your image server has proper CORS configuration 