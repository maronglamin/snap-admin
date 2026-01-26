#!/bin/bash

# Script to set up environment variables on server
# This helps migrate from .env files to proper secrets management

set -e

echo "🔐 Secrets Management Setup Script"
echo "=================================="
echo ""

# Detect OS
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    OS="linux"
elif [[ "$OSTYPE" == "darwin"* ]]; then
    OS="macos"
else
    echo "❌ Unsupported OS: $OSTYPE"
    exit 1
fi

echo "📋 This script will help you:"
echo "  1. Create a secure .env.example file (without secrets)"
echo "  2. Set up environment variables on your server"
echo "  3. Create a script to load secrets from a secure location"
echo ""

# Create .env.example
echo "📝 Creating .env.example files..."

# Backend .env.example
cat > backend/.env.example << 'EOF'
# Database Configuration
DATABASE_URL=postgresql://username:password@host:5432/database_name?schema=public

# Twilio Configuration
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=+1234567890

# Redis Configuration
REDIS_PASSWORD=your_redis_password
REDIS_HOST=127.0.0.1
REDIS_PORT=6379

# Image Server Configuration
IMAGE_SERVER_URL=https://your-image-server.com

# Stripe Configuration
STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key
STRIPE_SECRET_KEY=sk_test_your_secret_key

# Firebase Configuration
FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\nYour private key here\n-----END PRIVATE KEY-----\n
FIREBASE_CLIENT_EMAIL=your-service-account@project.iam.gserviceaccount.com

# Environment
NODE_ENV=production

# Server Configuration
PORT=8080
HOST=0.0.0.0

# JWT Configuration
JWT_SECRET=your_jwt_secret_here_min_32_characters
JWT_EXPIRES_IN=30m

# CORS Configuration
CORS_ORIGINS=https://your-domain.com,https://admin.your-domain.com

# API URL
API_URL=https://api.your-domain.com
EOF

# Admin Panel .env.example
cat > admin-panel/.env.example << 'EOF'
NEXT_PUBLIC_API_URL=https://api.your-domain.com/api
EOF

echo "✅ Created .env.example files"
echo ""

# Create script to load secrets from file (for servers)
cat > backend/load-secrets.sh << 'EOF'
#!/bin/bash
# Load secrets from a secure file
# Usage: source load-secrets.sh

SECRETS_FILE="${SECRETS_FILE:-/etc/secrets/.env}"

if [ ! -f "$SECRETS_FILE" ]; then
    echo "⚠️  Warning: Secrets file not found at $SECRETS_FILE"
    echo "   Create the file with proper permissions (chmod 600)"
    exit 1
fi

# Check file permissions
if [ "$(stat -c %a "$SECRETS_FILE" 2>/dev/null || stat -f %A "$SECRETS_FILE" 2>/dev/null)" != "600" ]; then
    echo "⚠️  Warning: Secrets file should have 600 permissions"
    echo "   Run: chmod 600 $SECRETS_FILE"
fi

# Export all variables from secrets file
set -a
source "$SECRETS_FILE"
set +a

echo "✅ Secrets loaded from $SECRETS_FILE"
EOF

chmod +x backend/load-secrets.sh

# Create systemd service file template for loading secrets
cat > backend/admin-panel-backend.service.template << 'EOF'
[Unit]
Description=Admin Panel Backend API
After=network.target postgresql.service redis.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/admin-panel/backend
EnvironmentFile=/etc/secrets/admin-panel-backend.env
ExecStart=/usr/bin/node dist/index.js
Restart=always
RestartSec=10

# Security
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/var/www/admin-panel/backend

[Install]
WantedBy=multi-user.target
EOF

echo "✅ Created secrets loading script and systemd service template"
echo ""

# Create instructions
cat > SECRETS_MIGRATION_GUIDE.md << 'EOF'
# Secrets Management Migration Guide

## Overview
This guide helps you migrate from `.env` files to proper secrets management.

## Step 1: Create Secure Secrets File on Server

```bash
# Create secure directory
sudo mkdir -p /etc/secrets
sudo chmod 700 /etc/secrets

# Create secrets file
sudo nano /etc/secrets/admin-panel-backend.env

# Add all your environment variables (copy from .env but with NEW rotated credentials)
# IMPORTANT: Use NEW credentials, not the exposed ones!

# Set proper permissions
sudo chmod 600 /etc/secrets/admin-panel-backend.env
sudo chown root:root /etc/secrets/admin-panel-backend.env
```

## Step 2: Update Application to Load Secrets

### Option A: Using systemd (Recommended for production)

1. Copy the service file:
```bash
sudo cp backend/admin-panel-backend.service.template /etc/systemd/system/admin-panel-backend.service
```

