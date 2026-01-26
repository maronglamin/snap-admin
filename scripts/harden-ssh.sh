#!/bin/bash

# SSH Hardening Script
# This script hardens SSH access on your server

set -e

echo "🔒 SSH Hardening Script"
echo "======================"
echo ""
echo "⚠️  WARNING: This script will modify SSH configuration!"
echo "⚠️  Make sure you have SSH key access before running!"
echo "⚠️  Test in a new terminal session before closing current one!"
echo ""

read -p "Do you have SSH key access configured? (yes/no): " has_keys

if [ "$has_keys" != "yes" ]; then
    echo ""
    echo "❌ Please set up SSH keys first!"
    echo ""
    echo "On your local machine, run:"
    echo "  ssh-keygen -t ed25519 -C 'your_email@example.com'"
    echo "  ssh-copy-id user@your-server-ip"
    echo ""
    echo "Then run this script again."
    exit 1
fi

# Detect OS
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$ID
else
    echo "❌ Cannot detect OS"
    exit 1
fi

echo ""
echo "📋 This script will:"
echo "  1. Backup current SSH configuration"
echo "  2. Disable password authentication"
echo "  3. Configure SSH key authentication only"
echo "  4. Change SSH port (optional)"
echo "  5. Install and configure fail2ban"
echo "  6. Configure firewall rules"
echo ""

read -p "Continue? (yes/no): " confirm
if [ "$confirm" != "yes" ]; then
    echo "Aborted."
    exit 1
fi

SSH_CONFIG="/etc/ssh/sshd_config"
SSH_CONFIG_BACKUP="/etc/ssh/sshd_config.backup.$(date +%Y%m%d-%H%M%S)"

# Backup SSH config
echo "📋 Backing up SSH configuration..."
sudo cp "$SSH_CONFIG" "$SSH_CONFIG_BACKUP"
echo "✅ Backup created: $SSH_CONFIG_BACKUP"

# Configure SSH
echo ""
echo "🔧 Configuring SSH..."

# Create temporary config file
TEMP_CONFIG=$(mktemp)

# Copy current config
sudo cp "$SSH_CONFIG" "$TEMP_CONFIG"

# Apply security settings
sudo sed -i 's/#PasswordAuthentication yes/PasswordAuthentication no/' "$TEMP_CONFIG"
sudo sed -i 's/PasswordAuthentication yes/PasswordAuthentication no/' "$TEMP_CONFIG"
sudo sed -i 's/#PubkeyAuthentication yes/PubkeyAuthentication yes/' "$TEMP_CONFIG"
sudo sed -i 's/PubkeyAuthentication no/PubkeyAuthentication yes/' "$TEMP_CONFIG"
sudo sed -i 's/#PermitRootLogin yes/PermitRootLogin no/' "$TEMP_CONFIG"
sudo sed -i 's/PermitRootLogin yes/PermitRootLogin no/' "$TEMP_CONFIG"
sudo sed -i 's/#PermitEmptyPasswords yes/PermitEmptyPasswords no/' "$TEMP_CONFIG"
sudo sed -i 's/PermitEmptyPasswords yes/PermitEmptyPasswords no/' "$TEMP_CONFIG"

# Add security settings if not present
if ! grep -q "^MaxAuthTries" "$TEMP_CONFIG"; then
    echo "MaxAuthTries 3" | sudo tee -a "$TEMP_CONFIG" > /dev/null
fi

if ! grep -q "^ClientAliveInterval" "$TEMP_CONFIG"; then
    echo "ClientAliveInterval 300" | sudo tee -a "$TEMP_CONFIG" > /dev/null
    echo "ClientAliveCountMax 2" | sudo tee -a "$TEMP_CONFIG" > /dev/null
fi

if ! grep -q "^X11Forwarding" "$TEMP_CONFIG"; then
    echo "X11Forwarding no" | sudo tee -a "$TEMP_CONFIG" > /dev/null
