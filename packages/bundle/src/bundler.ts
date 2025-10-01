import { build } from 'vite';
import { resolve, dirname, extname, join, basename, relative } from 'path';
import { mkdir, writeFile, rm, access } from 'fs/promises';
import type { BundleOptions } from './types.js';
import { getVitePlugins } from './plugins.js';

/**
 * Bundles an HTML file into a single self-contained HTML file
 */
export async function bundle(args: BundleOptions): Promise<void> {
  const resolvedEntrypoint = resolve(args.entrypoint);
  const resolvedOut = resolve(args.out);
  
  if (extname(resolvedEntrypoint) !== '.html') {
    throw new Error(`bundle() entrypoint must be a .html file, got: ${args.entrypoint}`);
  }
  
  const vitePlugins = await getVitePlugins(args);
  await mkdir(dirname(resolvedOut), { recursive: true });
  
  try {
    await build({
      root: dirname(resolvedEntrypoint),
      plugins: vitePlugins,
      build: {
        outDir: resolvedOut,
        emptyOutDir: true,
        rollupOptions: {
          input: resolvedEntrypoint,
          external: [] // Don't externalize anything
        }
      }
    });
  } catch (error) {
    throw new Error(`Failed to bundle ${args.entrypoint}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Bundles a React component (.tsx) into a single self-contained HTML file
 * Creates temporary bootstrap files and delegates to bundle()
 */
export async function bundleReactComponent(args: BundleOptions): Promise<void> {
  const resolvedEntrypoint = resolve(args.entrypoint);
  
  if (extname(resolvedEntrypoint) !== '.tsx') {
    throw new Error(`bundleReactComponent() entrypoint must be a .tsx file, got: ${args.entrypoint}`);
  }
  
  // Find the directory with package.json (where node_modules would be)
  let packageDir = dirname(resolvedEntrypoint);
  while (packageDir !== dirname(packageDir)) {
    try {
      await access(join(packageDir, 'package.json'));
      break;
    } catch {
      packageDir = dirname(packageDir);
    }
  }
  
  const tempDir = join(packageDir, `.fractal-bundle-temp-${Date.now()}`);
  await mkdir(tempDir, { recursive: true });
  
  try {
    const componentName = basename(resolvedEntrypoint, '.tsx');
    // Calculate relative path from temp dir to component
    let relativeComponentPath = relative(tempDir, resolvedEntrypoint);
    // Ensure it starts with ./ for ES modules
    if (!relativeComponentPath.startsWith('.')) {
      relativeComponentPath = './' + relativeComponentPath;
    }
    // Remove .tsx extension as imports don't need it
    relativeComponentPath = relativeComponentPath.replace(/\.tsx$/, '');
    
    const mainTsxContent = `
import React from 'react';
import ReactDOM from 'react-dom/client';
import ${componentName} from '${relativeComponentPath}';

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(React.createElement(${componentName}));
`;
    
    const mainTsxPath = join(tempDir, 'main.tsx');
    await writeFile(mainTsxPath, mainTsxContent);
    
    const indexHtmlContent = `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Bundled Component</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/main.tsx"></script>
  </body>
</html>
`;
    
    const indexHtmlPath = join(tempDir, 'index.html');
    await writeFile(indexHtmlPath, indexHtmlContent);
    
    await bundle({
      entrypoint: indexHtmlPath,
      out: args.out
    });
    
  } finally {
    try {
      await rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      console.warn(`Failed to clean up temporary directory ${tempDir}:`, error);
    }
  }
}
