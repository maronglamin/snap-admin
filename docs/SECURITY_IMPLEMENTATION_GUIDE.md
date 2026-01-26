# Security Implementation Guide

This guide provides step-by-step instructions for implementing the three critical security improvements.

---

## 📋 Table of Contents

1. [Clean Git History](#1-clean-git-history)
2. [Implement Secrets Management](#2-implement-secrets-management)
3. [Harden SSH Access](#3-harden-ssh-access)

---

## 1. Clean Git History

### Prerequisites

- Git repository access
- Team coordination (this will rewrite history)
- Backup of current repository

### Option A: Using git-filter-repo (Recommended)

#### Step 1: Install git-filter-repo

**macOS:**
```bash
brew install git-filter-repo
```

**Linux:**
```bash
pip install git-filter-repo
```

**Or via pip (all platforms):**
```bash
pip3 install git-filter-repo
```

#### Step 2: Run the cleanup script

```bash
cd /path/to/adminPanel
./scripts/clean-git-history.sh
```

The script will:
- Create a backup branch
- Remove all `.env` files from git history
- Ask for confirmation before force pushing

#### Step 3: Coordinate with team

**IMPORTANT:** After force pushing, all team members must:

```bash
# Option 1: Fresh clone (recommended)
cd ..
rm -rf adminPanel
git clone <repository-url> adminPanel

# Option 2: Reset existing clone
cd adminPanel
git fetch origin
git reset --hard origin/main
```

### Option B: Using BFG Repo-Cleaner

If git-filter-repo is not available:

```bash
# Download BFG
wget https://repo1.maven.org/maven2/com/madgag/bfg/1.14.0/bfg-1.14.0.jar

# Run cleanup script
./scripts/clean-git-history-bfg.sh
```

### Manual Method

If scripts don't work, you can do it manually:

```bash
# 1. Create backup
git branch backup-before-cleanup

# 2. Install git-filter-repo
pip install git-filter-repo

# 3. Remove files from history
git filter-repo \
    --path backend/.env \
    --path admin-panel/.env \
    --path backend/.env.backup \
    --invert-paths \
    --force

# 4. Force push (coordinate with team first!)
git push origin --force --all
git push origin --force --tags
```

### Verification

After cleanup, verify:

```bash
# Check that .env files are gone from history
git log --all --full-history -- backend/.env
# Should return nothing

# Check repository size (should be smaller)
du -sh .git
```

---

## 2. Implement Secrets Management

### Step 1: Create .env.example files

The script already created these, but verify they exist:

```bash
ls -la backend/.env.example
ls -la admin-panel/.env.example
```

### Step 2: Set up secrets on production server

#### On your DigitalOcean droplet:

```bash
# 1. Create secure directory
sudo mkdir -p /etc/secrets
sudo chmod 700 /etc/secrets

# 2. Create secrets file with NEW credentials
sudo nano /etc/secrets/admin-panel-backend.env
```

**Add all environment variables with NEW rotated credentials:**

```env
# Database - USE NEW PASSWORD!
DATABASE_URL=postgresql://postgres:NEW_STRONG_PASSWORD@localhost:5432/marketplace_uat?schema=public

# Twilio - USE NEW TOKENS!
TWILIO_ACCOUNT_SID=AC_NEW_ACCOUNT_SID
TWILIO_AUTH_TOKEN=NEW_AUTH_TOKEN

# Redis - USE NEW PASSWORD!
REDIS_PASSWORD=NEW_STRONG_REDIS_PASSWORD

# Stripe - ROTATE KEYS!
STRIPE_PUBLISHABLE_KEY=pk_live_NEW_KEY
STRIPE_SECRET_KEY=sk_live_NEW_KEY

# Firebase - GENERATE NEW SERVICE ACCOUNT!
FIREBASE_PROJECT_ID=marketplace-c20bf
FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\nNEW_KEY\n-----END PRIVATE KEY-----\n
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-NEW@marketplace-c20bf.iam.gserviceaccount.com

# JWT - GENERATE NEW SECRET!
JWT_SECRET=$(openssl rand -hex 32)

# ... add all other variables
```

```bash
# 3. Set proper permissions
sudo chmod 600 /etc/secrets/admin-panel-backend.env
sudo chown root:root /etc/secrets/admin-panel-backend.env
```

### Step 3: Update application to use secrets

#### Option A: Using systemd (Recommended)

```bash
# 1. Copy service file
sudo cp backend/admin-panel-backend.service.template /etc/systemd/system/admin-panel-backend.service

# 2. Edit service file
sudo nano /etc/systemd/system/admin-panel-backend.service

# Update these lines:
# User=your-app-user
# WorkingDirectory=/var/www/admin-panel/backend
# EnvironmentFile=/etc/secrets/admin-panel-backend.env
# ExecStart=/usr/bin/node dist/index.js

# 3. Reload and start
sudo systemctl daemon-reload
sudo systemctl enable admin-panel-backend
sudo systemctl start admin-panel-backend
sudo systemctl status admin-panel-backend
```

#### Option B: Using PM2

```bash
# 1. Install PM2
npm install -g pm2

# 2. Create ecosystem file
cat > backend/ecosystem.config.js << 'EOF'
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
EOF

# 3. Start with PM2
cd backend
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

#### Option C: Using Docker

```bash
# Create docker-compose.yml
cat > docker-compose.yml << 'EOF'
version: '3.8'
services:
  backend:
    build: ./backend
    env_file:
      - /etc/secrets/admin-panel-backend.env
    ports:
      - "8080:8080"
    restart: unless-stopped
EOF

docker-compose up -d
```

### Step 4: Remove .env files from server

```bash
# Backup first (just in case)
sudo cp backend/.env backend/.env.old.backup

# Remove .env files
sudo rm backend/.env
sudo rm admin-panel/.env
sudo rm backend/.env.backup

# Verify they're gone
ls -la backend/.env  # Should say "No such file"
```

### Step 5: Rotate all credentials

**CRITICAL:** You must rotate ALL exposed credentials:

1. **Database Password:**
   ```bash
   # Connect to PostgreSQL
   sudo -u postgres psql
   
   # Change password
   ALTER USER postgres WITH PASSWORD 'NEW_STRONG_PASSWORD';
   \q
   ```

2. **Twilio Credentials:**
   - Log into Twilio Console
   - Regenerate Auth Token
   - Update in secrets file

3. **Firebase Service Account:**
   - Go to Firebase Console → Project Settings → Service Accounts
   - Generate new private key
   - Update in secrets file

4. **Stripe API Keys:**
   - Log into Stripe Dashboard
   - Regenerate API keys
   - Update in secrets file

5. **JWT Secret:**
   ```bash
   # Generate new secret
   openssl rand -hex 32
   # Update in secrets file
   ```

6. **Redis Password:**
   ```bash
   # Edit Redis config
   sudo nano /etc/redis/redis.conf
   # Set: requirepass NEW_STRONG_PASSWORD
   sudo systemctl restart redis
   ```

### Verification

```bash
# Check application starts
sudo systemctl status admin-panel-backend

# Check logs
sudo journalctl -u admin-panel-backend -f

# Test API
curl http://localhost:8080/health
```

---

## 3. Harden SSH Access

### Prerequisites

- SSH key access already configured
- Root or sudo access
- Backup of current SSH config

### Step 1: Generate SSH key (if not done)

**On your local machine:**

```bash
# Generate SSH key
ssh-keygen -t ed25519 -C "your_email@example.com"

# Copy to server
ssh-copy-id user@your-server-ip

# Test connection
ssh user@your-server-ip
```

### Step 2: Run hardening script

**On your server:**

```bash
# Upload script to server first
scp scripts/harden-ssh.sh user@server:/tmp/

# SSH into server
ssh user@server

# Run script
chmod +x /tmp/harden-ssh.sh
sudo /tmp/harden-ssh.sh
```

The script will:
- Backup SSH configuration
- Disable password authentication
- Enable SSH key authentication only
- Optionally change SSH port
- Install and configure fail2ban
- Configure firewall

### Step 3: Manual configuration (if script fails)

```bash
# 1. Backup SSH config
sudo cp /etc/ssh/sshd_config /etc/ssh/sshd_config.backup

# 2. Edit SSH config
sudo nano /etc/ssh/sshd_config
```

**Update these settings:**

```
PasswordAuthentication no
PubkeyAuthentication yes
PermitRootLogin no
PermitEmptyPasswords no
MaxAuthTries 3
ClientAliveInterval 300
ClientAliveCountMax 2
X11Forwarding no
```

**Optional: Change SSH port**

```
Port 2222  # Change from 22 to something else
```

```bash
# 3. Test configuration
sudo sshd -t

# 4. Restart SSH (keep terminal open!)
sudo systemctl restart sshd

# 5. Test in NEW terminal before closing this one!
```

### Step 4: Install and configure fail2ban

```bash
# Install
sudo apt-get update
sudo apt-get install -y fail2ban

# Configure
sudo nano /etc/fail2ban/jail.local
```

**Add this configuration:**

```ini
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[sshd]
enabled = true
port = 22  # Or your custom port
filter = sshd
logpath = /var/log/auth.log
maxretry = 3
bantime = 7200
```

```bash
# Start fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
sudo systemctl status fail2ban

# Check status
sudo fail2ban-client status sshd
```

### Step 5: Configure firewall

**Using UFW:**

```bash
# Allow SSH (use your port if changed)
sudo ufw allow 22/tcp comment 'SSH'
# Or: sudo ufw allow 2222/tcp comment 'SSH'

# Allow web traffic
sudo ufw allow 80/tcp comment 'HTTP'
sudo ufw allow 443/tcp comment 'HTTPS'

# Allow application
sudo ufw allow 8080/tcp comment 'Admin Panel Backend'

# Enable firewall
sudo ufw enable
sudo ufw status
```

**Using firewalld:**

```bash
sudo firewall-cmd --permanent --add-service=ssh
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --permanent --add-port=8080/tcp
sudo firewall-cmd --reload
sudo firewall-cmd --list-all
```

### Step 6: Monitor SSH access

```bash
# Use the monitoring script
ssh-monitor.sh

# Or manually check
last -n 20
sudo fail2ban-client status sshd
sudo ufw status
```

### Verification Checklist

- [ ] SSH key authentication works
- [ ] Password authentication is disabled
- [ ] Root login is disabled
- [ ] fail2ban is running and banning IPs
- [ ] Firewall is configured and active
- [ ] SSH port changed (if applicable)
- [ ] Can still access server via SSH

---

## 🔄 Complete Implementation Checklist

### Phase 1: Immediate (Today)

- [ ] **Rotate all exposed credentials:**
  - [ ] Database password
  - [ ] Twilio credentials
  - [ ] Firebase private key
  - [ ] Stripe API keys
  - [ ] JWT secret
  - [ ] Redis password

- [ ] **Clean git history:**
  - [ ] Install git-filter-repo or BFG
  - [ ] Run cleanup script
  - [ ] Coordinate with team
  - [ ] Force push (after team coordination)

- [ ] **Set up secrets management:**
  - [ ] Create `/etc/secrets/admin-panel-backend.env`
  - [ ] Add all NEW credentials
  - [ ] Set proper permissions (600)
  - [ ] Update application to use secrets file
  - [ ] Remove `.env` files from server

### Phase 2: Within 24 Hours

- [ ] **Harden SSH:**
  - [ ] Generate SSH keys
  - [ ] Run hardening script
  - [ ] Install fail2ban
  - [ ] Configure firewall
  - [ ] Test SSH access

- [ ] **Verify everything works:**
  - [ ] Application starts
  - [ ] Database connections work
  - [ ] External APIs work (Twilio, Stripe, etc.)
  - [ ] SSH access works
  - [ ] No `.env` files on server

### Phase 3: Ongoing

- [ ] Set up monitoring and alerts
- [ ] Regular security audits
- [ ] Keep dependencies updated
- [ ] Regular credential rotation
- [ ] Review access logs

---

## 🆘 Troubleshooting

### Git History Cleanup Issues

**Problem:** Team members can't pull after force push

**Solution:**
```bash
git fetch origin
git reset --hard origin/main
```

### Secrets Not Loading

**Problem:** Application can't read secrets file

**Solution:**
```bash
# Check permissions
ls -la /etc/secrets/admin-panel-backend.env
# Should be: -rw------- (600)

# Check ownership
sudo chown root:root /etc/secrets/admin-panel-backend.env
sudo chmod 600 /etc/secrets/admin-panel-backend.env

# Check service file
sudo systemctl cat admin-panel-backend
# Should have: EnvironmentFile=/etc/secrets/admin-panel-backend.env
```

### SSH Locked Out

**Problem:** Can't SSH into server after hardening

**Solution:**
```bash
# If you have console access (DigitalOcean web console):
sudo cp /etc/ssh/sshd_config.backup.* /etc/ssh/sshd_config
sudo systemctl restart sshd

# Then fix the configuration properly
```

### fail2ban Not Working

**Problem:** fail2ban not banning IPs

**Solution:**
```bash
# Check status
sudo fail2ban-client status sshd

# Check logs
sudo tail -f /var/log/fail2ban.log

# Manually ban an IP (for testing)
sudo fail2ban-client set sshd banip <IP_ADDRESS>
```

---

## 📞 Support

If you encounter issues:

1. Check the troubleshooting section above
2. Review logs: `sudo journalctl -u admin-panel-backend -f`
3. Verify file permissions and ownership
4. Test each component individually

---

**Last Updated:** January 26, 2026
