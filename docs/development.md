# Development Guide

Guide for contributing to and developing the Fractal SDK.

## Setup

### Prerequisites

- Node.js 18+
- npm 10+
- Git

### Installation

```bash
# Clone the repository
git clone https://github.com/fractal-mcp/sdk.git
cd sdk

# Install dependencies
npm install

# Build all packages
npm run build
```

## Project Structure

```
sdk/
├── packages/
│   ├── OpenAI Apps SDK:
│   │   ├── oai-hooks/      # UI hooks for ChatGPT widgets
│   │   ├── oai-server/     # Server toolkit for MCP with widgets
│   │   └── oai-preview/    # Dev/testing tool
│   ├── MCP-UI:
│   │   ├── shared-ui/      # RPC layer for iframe communication
│   │   ├── mcp-ui-messenger/ # MCP-UI compatible messenger
│   │   └── mcp-ui-hooks/   # React hooks for MCP-UI
│   ├── Bundling:
│   │   ├── bundle/         # Bundling library
│   │   └── cli/            # CLI tools
│   └── Server Utilities:
│       └── mcp-express/    # Express utilities
└── apps/
    └── examples/           # Example applications
```

## Development Workflow

### Building

```bash
# Build all packages
npm run build

# Build in watch mode
npm run dev
```

### Testing

```bash
# Run all tests
npm test

# Run tests for a specific package
cd packages/[package-name]
npm test
```

### Linting

```bash
# Check for linting errors
npm run lint

# Fix linting errors automatically
npm run lint:fix
```

### Clean Build Artifacts

```bash
npm run clean
```

## Working with the Monorepo

This project uses npm workspaces and Turborepo for managing the monorepo.

### Adding Dependencies

```bash
# Add a dependency to a specific package
cd packages/[package-name]
npm install [package-name]

# Add a dev dependency to the root
npm install -D [package-name] -w [workspace-name]
```

### Creating a New Package

1. Create a new directory in `packages/`
2. Initialize with `package.json`:
   ```json
   {
     "name": "@fractal-mcp/[package-name]",
     "version": "1.0.0",
     "main": "dist/index.js",
     "types": "dist/index.d.ts",
     "scripts": {
       "build": "tsc",
       "test": "jest"
     }
   }
   ```
3. Add to root `package.json` workspaces if needed
4. Update `turbo.json` if the package needs special build configuration

### Updating Package Versions

```bash
# Update versions across all packages
npm run version:update
```

## Publishing

Each package can be published independently to npm:

```bash
# Navigate to the package
cd packages/[package-name]

# Build the package
npm run build

# Publish to npm
npm publish
```

### Publishing Checklist

- [ ] All tests pass (`npm test`)
- [ ] Linting passes (`npm run lint`)
- [ ] Documentation is up to date
- [ ] Version number is bumped in `package.json`
- [ ] CHANGELOG is updated (if applicable)
- [ ] Package builds successfully (`npm run build`)

## Code Style

### Conventions

- Use TypeScript for all new code
- Follow existing code style (enforced by ESLint)
- Write tests for new features
- Update documentation for API changes

### Commit Messages

This project follows [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Test changes
- `chore`: Build process or tooling changes

**Examples:**
```
feat(oai-hooks): add useWidgetLayout hook
fix(bundle): resolve circular dependency issue
docs: update Quick Start guide
```

## Testing

### Unit Tests

```bash
# Run all unit tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm test -- --coverage
```

### Integration Tests

Integration tests are located in the `apps/examples` directory and test the full stack integration.

```bash
cd apps/examples/oai-apps
npm test
```

### Testing Widgets Locally

Use `@fractal-mcp/oai-preview` to test widgets during development:

```tsx
import { WidgetDisplayComponent } from "@fractal-mcp/oai-preview";

<WidgetDisplayComponent
  htmlSnippet={widgetHtml}
  toolInput={{ /* your test input */ }}
  toolOutput={{ /* your test output */ }}
  onToolCall={async (name, params) => {
    console.log('Tool called:', name, params);
  }}
/>
```

## Troubleshooting

### Build Issues

**Problem:** TypeScript compilation errors

```bash
# Clean and rebuild
npm run clean
npm run build
```

**Problem:** Dependency issues

```bash
# Clean node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Test Issues

**Problem:** Tests failing after changes

```bash
# Update snapshots if needed
npm test -- -u
```

## Contributing

### Pull Request Process

1. Fork the repository
2. Create a feature branch (`git checkout -b feat/amazing-feature`)
3. Make your changes
4. Write/update tests
5. Update documentation
6. Commit your changes using Conventional Commits
7. Push to your fork (`git push origin feat/amazing-feature`)
8. Open a Pull Request

### PR Guidelines

- Ensure all tests pass
- Follow the existing code style
- Update documentation for API changes
- Keep PRs focused on a single feature/fix
- Write clear commit messages
- Link related issues in the PR description

### Code Review

All PRs require review before merging. Reviewers will check:

- Code quality and style
- Test coverage
- Documentation
- Breaking changes
- Performance implications

## Resources

### Documentation

- [Quick Start](../README.md#quick-start)
- [How It Works](./how-it-works.md)
- [Package Reference](./packages.md)

### External Resources

- [Model Context Protocol](https://modelcontextprotocol.io/)
- [OpenAI Apps SDK](https://developers.openai.com/apps-sdk/)
- [MCP-UI Protocol](https://mcpui.dev/guide/embeddable-ui)
- [Turborepo Documentation](https://turbo.build/repo/docs)

## Getting Help

- Open an issue on [GitHub](https://github.com/fractal-mcp/sdk/issues)
- Check existing [discussions](https://github.com/fractal-mcp/sdk/discussions)
- Review the [documentation](./README.md)

## License

By contributing to Fractal SDK, you agree that your contributions will be licensed under the Apache License, Version 2.0.