2. Edit the service file:
```bash
sudo nano /etc/systemd/system/admin-panel-backend.service
# Update paths and user as needed
```

3. Enable and start:
```bash
sudo systemctl daemon-reload
sudo systemctl enable admin-panel-backend
sudo systemctl start admin-panel-backend
```

### Option B: Using PM2

```bash
# Install PM2
npm install -g pm2

# Create ecosystem file
cat > backend/ecosystem.config.js << 'ECOSYSTEM'
module.exports = {
  apps: [{
    name: 'admin-panel-backend',
    script: 'dist/index.js',
    env_file: '/etc/secrets/admin-panel-backend.env',
    instances: 1,
    exec_mode: 'fork',
    watch: false,
    max_memory_restart: '1G',
  }]
};
ECOSYSTEM

# Start with PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### Option C: Using Docker

```bash
# Create docker-compose.yml
cat > docker-compose.yml << 'DOCKER'
version: '3.8'
services:
  backend:
    build: ./backend
    env_file:
      - /etc/secrets/admin-panel-backend.env
    ports:
      - "8080:8080"
    restart: unless-stopped
DOCKER

# Run
docker-compose up -d
```

## Step 3: Remove .env Files from Server

```bash
# Backup first (just in case)
sudo cp backend/.env backend/.env.backup.old

# Remove .env files
sudo rm backend/.env
sudo rm admin-panel/.env
sudo rm backend/.env.backup
```

## Step 4: Update .gitignore

Ensure these are in `.gitignore`:
```
.env
.env.*
!.env.example
```

## Advanced: Using AWS Secrets Manager

### Install AWS CLI
```bash
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install
```

### Store Secrets
```bash
# Store a secret
aws secretsmanager create-secret \
    --name admin-panel-backend \
    --secret-string file://secrets.json

# Retrieve secrets
aws secretsmanager get-secret-value \
    --secret-id admin-panel-backend \
    --query SecretString \
    --output text > /tmp/secrets.json
```

### Load in Application
```javascript
// backend/src/config/secrets.js
const AWS = require('aws-sdk');
const secretsManager = new AWS.SecretsManager();

async function loadSecrets() {
  try {
    const data = await secretsManager.getSecretValue({
      SecretId: 'admin-panel-backend'
    }).promise();
    
    const secrets = JSON.parse(data.SecretString);
    Object.keys(secrets).forEach(key => {
      process.env[key] = secrets[key];
    });
  } catch (error) {
    console.error('Failed to load secrets:', error);
    process.exit(1);
  }
}

module.exports = loadSecrets;
```

## Advanced: Using HashiCorp Vault

### Install Vault
```bash
# Download and install Vault
wget https://releases.hashicorp.com/vault/1.15.0/vault_1.15.0_linux_amd64.zip
unzip vault_1.15.0_linux_amd64.zip
sudo mv vault /usr/local/bin/
```

### Store Secrets
```bash
# Start Vault (dev mode for testing)
vault server -dev

# In another terminal
export VAULT_ADDR='http://127.0.0.1:8200'
vault kv put secret/admin-panel-backend \
  database_url="postgresql://..." \
  jwt_secret="..." \
  # ... other secrets
```

### Load in Application
```javascript
// Use node-vault library
const vault = require('node-vault')({
  apiVersion: 'v1',
  endpoint: process.env.VAULT_ADDR,
  token: process.env.VAULT_TOKEN
});

async function loadSecrets() {
  const { data } = await vault.read('secret/data/admin-panel-backend');
  Object.keys(data.data).forEach(key => {
    process.env[key.toUpperCase()] = data.data[key];
  });
}
```

## Security Best Practices

1. **Never commit secrets** - Use `.env.example` files instead
2. **Rotate credentials regularly** - Especially after exposure
3. **Use least privilege** - Secrets should only be accessible to the application user
4. **Encrypt at rest** - Use encrypted filesystems or secret management tools
5. **Audit access** - Log who accesses secrets and when
6. **Separate environments** - Use different secrets for dev/staging/prod
7. **Use secret rotation** - Automate credential rotation where possible

## Verification

After migration, verify:
1. Application starts successfully
2. Database connections work
3. External API calls (Twilio, Stripe, etc.) work
4. No `.env` files exist on production servers
5. Secrets are loaded from secure location
6. File permissions are correct (600 for secrets files)

EOF

echo "✅ Created SECRETS_MIGRATION_GUIDE.md"
echo ""
echo "📝 Next steps:"
echo "  1. Review SECRETS_MIGRATION_GUIDE.md"
echo "  2. Create secrets file on your server: /etc/secrets/admin-panel-backend.env"
echo "  3. Update your deployment to use the secrets file"
echo "  4. Remove .env files from production servers"
echo ""
echo "✅ Setup complete!"
