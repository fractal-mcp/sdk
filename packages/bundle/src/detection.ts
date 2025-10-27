import { readFile } from 'fs/promises';
import { resolve, dirname, join } from 'path';
import type { Framework } from './types.js';

/**
 * Detects framework from package.json dependencies or file extension
 * Returns: 'react' | 'vue' | 'sveltekit' | undefined
 */
export async function detectFramework(entrypoint: string): Promise<Framework> {
  const absoluteEntrypoint = resolve(entrypoint);
  let currentDir = dirname(absoluteEntrypoint);

  while (currentDir !== dirname(currentDir)) {
    try {
      const packageJsonPath = join(currentDir, 'package.json');
      const packageContent = await readFile(packageJsonPath, 'utf-8');
      const packageJson = JSON.parse(packageContent);

      const dependencies = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies,
        ...packageJson.peerDependencies,
      };

      if (dependencies['@sveltejs/kit'] || dependencies['sveltekit']) {
        return 'sveltekit';
      }

      if (dependencies['svelte']) {
        return 'vue';
      }

      if (dependencies['vue'] || dependencies['@vue/runtime-core']) {
        return 'vue';
      }

      if (dependencies['react'] || dependencies['react-dom']) {
        return 'react';
      }

      return undefined;

    } catch (error) {
      // Continue searching parent directories
    }

    currentDir = dirname(currentDir);
  }

  // Fallback: detect from file extension
  if (absoluteEntrypoint.endsWith('.tsx') || absoluteEntrypoint.endsWith('.jsx')) {
    return 'react';
  }

  if (absoluteEntrypoint.endsWith('.vue')) {
    return 'vue';
  }

  if (absoluteEntrypoint.endsWith('.svelte')) {
    return 'vue'; // treating svelte as vue for now
  }

  return undefined;
}
