
# Anonymous Library Monorepo

## Fractal CLI 
I did so much shit that I'm not sure this will 100% actually work but 
```bash
npm i

npm run build

npx fractal bundle \
    -e ~/code/spectre-mcp-servers/src/weather/ui/src/components/Test.tsx \
    -d ./wowpuppies 


npx fractal render \
    -e ./wowpuppies/Component.jsx \
    -c ./wowpuppies/index.css \
    -d "$(cat testdata.json | jq -c .)" \
    -o ./test.html
```

## Publishing

To publish the Fractal CLI to GitHub Package Registry:

1. **Build the package:**
   ```bash
   cd packages/cli
   npm run build
   ```

2. **Publish to GitHub Package Registry:**
   ```bash
   npm publish
   ```

### Authentication

Make sure you're authenticated with GitHub Package Registry:
```bash
npm login --registry=https://npm.pkg.github.com/
```

Use your GitHub username and a GitHub Personal Access Token (with `write:packages` permission) as the password.

### Installing from GitHub Package Registry

Team members can install the CLI globally:
```bash
npm install -g @fractal-mcp/cli
```

Or use it directly:
```bash
npx @fractal-mcp/cli --help
```

**Note:** The package is private to the `@fractal` organization and requires authentication to install.

### Automated Publishing

Use the GitHub action to publish all packages:

1. Go to **Actions** → **Publish Packages** in your GitHub repository
2. Click **Run workflow**
3. Fill in the required fields:
   - **Version**: (e.g., `2.0.11`)
   - **Title**: (e.g., `"Major CLI Updates"`)
   - **Release Notes**: (describe what changed)
4. Click **Run workflow**

The action will:
- ✅ Build all packages
- ✅ Resolve workspace dependencies (`*` → actual versions)
- ✅ Remove turbo references
- ✅ Publish in correct dependency order
- ✅ Create standalone packages without monorepo dependencies
- ✅ Create a GitHub release with your title and notes

This is a [Turborepo](https://turbo.build/repo) monorepo.

## Getting Started

This monorepo is set up with:
- **Turborepo** for build orchestration and caching
- **npm workspaces** for package management
- Basic pipeline configuration in `turbo.json`

## Structure

- `apps/` - Your applications
- `packages/` - Shared packages and libraries

## Available Scripts

- `npm run build` - Build all packages and apps
- `npm run dev` - Start development mode for all packages and apps
- `npm run lint` - Lint all packages and apps
- `npm run test` - Run tests for all packages and apps
- `npm run clean` - Clean build artifacts

## Adding Apps and Packages

Create new apps in the `apps/` directory and packages in the `packages/` directory. Each should have its own `package.json` with appropriate scripts that match the pipeline defined in `turbo.json`.

## Learn More

- [Turborepo Documentation](https://turbo.build/repo/docs)
- [npm Workspaces](https://docs.npmjs.com/cli/v7/using-npm/workspaces)