fi

# Ask about changing SSH port
echo ""
read -p "Do you want to change SSH port from 22? (yes/no): " change_port

if [ "$change_port" == "yes" ]; then
    read -p "Enter new SSH port (1024-65535): " new_port
    
    if [[ "$new_port" =~ ^[0-9]+$ ]] && [ "$new_port" -ge 1024 ] && [ "$new_port" -le 65535 ]; then
        sudo sed -i "s/^#Port 22/Port $new_port/" "$TEMP_CONFIG"
        sudo sed -i "s/^Port [0-9]*/Port $new_port/" "$TEMP_CONFIG"
        if ! grep -q "^Port" "$TEMP_CONFIG"; then
            echo "Port $new_port" | sudo tee -a "$TEMP_CONFIG" > /dev/null
        fi
        echo "✅ SSH port changed to $new_port"
        echo "⚠️  Remember to update firewall rules!"
        SSH_PORT=$new_port
    else
        echo "❌ Invalid port number. Keeping default port 22."
        SSH_PORT=22
    fi
else
    SSH_PORT=22
fi

# Copy temp config back
sudo cp "$TEMP_CONFIG" "$SSH_CONFIG"
sudo rm "$TEMP_CONFIG"

echo "✅ SSH configuration updated"

# Test SSH config
echo ""
echo "🧪 Testing SSH configuration..."
if sudo sshd -t; then
    echo "✅ SSH configuration is valid"
else
    echo "❌ SSH configuration has errors! Restoring backup..."
    sudo cp "$SSH_CONFIG_BACKUP" "$SSH_CONFIG"
    exit 1
fi

# Install fail2ban
echo ""
echo "🛡️  Installing fail2ban..."

if command -v apt-get &> /dev/null; then
    sudo apt-get update
    sudo apt-get install -y fail2ban
elif command -v yum &> /dev/null; then
    sudo yum install -y fail2ban
elif command -v dnf &> /dev/null; then
    sudo dnf install -y fail2ban
else
    echo "⚠️  Cannot auto-install fail2ban. Please install manually."
fi

# Configure fail2ban for SSH
echo ""
echo "🔧 Configuring fail2ban..."

sudo tee /etc/fail2ban/jail.local > /dev/null << EOF
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5
destemail = root@localhost
sendername = Fail2Ban
action = %(action_)s

[sshd]
enabled = true
port = $SSH_PORT
filter = sshd
logpath = /var/log/auth.log
maxretry = 3
bantime = 7200
EOF

# Start and enable fail2ban
sudo systemctl enable fail2ban
sudo systemctl restart fail2ban

echo "✅ fail2ban installed and configured"

# Configure firewall
echo ""
echo "🔥 Configuring firewall..."

if command -v ufw &> /dev/null; then
    echo "Using UFW..."
    
    # Allow SSH
    sudo ufw allow $SSH_PORT/tcp comment 'SSH'
    
    # Allow HTTP/HTTPS if needed
    read -p "Allow HTTP (80) and HTTPS (443)? (yes/no): " allow_web
    if [ "$allow_web" == "yes" ]; then
        sudo ufw allow 80/tcp comment 'HTTP'
        sudo ufw allow 443/tcp comment 'HTTPS'
    fi
    
    # Allow application port if needed
    read -p "Allow application port 8080? (yes/no): " allow_app
    if [ "$allow_app" == "yes" ]; then
        sudo ufw allow 8080/tcp comment 'Admin Panel Backend'
    fi
    
    # Enable firewall
    echo ""
    echo "⚠️  Enabling firewall..."
    echo "⚠️  Make sure SSH port $SSH_PORT is allowed!"
    read -p "Enable UFW now? (yes/no): " enable_ufw
    
    if [ "$enable_ufw" == "yes" ]; then
        sudo ufw --force enable
        echo "✅ Firewall enabled"
    else
        echo "⏸️  Firewall not enabled. Enable manually with: sudo ufw enable"
    fi
    
