import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { bundle, bundleReactComponent, bundleJSEntrypoint } from '../src/index';
import { shouldRenderProperly } from './testing';
import { resolve, join, dirname } from 'path';
import { mkdtemp, rm, readdir } from 'fs/promises';
import { tmpdir } from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('Bundler', () => {
  let tempDir: string;

  beforeAll(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'bundle-test-'));
  });

  afterAll(async () => {
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  test('should throw error for non-tsx file in bundleReactComponent', async () => {
    const invalidPath = join(__dirname, 'invalid.html');
    
    await expect(bundleReactComponent({
      entrypoint: invalidPath,
      out: join(tempDir, 'invalid-output')
    })).rejects.toThrow('bundleReactComponent() entrypoint must be a .tsx or .jsx file');
  });

  test('should throw error for non-html file in bundle', async () => {
    const invalidPath = join(__dirname, 'invalid.tsx');
    
    await expect(bundle({
      entrypoint: invalidPath,
      out: join(tempDir, 'invalid-output')
    })).rejects.toThrow('bundle() entrypoint must be a .html file');
  });

  test('should bundle HTML file with external script', async () => {
    const htmlPath = resolve(__dirname, 'fixtures/index.html');
    const outputDir = join(tempDir, 'html-output');

    await bundle({
      entrypoint: htmlPath,
      out: outputDir
    });

    const bundledHtmlPath = join(outputDir, 'index.html');
    const isValid = await shouldRenderProperly(bundledHtmlPath, {
      timeout: 15000,
      expectedText: 'Script loaded successfully!'
    });

    expect(isValid).toBe(true);
  }, 30000);

  test('should bundle JS entrypoint to HTML', async () => {
    const jsPath = resolve(__dirname, 'fixtures/main.js');
    const outputDir = join(tempDir, 'js-html-output');

    await bundleJSEntrypoint({
      entrypoint: jsPath,
      out: outputDir,
      rootElement: 'app',
      output: {
        type: 'html',
        inline: { js: true, css: true },
        rootOnly: false
      }
    });

    const bundledHtmlPath = join(outputDir, 'index.html');
    const isValid = await shouldRenderProperly(bundledHtmlPath, {
      timeout: 15000,
      expectedText: 'JS Entrypoint Test'
    });

    expect(isValid).toBe(true);
  }, 30000);

  test('should bundle JS entrypoint to assets only', async () => {
    const jsPath = resolve(__dirname, 'fixtures/main.js');
    const outputDir = join(tempDir, 'js-assets-output');

    await bundleJSEntrypoint({
      entrypoint: jsPath,
      out: outputDir,
      output: {
        type: 'assets'
      }
    });

    // Check that only JS and CSS files exist, no HTML
    const files = await readdir(outputDir);
    expect(files).toContain('main.js');
    expect(files).not.toContain('index.html');
  }, 30000);

  test('should bundle JS entrypoint to root snippet', async () => {
    const jsPath = resolve(__dirname, 'fixtures/main.js');
    const outputDir = join(tempDir, 'js-root-output');

    await bundleJSEntrypoint({
      entrypoint: jsPath,
      out: outputDir,
      rootElement: 'app',
      output: {
        type: 'html',
        rootOnly: true,
        inline: { js: true, css: true }
      }
    });

    const files = await readdir(outputDir);
    expect(files).toContain('index.html');
    
    // Root snippet should work when rendered
    const bundledHtmlPath = join(outputDir, 'index.html');
    const isValid = await shouldRenderProperly(bundledHtmlPath, {
      timeout: 15000,
      expectedText: 'JS Entrypoint Test'
    });

    expect(isValid).toBe(true);
  }, 30000);
});
