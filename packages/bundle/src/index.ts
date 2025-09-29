import { build, defineConfig, PluginOption } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';
import * as path from 'path';
import * as fs from 'fs';

export interface BundleOptions {
    entrypoint: string;
    outputDir: string;
}

export interface BundleResult {
    bundlePath: string;
    jsPath: string;
    cssPath?: string;
}


const makeViteConfig = (options: BundleOptions) => {
    const { entrypoint, outputDir } = options;

    const absoluteEntrypoint = path.resolve(entrypoint);
    const absoluteOutputDir = path.resolve(outputDir);

    const config = defineConfig({
        plugins: [
            react(),
            viteSingleFile(),
        ],
        publicDir: false,
        define: {
            'process.env.NODE_ENV': JSON.stringify('production'),
            'process.env': '{}',
        },
        build: {
            target: 'es2019',
            assetsInlineLimit: Infinity,
            cssCodeSplit: false,
            rollupOptions: {
                output: {
                    manualChunks: () => 'everything.js',
                    inlineDynamicImports: true,
                },
            },
            // 👇 override output directory (default: "dist")
            outDir: absoluteOutputDir,
            emptyOutDir: true, // clean before build
        },
    });
}
export const bundle = async (options: BundleOptions): Promise<BundleResult> => {
    const { entrypoint, dst } = options;

    const absoluteEntrypoint = path.resolve(entrypoint);
    const absoluteDst = path.resolve(dst);

    if (!fs.existsSync(absoluteEntrypoint)) {
        throw new Error(`Entrypoint file not found: ${absoluteEntrypoint}`);
    }

    fs.mkdirSync(absoluteDst, { recursive: true });

    // Locate nearest package.json by walking up
    const pkgJsonPath = findNearestPackageJson(path.dirname(absoluteEntrypoint));
    if (!pkgJsonPath) {
        throw new Error(`Could not find package.json starting from ${absoluteEntrypoint}`);
    }

    const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf-8'));
    const deps: Record<string, string> = {
        ...(pkg.dependencies || {}),
        ...(pkg.peerDependencies || {}),
    };

    // Temporary output dir
    const tempDir = path.join(absoluteDst, '.temp-build');
    fs.mkdirSync(tempDir, { recursive: true });

    const entrypointDir = path.dirname(absoluteEntrypoint);
    const twcfg = {
        content: [`${entrypointDir}/**/*.{js,ts,jsx,tsx}`, absoluteEntrypoint],
        theme: { extend: {} },
        plugins: [],
    };

    try {


        const viteConfig = defineConfig({
            plugins: [],
            publicDir: false,
            define: {
                'process.env.NODE_ENV': JSON.stringify('production'),
                'process.env': '{}',
            },
            build: {
                lib: {
                    entry: absoluteEntrypoint,
                    formats: ['es'],
                    fileName: () => `bundle.js`,
                },
                outDir: tempDir,
                emptyOutDir: true,
                target: 'es2019',
                cssCodeSplit: false,
                rollupOptions: {
                    external: Object.keys(deps),
                    output: {
                        assetFileNames: (assetInfo) =>
                            assetInfo.name?.endsWith('.css')
                                ? 'bundle.css'
                                : assetInfo.name || 'asset',
                    },
                },
            },
            logLevel: 'warn',
        });

        await build(viteConfig);

        return {
            bundlePath: absoluteDst,
            jsPath: path.join(absoluteDst, 'bundle.js'),
        };
    } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
    }
};

export function combineHtmlWithRefs(options: {
    bundle: BundleResult;
    deps: Record<string, string>;
    title?: string;
}): string {
    const { bundle, deps, title = 'App' } = options;

    const cssLink = bundle.cssPath
        ? `<link rel="stylesheet" href="./${path.basename(bundle.cssPath)}">`
        : '';

    const externalScripts = Object.entries(deps)
        .map(([name, version]) => {
            const url = toCdnUrl(name, version);
            return url ? `<script src="${url}"></script>` : '';
        })
        .join('\n    ');

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>${title}</title>
  ${cssLink}
</head>
<body>
  <div id="root"></div>
  ${externalScripts}
  <script type="module" src="./${path.basename(bundle.jsPath)}"></script>
</body>
</html>`;
}


/**
 * Produce a single output html for the entrypoint
 * @param options 
 * @returns 
 */
export function combineHtml(options: {
    bundle: BundleResult;
    deps: Record<string, string>;
    title?: string;
}): string {
    const { bundle, deps, title = 'App' } = options;

    // Inline CSS if present
    let cssInline = '';
    if (bundle.cssPath && fs.existsSync(bundle.cssPath)) {
        const css = fs.readFileSync(bundle.cssPath, 'utf-8');
        cssInline = `<style>\n${css}\n</style>`;
    }

    // Inline your app JS
    const jsCode = fs.readFileSync(bundle.jsPath, 'utf-8');
    const appScript = `<script type="module">\n${jsCode}\n</script>`;

    // External CDN deps (still <script src=...>)
    const externalScripts = Object.entries(deps)
        .map(([name, version]) => {
            const url = toCdnUrl(name, version);
            return url ? `<script src="${url}"></script>` : '';
        })
        .join('\n    ');

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>${title}</title>
  ${cssInline}
</head>
<body>
  <div id="root"></div>
  ${externalScripts}
  ${appScript}
</body>
</html>`;
}


// --------- Helpers ---------

function findNearestPackageJson(startDir: string): string | null {
    let dir = startDir;
    while (true) {
        const candidate = path.join(dir, 'package.json');
        if (fs.existsSync(candidate)) return candidate;
        const parent = path.dirname(dir);
        if (parent === dir) break;
        dir = parent;
    }
    return null;
}

// For simplicity, use jsDelivr UMD builds
function toCdnUrl(pkg: string, version: string): string | null {
    // crude guess: most libs publish dist/{name}.min.js
    if (pkg === 'react')
        return `https://cdn.jsdelivr.net/npm/react@${version}/umd/react.production.min.js`;
    if (pkg === 'react-dom')
        return `https://cdn.jsdelivr.net/npm/react-dom@${version}/umd/react-dom.production.min.js`;
    return `https://cdn.jsdelivr.net/npm/${pkg}@${version}`;
}
