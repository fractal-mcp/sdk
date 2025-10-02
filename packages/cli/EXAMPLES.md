# CLI Examples

## Bundle a React Component

Bundle a standalone React component into a self-contained HTML file:

```bash
npx @fractal-mcp/cli bundle \
  --entrypoint=src/components/MyComponent.tsx \
  --out=dist
```

**Result**: `dist/index.html` - A 188KB self-contained HTML file with your React component

## Bundle an HTML Application

Bundle an entire HTML application with all its dependencies:

```bash
npx @fractal-mcp/cli bundle \
  --entrypoint=public/index.html \
  --out=build
```

**Result**: `build/index.html` - All JavaScript and CSS inlined into one file

## Real-World Example: Hello Component

```bash
# Clone the repo
git clone https://github.com/fractal-mcp/sdk
cd sdk

# Bundle the hello example component
npx @fractal-mcp/cli bundle \
  --entrypoint=apps/examples/mcp-ui/hello-example-react/src/Hello.tsx \
  --out=bundled

# The output is ready to serve!
# bundled/index.html contains everything needed
```

## Using in CI/CD

```yaml
# .github/workflows/build.yml
name: Build UI Components
on: [push]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      
      - name: Bundle component
        run: |
          npx @fractal-mcp/cli bundle \
            --entrypoint=src/MyComponent.tsx \
            --out=dist
      
      - name: Upload artifact
        uses: actions/upload-artifact@v3
        with:
          name: bundled-component
          path: dist/index.html
```

## Using in npm Scripts

Add to your `package.json`:

```json
{
  "scripts": {
    "bundle": "fractal-mcp bundle --entrypoint=src/App.tsx --out=dist",
    "bundle:prod": "fractal-mcp bundle --entrypoint=src/App.tsx --out=production"
  }
}
```

Then run:

```bash
npm run bundle
```

## Using Programmatically

While the CLI is convenient, you can also use the bundler programmatically:

```typescript
import { bundleReactComponent } from '@fractal-mcp/bundle';

await bundleReactComponent({
  entrypoint: './src/MyComponent.tsx',
  out: './dist'
});
```

## Output Characteristics

| Entrypoint Type | Output Size (typical) | Build Time | Use Case |
|----------------|----------------------|------------|----------|
| Small React component | ~190KB | 0.5s | UI widgets, dialogs |
| Medium React app | ~500KB | 2s | Dashboards, forms |
| Large React app | ~1-2MB | 5s | Full applications |
| Simple HTML + JS | ~2-10KB | 0.1s | Static pages |

## Tips

1. **Use absolute paths** or paths relative to where you run the command
2. **Output directory** will be created if it doesn't exist
3. **Existing files** in the output directory will be overwritten
4. **Dependencies** are automatically detected from your package.json
