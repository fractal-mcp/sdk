import { build } from 'vite';
import { resolve, dirname, extname, join, basename, relative } from 'path';
import { mkdir, writeFile, rm, access, readdir, rename, readFile, copyFile } from 'fs/promises';
import type { BundleOptions, BundleHTMLOptions, BundleReactOptions, BundleJSOptions, OutputConfig } from './types.js';
import { getVitePlugins } from './plugins.js';

/**
 * Internal function to bundle with a custom root directory
 */
async function bundleWithRoot(
  args: BundleOptions & { root?: string; useSingleFile?: boolean },
): Promise<void> {
  console.log('WOOHOO - Build #1');
  const resolvedEntrypoint = resolve(args.entrypoint);
  const resolvedOut = resolve(args.out);
  const root = args.root ? resolve(args.root) : dirname(resolvedEntrypoint);
  console.log('Bundling with root:', root);
  console.log('Entrypoint:', resolvedEntrypoint);

  if (extname(resolvedEntrypoint) !== '.html') {
    throw new Error(`bundle() entrypoint must be a .html file, got: ${args.entrypoint}`);
  }

  const vitePlugins = await getVitePlugins(args, { useSingleFile: args.useSingleFile });
  await mkdir(dirname(resolvedOut), { recursive: true });

  // Check for PostCSS config
  const postcssConfigPath = join(root, 'postcss.config.js');
  const tailwindConfigPath = join(root, 'tailwind.config.js');
  try {
    await access(postcssConfigPath);
    console.log('Found PostCSS config at:', postcssConfigPath);
  } catch {
    console.log('No PostCSS config found at:', postcssConfigPath);
  }
  try {
    await access(tailwindConfigPath);
    console.log('Found Tailwind config at:', tailwindConfigPath);
  } catch {
    console.log('No Tailwind config found at:', tailwindConfigPath);
  }

  try {
    // Temporarily change cwd to root so Vite/PostCSS resolve correctly
    const originalCwd = process.cwd();
    console.log('Current working directory:', originalCwd);
    console.log('Changing to root:', root);
    try {
      process.chdir(root);
      console.log('Changed cwd to:', process.cwd());

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
              assetFileNames: '[name].[ext]',
            },
          },
        },
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
 * @deprecated Use bundleHTMLInput instead
 */
export async function bundle(args: BundleOptions): Promise<void> {
  console.log('WOOHOO');
  await bundleWithRoot(args);
}

/**
 * Bundles an HTML file into a single self-contained HTML file
 */
export async function bundleHTMLInput(options: BundleHTMLOptions): Promise<void> {
  const resolvedEntrypoint = resolve(options.entrypoint);

  if (extname(resolvedEntrypoint) !== '.html') {
    throw new Error(`bundleHTMLInput() entrypoint must be a .html file, got: ${options.entrypoint}`);
  }

  await bundleWithRoot(options);
}

/**
 * Bundles a React component (.tsx/.jsx) with configurable output formats
 * Creates temporary bootstrap files and delegates to bundleWithRoot
 */
export async function bundleReactComponent(options: BundleReactOptions): Promise<void> {
  const resolvedEntrypoint = resolve(options.entrypoint);
  const ext = extname(resolvedEntrypoint);

  if (ext !== '.tsx' && ext !== '.jsx') {
    throw new Error(`bundleReactComponent() entrypoint must be a .tsx or .jsx file, got: ${options.entrypoint}`);
  }

  // Default output config
  const outputConfig: OutputConfig = options.output || {
    type: 'html',
    inline: { js: true, css: true },
    rootOnly: false,
  };

  // Find the directory with package.json (where node_modules and configs would be)
  let packageDir = dirname(resolvedEntrypoint);
  let attempts = 0;
  const maxAttempts = 10; // Don't traverse more than 10 levels up

  while (attempts < maxAttempts) {
    try {
      await access(join(packageDir, 'package.json'));
      console.log('Found package directory:', packageDir);
      break;
    } catch {
      const parentDir = dirname(packageDir);
      // Stop if we've reached the root
      if (parentDir === packageDir) {
        throw new Error(`Could not find package.json starting from ${resolvedEntrypoint}`);
      }
      packageDir = parentDir;
      attempts++;
    }
  }

  if (attempts >= maxAttempts) {
    throw new Error(`Could not find package.json within ${maxAttempts} parent directories of ${resolvedEntrypoint}`);
  }

  // Create temp files directly in package dir with unique names to avoid conflicts
  const tempId = Date.now();
  const tempMainPath = join(packageDir, `.fractal-bundle-main-${tempId}.tsx`);
  const tempHtmlPath = join(packageDir, `.fractal-bundle-index-${tempId}.html`);
  const tempOutDir = join(packageDir, `.fractal-bundle-out-${tempId}`);

  try {
    const componentName = basename(resolvedEntrypoint, ext);

    // Calculate relative path from package dir to component
    let relativeComponentPath = relative(packageDir, resolvedEntrypoint);
    // Ensure it starts with ./ for ES modules
    if (!relativeComponentPath.startsWith('.')) {
      relativeComponentPath = './' + relativeComponentPath;
    }
    // Remove extension as imports don't need it
    relativeComponentPath = relativeComponentPath.replace(/\.(tsx|jsx)$/, '');

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

    // Determine if we should use single file plugin
    // Only use it if output is HTML with inlining enabled
    const useSingleFile = outputConfig.type === 'html' &&
      outputConfig.inline?.js !== false &&
      outputConfig.inline?.css !== false;

    // Bundle to temp directory first
    await bundleWithRoot({
      entrypoint: tempHtmlPath,
      out: tempOutDir,
      root: packageDir,
      useSingleFile,
    });

    // Format output based on config
    if (outputConfig.type === 'assets') {
      await formatAsAssets(tempOutDir, resolve(options.out));
    } else {
      await formatAsHTML(tempOutDir, resolve(options.out), {
        inline: outputConfig.inline,
        rootOnly: outputConfig.rootOnly,
        rootElement: 'root',
      });
    }

  } finally {
    // Clean up temp files
    try {
      await rm(tempMainPath, { force: true });
      await rm(tempHtmlPath, { force: true });
      await rm(tempOutDir, { recursive: true, force: true });
    } catch (error) {
      console.warn('Failed to clean up temporary files:', error);
    }
  }
}

