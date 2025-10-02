export type BundleOptions = {
  /** Path to .tsx component or .html file (absolute or relative to cwd) */
  entrypoint: string;
  /** Output directory path for bundled index.html (absolute or relative to cwd) */
  out: string;
};

export type Framework = 'vue' | 'sveltekit' | 'react' | undefined;
