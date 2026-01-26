#!/bin/bash

# Script to clean .env files from git history
# WARNING: This will rewrite git history. Coordinate with your team before running!

set -e

echo "⚠️  WARNING: This script will rewrite git history!"
echo "⚠️  Make sure you coordinate with your team before proceeding!"
echo ""
echo "This script will:"
echo "  1. Remove .env files from entire git history"
echo "  2. Remove .env.backup files from entire git history"
echo "  3. Force push to remote (you'll need to confirm)"
echo ""
read -p "Are you sure you want to continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Aborted."
    exit 1
fi

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo "❌ Error: Not in a git repository"
    exit 1
fi

# Check if git-filter-repo is installed
if ! command -v git-filter-repo &> /dev/null; then
    echo "❌ git-filter-repo is not installed"
    echo ""
    echo "Installing git-filter-repo..."
    echo ""
    echo "Option 1: Install via pip (recommended)"
    echo "  pip install git-filter-repo"
    echo ""
    echo "Option 2: Install via Homebrew (macOS)"
    echo "  brew install git-filter-repo"
    echo ""
    echo "Option 3: Use BFG Repo-Cleaner instead"
    echo "  See: scripts/clean-git-history-bfg.sh"
    exit 1
fi

echo ""
echo "📋 Creating backup branch..."
git branch backup-before-cleanup-$(date +%Y%m%d-%H%M%S) || true

echo ""
echo "🧹 Removing .env files from git history..."
git filter-repo \
    --path backend/.env \
    --path admin-panel/.env \
    --path backend/.env.backup \
    --path admin-panel/.env.backup \
    --path .env \
    --path .env.local \
    --path backend/.env.local \
    --path admin-panel/.env.local \
    --invert-paths \
    --force

echo ""
echo "✅ Git history cleaned!"
echo ""

# Check if remote exists
REMOTE_NAME="origin"
if ! git remote | grep -q "^${REMOTE_NAME}$"; then
    echo "⚠️  No remote 'origin' configured."
    echo ""
    echo "You have a few options:"
    echo "  1. Add a remote and push later"
    echo "  2. Skip pushing (history is cleaned locally)"
    echo ""
    read -p "Do you want to add a remote now? (yes/no): " add_remote
    
    if [ "$add_remote" == "yes" ]; then
        read -p "Enter remote URL (e.g., https://github.com/user/repo.git or git@github.com:user/repo.git): " remote_url
        if [ -n "$remote_url" ]; then
            git remote add origin "$remote_url"
            echo "✅ Remote 'origin' added: $remote_url"
            REMOTE_NAME="origin"
        else
            echo "⏸️  No URL provided. Skipping remote setup."
            echo ""
            echo "📝 To add a remote later, run:"
            echo "   git remote add origin <repository-url>"
            echo ""
            echo "✅ Git history has been cleaned locally."
            echo "   You can push later after adding a remote."
            exit 0
        fi
    else
        echo ""
        echo "✅ Git history has been cleaned locally."
        echo "📝 To push later, first add a remote:"
        echo "   git remote add origin <repository-url>"
        echo "   git push origin --force --all"
        echo "   git push origin --force --tags"
        exit 0
    fi
fi

echo "📝 Next steps:"
echo "  1. Review the changes: git log --all"
echo "  2. Test your application to ensure everything still works"
echo "  3. Coordinate with your team"
echo "  4. Force push to remote:"
echo "     git push ${REMOTE_NAME} --force --all"
echo "     git push ${REMOTE_NAME} --force --tags"
echo ""
echo "⚠️  IMPORTANT: After force pushing, all team members must:"
echo "  1. Delete their local repository"
echo "  2. Clone fresh: git clone <repository-url>"
echo "  3. Or reset their local: git fetch ${REMOTE_NAME} && git reset --hard ${REMOTE_NAME}/main"
echo ""

read -p "Do you want to force push now? (yes/no): " push_confirm

if [ "$push_confirm" == "yes" ]; then
    echo ""
    echo "🚀 Force pushing to remote '${REMOTE_NAME}'..."
    
    # Check if remote is accessible
    if ! git ls-remote "${REMOTE_NAME}" > /dev/null 2>&1; then
        echo "❌ Error: Cannot access remote '${REMOTE_NAME}'"
        echo "   Please check:"
        echo "   1. Remote URL is correct: git remote -v"
        echo "   2. You have access to the repository"
        echo "   3. Network connection is working"
        echo ""
        echo "⏸️  Skipping push. You can push manually later."
    else
        git push "${REMOTE_NAME}" --force --all
        git push "${REMOTE_NAME}" --force --tags
        echo ""
        echo "✅ Done! Git history has been cleaned and pushed."
        echo "⚠️  Notify your team immediately to re-clone or reset their repositories!"
    fi
else
    echo ""
    echo "⏸️  Skipped force push. Run manually when ready:"
    echo "   git push ${REMOTE_NAME} --force --all"
    echo "   git push ${REMOTE_NAME} --force --tags"
fi

echo ""
echo "✅ Cleanup complete!"
