// Output configuration
export type OutputConfig =
  | { type: 'assets' }  // No other options - just main.js and index.css
  | {
      type: 'html';
      inline?: { js?: boolean; css?: boolean };
      rootOnly?: boolean;  // True = snippet, False = full document
    };

// HTML input - no output options, always single file
export interface BundleHTMLOptions {
  /** Path to .html file (absolute or relative to cwd) */
  entrypoint: string;
  /** Output directory path (absolute or relative to cwd) */
  out: string;
}

// React component - doesn't need rootElement (creates its own)
export interface BundleReactOptions {
  /** Path to .tsx or .jsx file (absolute or relative to cwd) */
  entrypoint: string;
  /** Output directory path (absolute or relative to cwd) */
  out: string;
  /** Output configuration. Default: { type: 'html', inline: { js: true, css: true }, rootOnly: false } */
  output?: OutputConfig;
}

// JS entrypoint - needs rootElement for HTML generation
export interface BundleJSOptions {
  /** Path to .ts, .tsx, .js, or .jsx file (absolute or relative to cwd) */
  entrypoint: string;
  /** Output directory path (absolute or relative to cwd) */
  out: string;
  /** Root element ID. Default: 'root' */
  rootElement?: string;
  /** Output configuration. Default: { type: 'html', inline: { js: true, css: true }, rootOnly: false } */
  output?: OutputConfig;
}

// Internal type for bundleWithRoot (keep for backwards compatibility)
export type BundleOptions = {
  entrypoint: string;
  out: string;
};

export type Framework = 'vue' | 'sveltekit' | 'react' | undefined;
