import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { bundle, bundleReactComponent } from '../src/index';
import { shouldRenderProperly } from './testing';
import { resolve, join, dirname } from 'path';
import { mkdtemp, rm } from 'fs/promises';
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

  test('should bundle React component from hello-example-react', async () => {
    const helloComponentPath = resolve(
      __dirname,
      '../../../apps/examples/mcp-ui/hello-example-react/src/Hello.tsx'
    );
    const outputDir = join(tempDir, 'hello-output');

    // Bundle the React component
    await bundleReactComponent({
      entrypoint: helloComponentPath,
      out: outputDir
    });

    // Check if the bundled HTML renders properly
    const bundledHtmlPath = join(outputDir, 'index.html');
    const isValid = await shouldRenderProperly(bundledHtmlPath, {
      timeout: 15000,
      expectedText: 'Hello'
    });

    expect(isValid).toBe(true);
  }, 30000); // 30 second timeout for this test

  test('should throw error for non-tsx file in bundleReactComponent', async () => {
    const invalidPath = join(__dirname, 'invalid.html');
    
    await expect(bundleReactComponent({
      entrypoint: invalidPath,
      out: join(tempDir, 'invalid-output')
    })).rejects.toThrow('bundleReactComponent() entrypoint must be a .tsx file');
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
});
