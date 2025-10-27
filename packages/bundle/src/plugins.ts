import { viteSingleFile } from 'vite-plugin-singlefile';
import type { Plugin, PluginOption } from 'vite';
import type { BundleOptions } from './types.js';
import { detectFramework } from './detection.js';

/**
 * Returns appropriate Vite plugins based on detected framework
 */
export async function getVitePlugins(
  args: BundleOptions,
  options?: { useSingleFile?: boolean },
): Promise<Plugin[]> {
  const framework = await detectFramework(args.entrypoint);
  const plugins: (Plugin | Plugin[])[] = [];

  switch (framework) {
    case 'react': {
      const react = await import('@vitejs/plugin-react').then(m => m.default);
      plugins.push(...react());
      break;
    }
    case 'vue': {
      try {
        const vue = await import('@vitejs/plugin-vue').then(m => m.default);
        plugins.push(vue());
      } catch (error) {
        console.warn('Vue plugin not found, skipping');
      }
      break;
    }
    case 'sveltekit': {
      try {
        const { svelte } = await import('@sveltejs/vite-plugin-svelte');
        plugins.push(...svelte());
      } catch (error) {
        console.warn('Svelte plugin not found, skipping');
      }
      break;
    }
    default:
      // No framework-specific plugin needed
      break;
  }

  // Important: single-file plugin must run LAST, after framework/Tailwind/PostCSS transforms
  // Only add it if explicitly requested (default: true for backwards compatibility)
  const useSingleFile = options?.useSingleFile !== false;
  if (useSingleFile) {
    const singleFilePlugin = viteSingleFile();
    if (singleFilePlugin) {
      plugins.push(singleFilePlugin as Plugin);
    }
  }

  return plugins.flat();
}
