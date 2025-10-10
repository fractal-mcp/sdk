import { Command } from 'commander';
import { bundleHTMLInput, bundleReactComponent, bundleJSEntrypoint } from '@fractal-mcp/bundle';
import type { OutputConfig } from '@fractal-mcp/bundle';
import { resolve, extname } from 'path';
import chalk from 'chalk';

export function createBundleCommand(): Command {
  const bundleCmd = new Command('bundle')
    .description('Bundle a React component, JS/TS entrypoint, or HTML file')
    .requiredOption('--entrypoint <path>', 'Path to entrypoint file (.html, .tsx, .jsx, .ts, .js)')
    .requiredOption('--out <path>', 'Output directory')
    .option('--output-type <type>', 'Output type: "html" or "assets"', 'html')
    .option('--inline-js', 'Inline JavaScript in HTML (only for html output type)', true)
    .option('--no-inline-js', 'Do not inline JavaScript')
    .option('--inline-css', 'Inline CSS in HTML (only for html output type)', true)
    .option('--no-inline-css', 'Do not inline CSS')
    .option('--root-only', 'Generate root element snippet instead of full HTML document', false)
    .option('--root-element <id>', 'Root element ID for JS/TS entrypoints', 'root')
    .action(async (options) => {
      const { 
        entrypoint, 
        out, 
        outputType,
        inlineJs,
        inlineCss,
        rootOnly,
        rootElement
      } = options;
      
      const resolvedEntrypoint = resolve(entrypoint);
      const resolvedOut = resolve(out);
      const ext = extname(resolvedEntrypoint);

      try {
        // Validate output type
        if (outputType !== 'html' && outputType !== 'assets') {
          throw new Error(
            `Invalid output type: ${outputType}\n` +
            `Valid options: html, assets`
          );
        }

        // Build output config (only for non-HTML inputs)
        let outputConfig: OutputConfig | undefined;
        if (ext !== '.html') {
          if (outputType === 'assets') {
            outputConfig = { type: 'assets' };
          } else {
            outputConfig = {
              type: 'html',
              inline: {
                js: inlineJs,
                css: inlineCss
              },
              rootOnly
            };
          }
        }

        // Branch based on input type
        if (ext === '.html') {
          // HTML input - always single file output, no options
          console.log(chalk.blue('Bundling HTML application...'));
          console.log(chalk.gray(`   Entrypoint: ${resolvedEntrypoint}`));
          console.log(chalk.gray(`   Output: ${resolvedOut}`));
          if (outputType !== 'html') {
            console.log(chalk.yellow('   WARNING: Output type ignored for HTML input (always produces single file)'));
          }
          console.log();
          
          await bundleHTMLInput({
            entrypoint: resolvedEntrypoint,
            out: resolvedOut
          });
        } else if (ext === '.tsx' || ext === '.jsx') {
          // React component
          console.log(chalk.blue('Bundling React component...'));
          console.log(chalk.gray(`   Entrypoint: ${resolvedEntrypoint}`));
          console.log(chalk.gray(`   Output: ${resolvedOut}`));
          console.log(chalk.gray(`   Output type: ${outputType}`));
          if (outputType === 'html') {
            console.log(chalk.gray(`   Inline JS: ${inlineJs}`));
            console.log(chalk.gray(`   Inline CSS: ${inlineCss}`));
            console.log(chalk.gray(`   Root only: ${rootOnly}`));
          }
          console.log();
          
          await bundleReactComponent({
            entrypoint: resolvedEntrypoint,
            out: resolvedOut,
            output: outputConfig
          });
        } else if (ext === '.ts' || ext === '.js') {
          // JS/TS entrypoint
          console.log(chalk.blue('Bundling JS/TS entrypoint...'));
          console.log(chalk.gray(`   Entrypoint: ${resolvedEntrypoint}`));
          console.log(chalk.gray(`   Output: ${resolvedOut}`));
          console.log(chalk.gray(`   Root element: #${rootElement}`));
          console.log(chalk.gray(`   Output type: ${outputType}`));
          if (outputType === 'html') {
            console.log(chalk.gray(`   Inline JS: ${inlineJs}`));
            console.log(chalk.gray(`   Inline CSS: ${inlineCss}`));
            console.log(chalk.gray(`   Root only: ${rootOnly}`));
          }
          console.log();
          
          await bundleJSEntrypoint({
            entrypoint: resolvedEntrypoint,
            out: resolvedOut,
            rootElement,
            output: outputConfig
          });
        } else {
          throw new Error(
            `Unsupported file type: ${ext}\n` +
            `Supported types: .html, .tsx, .jsx, .ts, .js`
          );
        }

        // Success message based on output type
        console.log(chalk.green('SUCCESS: Bundle created successfully!'));
        if (outputType === 'assets') {
          console.log(chalk.gray(`   Location: ${resolvedOut}/`));
          console.log(chalk.gray(`   Files: main.js, index.css`));
        } else {
          console.log(chalk.gray(`   Location: ${resolvedOut}/index.html`));
        }
      } catch (error) {
        console.error(chalk.red('ERROR: Bundling failed:'));
        console.error(chalk.red(`  ${error instanceof Error ? error.message : String(error)}`));
        process.exit(1);
      }
    });

  return bundleCmd;
}
