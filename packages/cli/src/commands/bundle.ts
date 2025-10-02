import { Command } from 'commander';
import { bundle, bundleReactComponent } from '@fractal-mcp/bundle';
import { resolve, extname } from 'path';
import chalk from 'chalk';

export function createBundleCommand(): Command {
  const bundleCmd = new Command('bundle')
    .description('Bundle a React component or HTML file into a self-contained HTML file')
    .requiredOption('--entrypoint <path>', 'Path to .tsx component or .html file')
    .requiredOption('--out <path>', 'Output directory for bundled index.html')
    .action(async (options) => {
      const { entrypoint, out } = options;
      const resolvedEntrypoint = resolve(entrypoint);
      const resolvedOut = resolve(out);
      const ext = extname(resolvedEntrypoint);

      try {
        if (ext === '.tsx' || ext === '.jsx') {
          console.log(chalk.blue('🔨 Bundling React component...'));
          console.log(chalk.gray(`   Entrypoint: ${resolvedEntrypoint}`));
          console.log(chalk.gray(`   Output: ${resolvedOut}\n`));
          
          await bundleReactComponent({
            entrypoint: resolvedEntrypoint,
            out: resolvedOut
          });
        } else if (ext === '.html') {
          console.log(chalk.blue('🔨 Bundling HTML application...'));
          console.log(chalk.gray(`   Entrypoint: ${resolvedEntrypoint}`));
          console.log(chalk.gray(`   Output: ${resolvedOut}\n`));
          
          await bundle({
            entrypoint: resolvedEntrypoint,
            out: resolvedOut
          });
        } else {
          throw new Error(
            `Unsupported file type: ${ext}\n` +
            `Supported types: .tsx, .jsx, .html`
          );
        }

        console.log(chalk.green('✓ Bundle created successfully!'));
        console.log(chalk.gray(`   Location: ${resolvedOut}/index.html`));
      } catch (error) {
        console.error(chalk.red('✗ Bundling failed:'));
        console.error(chalk.red(`  ${error instanceof Error ? error.message : String(error)}`));
        process.exit(1);
      }
    });

  return bundleCmd;
}
