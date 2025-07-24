import { build, defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';
import * as path from 'path';
import * as fs from 'fs';

export interface BundleOptions {
  entrypoint: string;
  dst: string;
  componentName?: string;
}

export interface GenerateHtmlOptions {
  jsPath: string;
  cssPath?: string;
  title?: string;
  data?: unknown;
}

/**
 * Generates a full HTML document from a snippet and CSS.
 */
export const getSourceHtml = (
  html: string,
  css: string,
  title: string = 'Component Preview'
): string => {
  return `
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    ${css ? `<style>${css}</style>` : ''}
</head>
<body>
    ${html}
</body>
</html>`;
};

export function generateHtml(options: GenerateHtmlOptions): string {
  const { jsPath, cssPath, title, data } = options;
  const js = fs.readFileSync(jsPath, "utf8");
  let css = "";
  if (cssPath && fs.existsSync(cssPath)) {
    css = fs.readFileSync(cssPath, "utf8");
  }
  const encodedJs = Buffer.from(js, "utf8").toString("base64");

  const dataScript =
    data !== undefined
      ? `<script id="fractal-data" type="application/json">${JSON.stringify(data)}</script>`
      : '';

  const snippet = `\n<div id="root"></div>${dataScript}\n<script type="importmap">\n{
    "imports": {
      "react": "https://esm.sh/react@19",
      "react-dom/client": "https://esm.sh/react-dom@19/client"
    }
}</script>\n<script type="module">\nimport React from 'react';\nimport { createRoot } from 'react-dom/client';\nconst dataEl = document.getElementById('fractal-data');\nwindow.__FRACTAL_DATA__ = dataEl ? JSON.parse(dataEl.textContent || '{}') : undefined;\nconst url = 'data:text/javascript;base64,${encodedJs}';\nimport(url).then(mod => {
  const Component = mod.default;
  const root = createRoot(document.getElementById('root'));
  root.render(React.createElement(Component));
});\n</script>`;

  return getSourceHtml(snippet, css, title);
}
export const bundle = async (
  options: BundleOptions,
): Promise<{ jsPath: string; cssPath?: string }> => {
  const { entrypoint, dst, componentName } = options;

  const result: { jsPath: string; cssPath?: string } = { jsPath: '', cssPath: undefined };
  
  // Resolve absolute paths
  const absoluteEntrypoint = path.resolve(entrypoint);
  const absoluteDst = path.resolve(dst);
  
  // Ensure the entrypoint exists
  if (!fs.existsSync(absoluteEntrypoint)) {
    throw new Error(`Entrypoint file not found: ${absoluteEntrypoint}`);
  }
  
  // Ensure destination directory exists
  fs.mkdirSync(absoluteDst, { recursive: true });
  
  // Create a temporary directory for the build
  const tempDir = path.join(absoluteDst, '.temp-build');
  fs.mkdirSync(tempDir, { recursive: true });
  const entrypointDir = path.dirname(absoluteEntrypoint);
  
  const twcfg = {
    content: [
      // Scan the directory containing the entrypoint and subdirectories
      `${entrypointDir}/**/*.{js,ts,jsx,tsx}`,
      // Also scan the specific entrypoint file
      absoluteEntrypoint,
    ],
    theme: {
      extend: {},
    },
    plugins: [],
  };

  
  try {
    // Configure Vite for the build
    const viteConfig = defineConfig({
      plugins: [react()],
      css: {
        postcss: {
          plugins: [
            tailwindcss(twcfg),
            autoprefixer,
          ],
        },
      },
      define: {
        // Replace Node.js environment variables with actual values for browser compatibility
        'process.env.NODE_ENV': JSON.stringify('production'),
        'process.env': '{}',
      },
      build: {
        lib: {
          entry: absoluteEntrypoint,
          formats: ['es'],
          fileName: () => `Component.js`,
        },
        outDir: tempDir,
        emptyOutDir: true,
        target: 'es2019',
        cssCodeSplit: false,
        rollupOptions: {
          external: ['react', 'react-dom'],
          output: {
            assetFileNames: (assetInfo) => {
              if (assetInfo.name?.endsWith('.css')) {
                return 'index.css';
              }
              return assetInfo.name || 'asset';
            },
          },
        },
      },
      logLevel: 'warn',
    });
    
    // Run the build
    await build(viteConfig);
    
    // Move files from temp directory to final destination
    const tempFiles = fs.readdirSync(tempDir);
    
    for (const file of tempFiles) {
      const srcFile = path.join(tempDir, file);
      const destFile = path.join(absoluteDst, file);
      
      // Rename the JS file to have .jsx extension if it's a React component
      if (file.endsWith('.js') && (entrypoint.endsWith('.tsx') || entrypoint.endsWith('.jsx'))) {
        const newName = file.replace('.js', '.jsx');
        const newDestFile = path.join(absoluteDst, newName);
        fs.renameSync(srcFile, newDestFile);
      } else {
        fs.renameSync(srcFile, destFile);
      }
    }

    const jsPath = path.join(absoluteDst, 'Component.jsx');
    const cssPath = path.join(absoluteDst, 'index.css');

    // Build only generates JS/CSS files. Caller can create HTML separately.
    result.jsPath = jsPath;
    if (fs.existsSync(cssPath)) {
      result.cssPath = cssPath;
    }
    
  } catch (error) {
    console.error('❌ Bundle failed:', error);
    throw error;
  } finally {
    // Clean up temp directory
    fs.rmSync(tempDir, { recursive: true, force: true });
  }

  return result;
};

export default bundle; 
