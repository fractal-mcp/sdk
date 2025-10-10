#!/usr/bin/env node
/**
 * Test script to demonstrate new bundler features
 * Tests all input types and output formats
 */

import { bundleHTMLInput, bundleReactComponent, bundleJSEntrypoint } from './dist/index.js';
import { resolve, join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { mkdir, rm, readdir } from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const OUTPUT_DIR = join(__dirname, 'test-outputs');

async function cleanOutputDir() {
  await rm(OUTPUT_DIR, { recursive: true, force: true });
  await mkdir(OUTPUT_DIR, { recursive: true });
}

async function listOutputFiles(dir) {
  try {
    const files = await readdir(dir);
    console.log(`  Files: ${files.join(', ')}`);
  } catch (error) {
    console.log(`  Error reading directory: ${error.message}`);
  }
}

async function test1_ReactComponent_HTML_Inlined() {
  console.log('\n📦 Test 1: React Component → HTML (inlined)');
  const outputDir = join(OUTPUT_DIR, 'test1-react-html-inlined');
  
  try {
    await bundleReactComponent({
      entrypoint: resolve(__dirname, '../../apps/examples/mcp-ui/hello-example-react/src/Hello.tsx'),
      out: outputDir,
      output: {
        type: 'html',
        inline: { js: true, css: true },
        rootOnly: false
      }
    });
    console.log('✅ Success!');
    await listOutputFiles(outputDir);
  } catch (error) {
    console.error('❌ Failed:', error.message);
  }
}

async function test2_ReactComponent_HTML_External() {
  console.log('\n📦 Test 2: React Component → HTML (external assets)');
  const outputDir = join(OUTPUT_DIR, 'test2-react-html-external');
  
  try {
    await bundleReactComponent({
      entrypoint: resolve(__dirname, '../../apps/examples/mcp-ui/hello-example-react/src/Hello.tsx'),
      out: outputDir,
      output: {
        type: 'html',
        inline: { js: false, css: false },
        rootOnly: false
      }
    });
    console.log('✅ Success!');
    await listOutputFiles(outputDir);
  } catch (error) {
    console.error('❌ Failed:', error.message);
  }
}

async function test3_ReactComponent_HTML_RootOnly() {
  console.log('\n📦 Test 3: React Component → HTML (root snippet)');
  const outputDir = join(OUTPUT_DIR, 'test3-react-html-rootonly');
  
  try {
    await bundleReactComponent({
      entrypoint: resolve(__dirname, '../../apps/examples/mcp-ui/hello-example-react/src/Hello.tsx'),
      out: outputDir,
      output: {
        type: 'html',
        inline: { js: true, css: true },
        rootOnly: true
      }
    });
    console.log('✅ Success!');
    await listOutputFiles(outputDir);
  } catch (error) {
    console.error('❌ Failed:', error.message);
  }
}

async function test4_ReactComponent_Assets() {
  console.log('\n📦 Test 4: React Component → Assets (NO HTML)');
  const outputDir = join(OUTPUT_DIR, 'test4-react-assets');
  
  try {
    await bundleReactComponent({
      entrypoint: resolve(__dirname, '../../apps/examples/mcp-ui/hello-example-react/src/Hello.tsx'),
      out: outputDir,
      output: {
        type: 'assets'
      }
    });
    console.log('✅ Success! Should only see main.js and index.css');
    await listOutputFiles(outputDir);
  } catch (error) {
    console.error('❌ Failed:', error.message);
  }
}

async function test5_HTMLInput() {
  console.log('\n📦 Test 5: HTML Input → HTML (always inlined)');
  const outputDir = join(OUTPUT_DIR, 'test5-html-input');
  
  try {
    await bundleHTMLInput({
      entrypoint: resolve(__dirname, 'tests/fixtures/index.html'),
      out: outputDir
    });
    console.log('✅ Success!');
    await listOutputFiles(outputDir);
  } catch (error) {
    console.error('❌ Failed:', error.message);
  }
}

async function runAllTests() {
  console.log('🚀 Testing new bundler features...\n');
  console.log('=' .repeat(60));
  
  await cleanOutputDir();
  
  await test1_ReactComponent_HTML_Inlined();
  await test2_ReactComponent_HTML_External();
  await test3_ReactComponent_HTML_RootOnly();
  await test4_ReactComponent_Assets();
  await test5_HTMLInput();
  
  console.log('\n' + '='.repeat(60));
  console.log('\n✨ All tests completed!');
  console.log(`📁 Check outputs in: ${OUTPUT_DIR}\n`);
}

runAllTests().catch(console.error);

