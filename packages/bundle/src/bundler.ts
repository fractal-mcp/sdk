import { build } from 'vite';
import { resolve, dirname, extname, join, basename, relative } from 'path';
import { mkdir, writeFile, rm, access, readdir, rename } from 'fs/promises';
import type { BundleOptions } from './types.js';
import { getVitePlugins } from './plugins.js';

/**
 * Internal function to bundle with a custom root directory
 */
async function bundleWithRoot(args: BundleOptions & { root?: string }): Promise<void> {
  console.log("WOOHOO - Build #1");
  const resolvedEntrypoint = resolve(args.entrypoint);
  const resolvedOut = resolve(args.out);
  const root = args.root ? resolve(args.root) : dirname(resolvedEntrypoint);
  console.log("Bundling with root:", root);
  console.log("Entrypoint:", resolvedEntrypoint);
  
  if (extname(resolvedEntrypoint) !== '.html') {
    throw new Error(`bundle() entrypoint must be a .html file, got: ${args.entrypoint}`);
  }
  
  const vitePlugins = await getVitePlugins(args);
  await mkdir(dirname(resolvedOut), { recursive: true });
  
  // Check for PostCSS config
  const postcssConfigPath = join(root, 'postcss.config.js');
  const tailwindConfigPath = join(root, 'tailwind.config.js');
  try {
    await access(postcssConfigPath);
    console.log("✅ Found PostCSS config at:", postcssConfigPath);
  } catch {
    console.log("❌ No PostCSS config found at:", postcssConfigPath);
  }
  try {
    await access(tailwindConfigPath);
    console.log("✅ Found Tailwind config at:", tailwindConfigPath);
  } catch {
    console.log("❌ No Tailwind config found at:", tailwindConfigPath);
  }
  
  try {
    // Temporarily change cwd to root so Vite/PostCSS resolve correctly
    const originalCwd = process.cwd();
    console.log("Current working directory:", originalCwd);
    console.log("Changing to root:", root);
    try {
      process.chdir(root);
      console.log("Changed cwd to:", process.cwd());
      
      await build({
        root,
        // Don't use vite.config - provide all config inline
        configFile: false,
        plugins: vitePlugins,
        build: {
          outDir: resolvedOut,
          emptyOutDir: true,
          rollupOptions: {
            input: resolvedEntrypoint,
            external: [], // Don't externalize anything
            output: {
              entryFileNames: 'index.js',
              assetFileNames: '[name].[ext]'
            }
          }
        }
      });
    } finally {
      process.chdir(originalCwd);
    }
    
    // Rename the output HTML to index.html
    const outputFiles = await readdir(resolvedOut);
    const htmlFile = outputFiles.find(f => f.endsWith('.html'));
    if (htmlFile && htmlFile !== 'index.html') {
      await rename(join(resolvedOut, htmlFile), join(resolvedOut, 'index.html'));
    }
  } catch (error) {
    throw new Error(`Failed to bundle ${args.entrypoint}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Bundles an HTML file into a single self-contained HTML file
 */
export async function bundle(args: BundleOptions): Promise<void> {
  console.log("WOOHOO");
  await bundleWithRoot(args);
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
  
  // Find the directory with package.json (where node_modules and configs would be)
  let packageDir = dirname(resolvedEntrypoint);
  while (packageDir !== dirname(packageDir)) {
    try {
      await access(join(packageDir, 'package.json'));
      break;
    } catch {
      packageDir = dirname(packageDir);
    }
  }
  console.log("Found package directory:", packageDir);
  
  // Create temp files directly in package dir with unique names to avoid conflicts
  const tempId = Date.now();
  const tempMainPath = join(packageDir, `.fractal-bundle-main-${tempId}.tsx`);
  const tempHtmlPath = join(packageDir, `.fractal-bundle-index-${tempId}.html`);
  
  try {
    const componentName = basename(resolvedEntrypoint, '.tsx');
    
    // Calculate relative path from package dir to component
    let relativeComponentPath = relative(packageDir, resolvedEntrypoint);
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
    
    await writeFile(tempMainPath, mainTsxContent);
    
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
    <script type="module" src="/${basename(tempMainPath)}"></script>
  </body>
</html>
`;
    
    await writeFile(tempHtmlPath, indexHtmlContent);
    
    // Bundle with package dir as root so all configs are found
    await bundleWithRoot({
      entrypoint: tempHtmlPath,
      out: args.out,
      root: packageDir
    });
    
  } finally {
    // Clean up temp files
    try {
      await rm(tempMainPath, { force: true });
      await rm(tempHtmlPath, { force: true });
    } catch (error) {
      console.warn(`Failed to clean up temporary files:`, error);
    }
  }
}
