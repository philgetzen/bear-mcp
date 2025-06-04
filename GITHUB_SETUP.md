# Publishing Bear MCP to GitHub

This guide will help you publish the Bear MCP repository to GitHub.

## Prerequisites

- GitHub account
- Git installed and configured with your GitHub credentials
- GitHub CLI (optional but recommended): `brew install gh`

## Step 1: Create a New Repository on GitHub

### Option A: Using GitHub Web Interface

1. Go to https://github.com/new
2. Fill in the repository details:
   - Repository name: `bear-mcp`
   - Description: "MCP server for Bear app integration"
   - Visibility: Choose Public or Private
   - DO NOT initialize with README, .gitignore, or license (we already have these)
3. Click "Create repository"

### Option B: Using GitHub CLI

```bash
gh repo create bear-mcp --public --source=. --remote=origin --push
```

## Step 2: Add Remote and Push (if using Option A)

1. Add the remote repository:
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/bear-mcp.git
   ```
   
   Or if using SSH:
   ```bash
   git remote add origin git@github.com:YOUR_USERNAME/bear-mcp.git
   ```

2. Push the main branch:
   ```bash
   git push -u origin main
   ```

## Step 3: Configure Repository Settings

### Enable GitHub Actions

1. Go to Settings → Actions → General
2. Under "Workflow permissions", select "Read and write permissions"
3. Check "Allow GitHub Actions to create and approve pull requests"
4. Click "Save"

### Set up Branch Protection (Recommended)

1. Go to Settings → Branches
2. Click "Add rule"
3. Branch name pattern: `main`
4. Enable:
   - Require a pull request before merging
   - Require status checks to pass before merging
   - Require branches to be up to date before merging
   - Include administrators (optional)
5. Click "Create"

### Add Secrets for CI/CD

1. Go to Settings → Secrets and variables → Actions
2. Add the following secrets:
   - `NPM_TOKEN`: Your npm access token (if publishing to npm)
   - `CODECOV_TOKEN`: Your Codecov token (if using code coverage)

## Step 4: Update Configuration Files

### Update package.json

Replace placeholders in package.json:
```json
{
  "repository": {
    "type": "git",
    "url": "git+https://github.com/YOUR_USERNAME/bear-mcp.git"
  },
  "bugs": {
    "url": "https://github.com/YOUR_USERNAME/bear-mcp/issues"
  },
  "homepage": "https://github.com/YOUR_USERNAME/bear-mcp#readme"
}
```

### Update Dependabot Configuration

Edit `.github/dependabot.yml` and replace `YOUR_GITHUB_USERNAME` with your actual GitHub username.

### Update README.md

Add badges to your README.md:
```markdown
![CI/CD](https://github.com/YOUR_USERNAME/bear-mcp/workflows/CI%2FCD%20Pipeline/badge.svg)
![License](https://img.shields.io/github/license/YOUR_USERNAME/bear-mcp)
![npm version](https://img.shields.io/npm/v/bear-mcp)
```

## Step 5: Create Initial Release

### Using GitHub Web Interface

1. Go to your repository page
2. Click on "Releases" → "Create a new release"
3. Choose a tag: `v0.1.0`
4. Release title: `v0.1.0 - Initial Release`
5. Describe the release features
6. Click "Publish release"

### Using GitHub CLI

```bash
git tag -a v0.1.0 -m "Initial release"
git push origin v0.1.0
gh release create v0.1.0 --title "v0.1.0 - Initial Release" --notes "Initial release of Bear MCP"
```

## Step 6: Verify Setup

1. Check that GitHub Actions workflows are running:
   - Go to Actions tab in your repository
   - Verify CI/CD Pipeline is running

2. Check branch protection:
   - Try to push directly to main (should fail if protection is enabled)
   - Create a test PR to verify checks

3. Verify Dependabot:
   - Go to Insights → Dependency graph → Dependabot
   - Ensure it's enabled and configured

## Additional Setup (Optional)

### Enable GitHub Pages for Documentation

1. Go to Settings → Pages
2. Source: Deploy from a branch
3. Branch: main, folder: /docs (if you have docs)
4. Click Save

### Set up Issue Labels

Run this script to create useful labels:
```bash
gh label create "good first issue" --description "Good for newcomers" --color 7057ff
gh label create "help wanted" --description "Extra attention is needed" --color 008672
gh label create "priority: high" --description "High priority" --color d93f0b
gh label create "priority: medium" --description "Medium priority" --color fbca04
gh label create "priority: low" --description "Low priority" --color 0e8a16
```

### Add Topics to Repository

1. Go to repository main page
2. Click the gear icon next to "About"
3. Add topics: `mcp`, `bear-app`, `typescript`, `nodejs`

## Troubleshooting

### Permission Denied

If you get permission denied when pushing:
1. Check your Git credentials: `git config --list`
2. Update remote URL if needed: `git remote set-url origin YOUR_REPO_URL`
3. Ensure you have push access to the repository

### Actions Not Running

If GitHub Actions are not running:
1. Check Actions tab for any error messages
2. Verify workflows are in `.github/workflows/`
3. Check repository settings for Actions permissions

### NPM Publishing Fails

If npm publishing fails in CI:
1. Verify NPM_TOKEN secret is set correctly
2. Ensure package.json has correct publish configuration
3. Check npm account has publish permissions

## Next Steps

1. Update the README.md with actual project information
2. Add comprehensive tests
3. Set up code coverage reporting
4. Create detailed API documentation
5. Plan your first feature release

## Useful Commands

```bash
# Check remote configuration
git remote -v

# View recent commits
git log --oneline -10

# Check workflow runs
gh run list

# View repository info
gh repo view

# Create an issue
gh issue create --title "Issue title" --body "Issue description"

# Create a PR
gh pr create --title "PR title" --body "PR description"
```

Remember to star your repository and share it with the community!