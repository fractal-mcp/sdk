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

export const bundle = async (
  options: BundleOptions,
): Promise<{ bundlePath: string; jsPath: string; cssPath?: string }> => {
  const { entrypoint, dst, componentName } = options;

  const result: { bundlePath: string; jsPath: string; cssPath?: string } = { bundlePath: options.dst, jsPath: '', cssPath: undefined };
  
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

  // Variable to capture React version
  let reactVersion = 'unknown';
  
  try {
    // Configure Vite for the build
    const viteConfig = defineConfig({
      plugins: [
        reactVersionLogger((version) => {
          reactVersion = version;
        }),
        react()
      ],
      publicDir: false, // Don't copy public directory for component builds
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

    // Write metadata file with React version
    const metadata = {
      react_version: reactVersion,
    };
    
    const metadataPath = path.join(absoluteDst, 'metadata.json');
    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
    console.log(`📄 Metadata written to ${metadataPath}`);

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

// Plugin to log the React version that Vite actually resolves
const reactVersionLogger = (metadataCallback?: (version: string) => void) => {
  return {
    name: 'react-version-logger',
    async buildStart(this: any) {
      console.log(`🔍 DEBUG: Starting React version resolution...`);
      console.log(`🔍 DEBUG: Current working directory: ${process.cwd()}`);
      
      try {
        // Try react/package.json first
        console.log(`🔍 DEBUG: Attempting to resolve 'react/package.json'...`);
        const reactPackageJson = await this.resolve('react/package.json');
        console.log(`🔍 DEBUG: react/package.json resolve result:`, reactPackageJson);
        
        if (reactPackageJson && reactPackageJson.id && fs.existsSync(reactPackageJson.id)) {
          console.log(`🔍 DEBUG: Found react/package.json at: ${reactPackageJson.id}`);
          const packageJson = JSON.parse(fs.readFileSync(reactPackageJson.id, 'utf8'));
          console.log(`🔍 Vite resolved React version: ${packageJson.version} (from ${reactPackageJson.id})`);
          metadataCallback?.(packageJson.version);
          return;
        }

        // Try require.resolve as fallback
        try {
          const reactPath = require.resolve('react/package.json');
          const packageJson = JSON.parse(fs.readFileSync(reactPath, 'utf8'));
          console.log(`🔍 React version: ${packageJson.version} (from ${reactPath})`);
          metadataCallback?.(packageJson.version);
        } catch (e) {
          console.log(`🔍 Could not determine React version`);
          metadataCallback?.('unknown');
        }
        
      } catch (error) {
        console.log(`🔍 Error resolving React:`, error);
        metadataCallback?.('unknown');
      }
    }
  };
};