#!/bin/bash

# Setup script for Bear MCP GitHub repository

echo "🐻 Bear MCP GitHub Setup Script"
echo "================================"

# Get GitHub username
read -p "Enter your GitHub username: " GITHUB_USERNAME

if [ -z "$GITHUB_USERNAME" ]; then
    echo "❌ GitHub username cannot be empty"
    exit 1
fi

echo "📝 Updating files with GitHub username: $GITHUB_USERNAME"

# Update all files with the GitHub username
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    find . -type f -name "*.md" -o -name "*.json" | grep -v node_modules | grep -v .git | xargs sed -i '' "s/YOUR_USERNAME/$GITHUB_USERNAME/g"
else
    # Linux
    find . -type f -name "*.md" -o -name "*.json" | grep -v node_modules | grep -v .git | xargs sed -i "s/YOUR_USERNAME/$GITHUB_USERNAME/g"
fi

echo "✅ Files updated successfully"

# Commit the changes
echo "📦 Committing changes..."
git add -A
git commit -m "Update repository with GitHub username: $GITHUB_USERNAME"

# Create initial release tag
echo "🏷️  Creating release tag v0.1.0..."
git tag -a v0.1.0 -m "Initial release of Bear MCP

Features:
- Full Bear app integration via x-callback-url
- Create, open, and search notes
- Manage tags
- Archive and trash notes
- Import web content"

echo "✅ Tag created successfully"

# Show next steps
echo ""
echo "🚀 Next Steps:"
echo "=============="
echo ""
echo "1. Create the GitHub repository:"
echo "   gh repo create bear-mcp --public --source=. --remote=origin --push"
echo ""
echo "   OR manually create on GitHub.com and run:"
echo "   git remote add origin https://github.com/$GITHUB_USERNAME/bear-mcp.git"
echo "   git push -u origin main"
echo "   git push origin v0.1.0"
echo ""
echo "2. If you want to publish to npm:"
echo "   npm login"
echo "   npm publish"
echo ""
echo "3. Configure GitHub repository settings:"
echo "   - Enable GitHub Actions"
echo "   - Set up branch protection for 'main'"
echo "   - Add repository topics: mcp, bear-app, typescript"
echo ""
echo "4. Create a GitHub release:"
echo "   gh release create v0.1.0 --title \"v0.1.0 - Initial Release\" --notes \"Initial release of Bear MCP with full Bear app integration\""
echo ""
echo "✨ Your Bear MCP server is ready to share with the world!"