/**
 * Bundles a JS/TS entrypoint with configurable output formats
 * Creates a temporary HTML wrapper and delegates to bundleWithRoot
 */
export async function bundleJSEntrypoint(options: BundleJSOptions): Promise<void> {
  const resolvedEntrypoint = resolve(options.entrypoint);
  const ext = extname(resolvedEntrypoint);

  if (!['.ts', '.tsx', '.js', '.jsx'].includes(ext)) {
    throw new Error(`bundleJSEntrypoint() entrypoint must be a .ts, .tsx, .js, or .jsx file, got: ${options.entrypoint}`);
  }

  // Default values
  const rootElement = options.rootElement || 'root';
  const outputConfig: OutputConfig = options.output || {
    type: 'html',
    inline: { js: true, css: true },
    rootOnly: false,
  };

  // Find the directory with package.json (where node_modules and configs would be)
  let packageDir = dirname(resolvedEntrypoint);
  let attempts = 0;
  const maxAttempts = 10; // Don't traverse more than 10 levels up

  while (attempts < maxAttempts) {
    try {
      await access(join(packageDir, 'package.json'));
      console.log('Found package directory:', packageDir);
      break;
    } catch {
      const parentDir = dirname(packageDir);
      // Stop if we've reached the root
      if (parentDir === packageDir) {
        throw new Error(`Could not find package.json starting from ${resolvedEntrypoint}`);
      }
      packageDir = parentDir;
      attempts++;
    }
  }

  if (attempts >= maxAttempts) {
    throw new Error(`Could not find package.json within ${maxAttempts} parent directories of ${resolvedEntrypoint}`);
  }

  // Create temp files directly in package dir with unique names to avoid conflicts
  const tempId = Date.now();
  const tempHtmlPath = join(packageDir, `.fractal-bundle-index-${tempId}.html`);
  const tempOutDir = join(packageDir, `.fractal-bundle-out-${tempId}`);

  try {
    // Calculate relative path from package dir to entrypoint
    let relativeEntrypointPath = relative(packageDir, resolvedEntrypoint);
    // Ensure it starts with ./ for ES modules
    if (!relativeEntrypointPath.startsWith('.')) {
      relativeEntrypointPath = './' + relativeEntrypointPath;
    }

    const indexHtmlContent = `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Bundled App</title>
  </head>
  <body>
    <div id="${rootElement}"></div>
    <script type="module" src="/${relativeEntrypointPath}"></script>
  </body>
</html>
`;

    await writeFile(tempHtmlPath, indexHtmlContent);

    // Determine if we should use single file plugin
    // Only use it if output is HTML with inlining enabled
    const useSingleFile = outputConfig.type === 'html' &&
      outputConfig.inline?.js !== false &&
      outputConfig.inline?.css !== false;

    // Bundle to temp directory first
    await bundleWithRoot({
      entrypoint: tempHtmlPath,
      out: tempOutDir,
      root: packageDir,
      useSingleFile,
    });

    // Format output based on config
    if (outputConfig.type === 'assets') {
      await formatAsAssets(tempOutDir, resolve(options.out));
    } else {
      await formatAsHTML(tempOutDir, resolve(options.out), {
        inline: outputConfig.inline,
        rootOnly: outputConfig.rootOnly,
        rootElement: rootElement,
      });
    }

  } finally {
    // Clean up temp files
    try {
      await rm(tempHtmlPath, { force: true });
      await rm(tempOutDir, { recursive: true, force: true });
    } catch (error) {
      console.warn('Failed to clean up temporary files:', error);
    }
  }
}

