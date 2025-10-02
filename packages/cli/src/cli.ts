#!/usr/bin/env node

import { Command } from 'commander';
import { readFile } from 'fs/promises';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createBundleCommand } from './commands/bundle.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function main() {
  const packageJsonPath = resolve(__dirname, '../package.json');
  const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf-8'));

  const program = new Command();

  program
    .name('fractal-mcp')
    .description('CLI tools for Fractal MCP development')
    .version(packageJson.version);

  program.addCommand(createBundleCommand());

  program.parse(process.argv);
}

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
