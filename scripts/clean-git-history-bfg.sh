#!/bin/bash

# Alternative script using BFG Repo-Cleaner
# BFG is faster than git-filter-repo for large repositories

set -e

echo "⚠️  WARNING: This script will rewrite git history!"
echo "⚠️  Make sure you coordinate with your team before proceeding!"
echo ""
read -p "Are you sure you want to continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Aborted."
    exit 1
fi

# Check if BFG is installed
if ! command -v bfg &> /dev/null; then
    echo "❌ BFG Repo-Cleaner is not installed"
    echo ""
    echo "Installing BFG Repo-Cleaner..."
    echo ""
    echo "Option 1: Download JAR file (recommended)"
    echo "  wget https://repo1.maven.org/maven2/com/madgag/bfg/1.14.0/bfg-1.14.0.jar"
    echo "  chmod +x bfg-1.14.0.jar"
    echo "  alias bfg='java -jar bfg-1.14.0.jar'"
    echo ""
    echo "Option 2: Install via Homebrew (macOS)"
    echo "  brew install bfg"
    echo ""
    exit 1
fi

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo "❌ Error: Not in a git repository"
    exit 1
fi

echo ""
echo "📋 Creating backup branch..."
git branch backup-before-cleanup-$(date +%Y%m%d-%H%M%S) || true

echo ""
echo "🧹 Removing .env files from git history using BFG..."

# Create a file listing files to delete
cat > /tmp/files-to-delete.txt << EOF
backend/.env
admin-panel/.env
backend/.env.backup
admin-panel/.env.backup
.env
.env.local
backend/.env.local
admin-panel/.env.local
EOF

# Clone a fresh copy for BFG (BFG requires a fresh clone)
REPO_DIR=$(pwd)
TEMP_DIR=$(mktemp -d)
FRESH_CLONE="$TEMP_DIR/fresh-clone"

echo "📦 Creating fresh clone for BFG..."
git clone --mirror "$REPO_DIR" "$FRESH_CLONE"

echo "🧹 Running BFG to delete files..."
cd "$FRESH_CLONE"
bfg --delete-files .env
bfg --delete-files .env.backup
bfg --delete-files .env.local

echo "🧹 Cleaning up..."
git reflog expire --expire=now --all
git gc --prune=now --aggressive

echo "📤 Pushing cleaned history back..."
cd "$REPO_DIR"
git remote set-url origin "$FRESH_CLONE"
git fetch origin
git reset --hard origin/main

# Clean up temp directory
rm -rf "$TEMP_DIR"

echo ""
echo "✅ Git history cleaned!"
echo ""
echo "📝 Next steps:"
echo "  1. Review the changes: git log --all"
echo "  2. Test your application"
echo "  3. Force push to remote:"
echo "     git push origin --force --all"
echo "     git push origin --force --tags"
echo ""

read -p "Do you want to force push now? (yes/no): " push_confirm

if [ "$push_confirm" == "yes" ]; then
    echo ""
    echo "🚀 Force pushing to remote..."
    git push origin --force --all
    git push origin --force --tags
    echo ""
    echo "✅ Done! Notify your team to re-clone!"
else
    echo ""
    echo "⏸️  Skipped force push. Run manually when ready."
fi

echo ""
echo "✅ Cleanup complete!"
