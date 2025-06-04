# Contributing to Bear MCP

Thank you for your interest in contributing to Bear MCP! This document provides guidelines and instructions for contributing to the project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [How to Contribute](#how-to-contribute)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [Documentation](#documentation)
- [Community](#community)

## Code of Conduct

By participating in this project, you agree to abide by our Code of Conduct:

- Be respectful and inclusive
- Welcome newcomers and help them get started
- Focus on constructive criticism
- Respect differing viewpoints and experiences
- Accept responsibility and apologize for mistakes

## Getting Started

1. Fork the repository on GitHub
2. Clone your fork locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/bear-mcp.git
   cd bear-mcp
   ```
3. Add the upstream repository as a remote:
   ```bash
   git remote add upstream https://github.com/ORIGINAL_OWNER/bear-mcp.git
   ```

## Development Setup

1. Install Node.js (version 18 or higher)
2. Install dependencies:
   ```bash
   npm install
   ```
3. Build the project:
   ```bash
   npm run build
   ```
4. Run tests:
   ```bash
   npm test
   ```

## How to Contribute

### Reporting Bugs

Before creating bug reports, please check existing issues to avoid duplicates. When creating a bug report, include:

- A clear and descriptive title
- Steps to reproduce the issue
- Expected behavior
- Actual behavior
- Environment details (OS, Node.js version, etc.)
- Any relevant logs or error messages

### Suggesting Enhancements

Enhancement suggestions are welcome! Please provide:

- A clear and descriptive title
- Detailed description of the proposed feature
- Use cases and examples
- Any potential drawbacks or considerations

### Code Contributions

1. Choose an issue to work on or create a new one
2. Create a new branch from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. Make your changes following our coding standards
4. Write or update tests as needed
5. Update documentation if necessary
6. Commit your changes with clear, descriptive messages

## Pull Request Process

1. Ensure your code follows the project's coding standards
2. Update the README.md with details of changes if applicable
3. Ensure all tests pass
4. Update documentation as needed
5. Create a pull request with:
   - Clear title and description
   - Reference to related issues
   - Summary of changes
   - Screenshots (if applicable)

### PR Review Process

- PRs require at least one approval from a maintainer
- Address all feedback and requested changes
- Keep PRs focused and atomic
- Resolve merge conflicts promptly

## Coding Standards

### TypeScript Guidelines

- Use TypeScript for all new code
- Enable strict mode
- Provide proper type annotations
- Avoid using `any` type unless absolutely necessary

### Code Style

- Use 2 spaces for indentation
- Use semicolons
- Use single quotes for strings
- Maximum line length: 100 characters
- Use meaningful variable and function names

### File Organization

```
src/
├── index.ts          # Main entry point
├── types/            # TypeScript type definitions
├── utils/            # Utility functions
├── services/         # Service layer
└── __tests__/        # Test files
```

### Commit Messages

Follow the Conventional Commits specification:

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `style:` Code style changes (formatting, etc.)
- `refactor:` Code refactoring
- `test:` Test changes
- `chore:` Build process or auxiliary tool changes

Example: `feat: add support for Bear note templates`

## Testing

- Write tests for all new features
- Maintain test coverage above 80%
- Use descriptive test names
- Test edge cases and error conditions

Run tests with:
```bash
npm test
```

Run tests with coverage:
```bash
npm run test:coverage
```

## Documentation

- Update README.md for user-facing changes
- Add JSDoc comments for public APIs
- Include examples for complex features
- Keep documentation up to date with code changes

## Community

- Join our discussions on GitHub Discussions
- Follow us on Twitter @BearMCP (if applicable)
- Check out our blog for updates

## Questions?

If you have questions about contributing, please:

1. Check existing documentation
2. Search through issues and discussions
3. Ask in GitHub Discussions
4. Contact the maintainers

Thank you for contributing to Bear MCP!