/**
 * Formats build output as HTML (full document or snippet)
 */
async function formatAsHTML(
  buildDir: string,
  outputPath: string,
  options: {
    inline?: { js?: boolean; css?: boolean };
    rootOnly?: boolean;
    rootElement?: string;
  },
): Promise<void> {
  await mkdir(outputPath, { recursive: true });

  const files = await readdir(buildDir);
  const htmlFile = files.find(f => f.endsWith('.html'));
  const jsFiles = files.filter(f => f.endsWith('.js'));
  const cssFiles = files.filter(f => f.endsWith('.css'));

  if (!htmlFile) {
    throw new Error('No HTML file found in build output');
  }

  // Read the built HTML
  let htmlContent = await readFile(join(buildDir, htmlFile), 'utf-8');

  // Handle inlining preferences
  const inlineJs = options.inline?.js !== false; // Default to true
  const inlineCss = options.inline?.css !== false; // Default to true

  // If rootOnly, we need to extract and reassemble the snippet
  if (options.rootOnly) {
    let snippet = '';

    // Extract the root div from body
    const bodyMatch = htmlContent.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    const bodyContent = bodyMatch ? bodyMatch[1].trim() : '';

    // Extract inline styles
    const styleMatches = htmlContent.match(/<style[^>]*>[\s\S]*?<\/style>/gi) || [];

    // Extract inline scripts
    const scriptMatches = htmlContent.match(/<script[^>]*>[\s\S]*?<\/script>/gi) || [];

    // Build snippet
    snippet += bodyContent + '\n';

    if (inlineCss && styleMatches.length > 0) {
      snippet += styleMatches.join('\n') + '\n';
    } else if (!inlineCss && cssFiles.length > 0) {
      // Save CSS separately and add link
      await copyFile(join(buildDir, cssFiles[0]), join(outputPath, 'index.css'));
      snippet += '<link rel="stylesheet" href="index.css" />\n';
    }

    if (inlineJs && scriptMatches.length > 0) {
      snippet += scriptMatches.join('\n') + '\n';
    } else if (!inlineJs && jsFiles.length > 0) {
      // Save JS separately and add script tag
      await copyFile(join(buildDir, jsFiles[0]), join(outputPath, 'main.js'));
      snippet += '<script src="main.js"></script>\n';
    }

    await writeFile(join(outputPath, 'index.html'), snippet.trim());
  } else {
    // Full HTML document
    if (!inlineJs) {
      // Extract and save JS separately
      for (const jsFile of jsFiles) {
        await copyFile(join(buildDir, jsFile), join(outputPath, 'main.js'));
      }
      // Replace inline script with external reference
      htmlContent = htmlContent.replace(
        /<script[^>]*>[\s\S]*?<\/script>/gi,
        '<script src="main.js"></script>',
      );
    }

    if (!inlineCss) {
      // Extract and save CSS separately
      for (const cssFile of cssFiles) {
        await copyFile(join(buildDir, cssFile), join(outputPath, 'index.css'));
      }
      // Replace inline style with external reference
      htmlContent = htmlContent.replace(
        /<style[^>]*>[\s\S]*?<\/style>/gi,
        '<link rel="stylesheet" href="index.css" />',
      );
    }

    await writeFile(join(outputPath, 'index.html'), htmlContent);
  }
}

/**
 * Formats build output as separate asset files (NO HTML)
 * Outputs only main.js and index.css
 */
async function formatAsAssets(buildDir: string, outputPath: string): Promise<void> {
  await mkdir(outputPath, { recursive: true });

  const files = await readdir(buildDir);
  const jsFiles = files.filter(f => f.endsWith('.js'));
  const cssFiles = files.filter(f => f.endsWith('.css'));

  // Copy JS files
  if (jsFiles.length > 0) {
    // If multiple JS files, concatenate them (though Vite should produce one)
    if (jsFiles.length === 1) {
      await copyFile(join(buildDir, jsFiles[0]), join(outputPath, 'main.js'));
    } else {
      // Concatenate multiple JS files
      let combinedJs = '';
      for (const jsFile of jsFiles) {
        combinedJs += await readFile(join(buildDir, jsFile), 'utf-8') + '\n';
      }
      await writeFile(join(outputPath, 'main.js'), combinedJs);
    }
  }

  // Copy CSS files
  if (cssFiles.length > 0) {
    // If multiple CSS files, concatenate them
    if (cssFiles.length === 1) {
      await copyFile(join(buildDir, cssFiles[0]), join(outputPath, 'index.css'));
    } else {
      // Concatenate multiple CSS files
      let combinedCss = '';
      for (const cssFile of cssFiles) {
        combinedCss += await readFile(join(buildDir, cssFile), 'utf-8') + '\n';
      }
      await writeFile(join(outputPath, 'index.css'), combinedCss);
    }
  }
}
