#!/bin/bash

echo "🐻 Bear MCP GitHub Publishing Script"
echo "===================================="
echo ""
echo "This script will help you publish Bear MCP to GitHub."
echo ""

# Check if gh is authenticated
if ! gh auth status &>/dev/null; then
    echo "📱 GitHub CLI Authentication Required"
    echo "------------------------------------"
    echo "Please run: gh auth login"
    echo "Follow the prompts to authenticate with GitHub"
    echo ""
    echo "After authentication, run this script again."
    exit 1
fi

echo "✅ GitHub CLI is authenticated"
echo ""

# Create the repository
echo "📦 Creating GitHub repository..."
if gh repo create bear-mcp --public --source=. --remote=origin --push; then
    echo "✅ Repository created and pushed successfully!"
else
    echo "⚠️  Repository might already exist. Trying to add remote and push..."
    
    # Check if remote already exists
    if git remote get-url origin &>/dev/null; then
        echo "Remote 'origin' already exists. Pushing changes..."
    else
        git remote add origin https://github.com/philgetzen/bear-mcp.git
    fi
    
    # Push main branch and tags
    git push -u origin main
    git push origin v0.1.0
fi

echo ""
echo "🏷️  Creating GitHub release..."
gh release create v0.1.0 \
    --title "v0.1.0 - Initial Release" \
    --notes "# 🐻 Bear MCP Initial Release

## Features
- Full Bear app integration via x-callback-url
- Create, open, and search notes
- Manage tags (list, open, rename, delete)
- Archive and trash notes
- Import web content
- TypeScript implementation with full type safety

## Installation
See README.md for detailed installation instructions.

## Requirements
- Bear app installed on macOS
- Node.js 18 or higher
- Claude Desktop

## Usage
Once configured in Claude Desktop, you can use commands like:
- 'Use bear to create a new note'
- 'Search for notes about project'
- 'Show all my tags'
"

echo ""
echo "🎯 Setting repository topics..."
gh repo edit --add-topic mcp --add-topic bear-app --add-topic typescript --add-topic nodejs --add-topic claude

echo ""
echo "✨ Success! Your Bear MCP server is now published!"
echo ""
echo "📍 Repository URL: https://github.com/philgetzen/bear-mcp"
echo "📦 To publish to npm: npm login && npm publish"
echo ""
echo "Next steps:"
echo "1. Visit your repository to verify everything is set up"
echo "2. Enable GitHub Actions in repository settings"
echo "3. Consider setting up branch protection for 'main'"
echo "4. Share with the community!"