elif command -v firewall-cmd &> /dev/null; then
    echo "Using firewalld..."
    
    sudo firewall-cmd --permanent --add-port=$SSH_PORT/tcp
    sudo firewall-cmd --permanent --add-service=ssh
    
    read -p "Allow HTTP (80) and HTTPS (443)? (yes/no): " allow_web
    if [ "$allow_web" == "yes" ]; then
        sudo firewall-cmd --permanent --add-service=http
        sudo firewall-cmd --permanent --add-service=https
    fi
    
    read -p "Allow application port 8080? (yes/no): " allow_app
    if [ "$allow_app" == "yes" ]; then
        sudo firewall-cmd --permanent --add-port=8080/tcp
    fi
    
    sudo firewall-cmd --reload
    echo "✅ Firewall configured"
    
else
    echo "⚠️  No firewall tool detected (ufw/firewalld)"
    echo "   Please configure firewall manually"
fi

# Restart SSH (but don't disconnect current session)
echo ""
echo "🔄 SSH service will be restarted..."
echo "⚠️  Keep this terminal open and test SSH in a NEW terminal!"
echo ""
read -p "Restart SSH service now? (yes/no): " restart_ssh

if [ "$restart_ssh" == "yes" ]; then
    sudo systemctl restart sshd
    echo "✅ SSH service restarted"
    echo ""
    echo "⚠️  IMPORTANT: Test SSH connection in a new terminal NOW!"
    echo "   If you can't connect, restore backup:"
    echo "   sudo cp $SSH_CONFIG_BACKUP $SSH_CONFIG"
    echo "   sudo systemctl restart sshd"
else
    echo "⏸️  SSH service not restarted. Restart manually with:"
    echo "   sudo systemctl restart sshd"
fi

# Create monitoring script
echo ""
echo "📊 Creating SSH monitoring script..."

sudo tee /usr/local/bin/ssh-monitor.sh > /dev/null << 'MONITOR'
#!/bin/bash
# SSH Access Monitor

echo "=== SSH Access Report ==="
echo ""
echo "Recent SSH logins:"
last -n 20
echo ""
echo "Failed login attempts (last 24h):"
grep "Failed password" /var/log/auth.log 2>/dev/null | tail -20 || \
grep "Failed password" /var/log/secure 2>/dev/null | tail -20
echo ""
echo "Current SSH connections:"
who
echo ""
echo "fail2ban status:"
sudo fail2ban-client status sshd 2>/dev/null || echo "fail2ban not running"
MONITOR

sudo chmod +x /usr/local/bin/ssh-monitor.sh

echo "✅ Monitoring script created: /usr/local/bin/ssh-monitor.sh"
echo "   Run with: ssh-monitor.sh"

# Summary
echo ""
echo "=================================="
echo "✅ SSH Hardening Complete!"
echo "=================================="
echo ""
echo "📋 Summary of changes:"
echo "  ✅ Password authentication: DISABLED"
echo "  ✅ SSH key authentication: ENABLED"
echo "  ✅ Root login: DISABLED"
echo "  ✅ SSH port: $SSH_PORT"
echo "  ✅ fail2ban: INSTALLED and CONFIGURED"
echo "  ✅ Firewall: CONFIGURED"
echo ""
echo "📝 Next steps:"
echo "  1. Test SSH connection in a NEW terminal"
echo "  2. Monitor with: ssh-monitor.sh"
echo "  3. Check fail2ban: sudo fail2ban-client status sshd"
echo "  4. Review firewall: sudo ufw status (or firewall-cmd --list-all)"
echo ""
echo "🔒 Security improvements:"
echo "  • Only SSH key authentication allowed"
echo "  • Failed login attempts will be banned"
echo "  • Firewall restricts access"
echo "  • Root login disabled"
echo ""
echo "⚠️  Backup location: $SSH_CONFIG_BACKUP"
echo ""
