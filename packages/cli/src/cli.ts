#!/usr/bin/env node
import * as fs from "fs";
import * as path from "path";
import { exec } from "child_process";
import { Command } from "commander";
import ora from "ora";
import { bundle } from "@fractal-mcp/bundle";

import {
  introspectServerUrl,
  generateToolTypes,
} from "@fractal-mcp/generate";
import { startServer } from "@fractal-mcp/preview";
import * as readline from "readline";


// Helper function to prompt user
function promptUser(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

const program = new Command();

program
  .name("fractal")
  .description(
    "Fractal CLI - A tool for developing Fractal components",
  )
  .version("1.0.0");

// Bundle command
program
  .command("bundle")
  .description("Bundle a component into JavaScript and CSS files")
  .requiredOption(
    "-e, --entrypoint <path>",
    "Path to the component entrypoint file (.tsx, .jsx, .js)",
  )
  .requiredOption("-d, --dst <path>", "Output directory path")
  .option("-n, --name <name>", "Custom component name (defaults to filename)")
  .action(async (options) => {
    const spinner = ora("Starting bundle process...").start();

    try {
      spinner.text = `Bundling ${path.basename(options.entrypoint)}...`;

      const { jsPath, cssPath } = await bundle({
        entrypoint: options.entrypoint,
        dst: options.dst,
        componentName: options.name,
      });


      spinner.succeed(`Bundle created successfully in ${options.dst}`);

      const files = fs.readdirSync(options.dst);
      if (files.length > 0) {
        console.log("Generated files:");
        files.forEach((file) => console.log(`   - ${file}`));
      }
    } catch (error) {
      spinner.fail("Bundle failed");
      console.error(error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });


// Generate command
program
  .command("generate")
  .description("Generate TypeScript types from MCP server tool schemas")
  .requiredOption(
    "-s, --server-url <url>",
    "URL of the MCP server to introspect",
  )
  .option(
    "-o, --output-dir <dir>",
    "Output directory (defaults to ./fractal-generated)",
    "./fractal-generated",
  )
  .option("-y, --yes", "Skip confirmation prompts")
  .action(async (options) => {
    const spinner = ora("Starting type generation...").start();

    try {
      // Check if output directory exists and prompt if needed
      const outputDir = path.resolve(options.outputDir);
      if (fs.existsSync(outputDir) && !options.yes) {
        spinner.stop();
        const answer = await promptUser(
          `Directory ${outputDir} already exists. Continue? (y/N): `,
        );
        if (answer.toLowerCase() !== "y" && answer.toLowerCase() !== "yes") {
          console.log("Operation cancelled.");
          process.exit(0);
        }
        spinner.start("Continuing type generation...");
      }
      spinner.text = "Introspecting MCP server...";

      // Call introspectServerUrl to get the tool schemas
      const toolSchemas = await introspectServerUrl(options.serverUrl);

      if (!toolSchemas || toolSchemas.length === 0) {
        spinner.warn("No tools found on the server");
        return;
      }

      spinner.text = `Found ${toolSchemas.length} tool(s), generating TypeScript types...`;

      // Generate TypeScript types from the schemas
      const generatedTypes = await generateToolTypes(toolSchemas);

      // Create fractal-generated subdirectory inside the output directory
      const fractalGeneratedDir = path.join(outputDir, "fractal-generated");
      if (!fs.existsSync(fractalGeneratedDir)) {
        fs.mkdirSync(fractalGeneratedDir, { recursive: true });
      }

      // Write to index.ts file in the fractal-generated subdirectory
      const outputPath = path.join(fractalGeneratedDir, "index.ts");
      fs.writeFileSync(outputPath, generatedTypes);

      spinner.succeed(`Types generated successfully: ${outputPath}`);
      console.log(`Generated types for ${toolSchemas.length} tool(s):`);
      toolSchemas.forEach((tool: any) => console.log(`   - ${tool.name}`));
    } catch (error) {
      spinner.fail("Type generation failed");
      console.error(error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Preview command
program
  .command("preview")
  .description("Start the Fractal preview development server")
  .option("-p, --port <port>", "Port to run the server on", "3000")
  .option("--no-open", "Don't automatically open browser")
  .action(async (options) => {
    const spinner = ora("Starting Fractal preview server...").start();

    try {
      const port = parseInt(options.port);
      
      spinner.text = `Starting server on port ${port}...`;
      
      // Start the Vite dev server programmatically
      const server = await startServer(port);
      
      // Get the actual port (in case the requested port was in use)
      const actualPort = server.config.server.port || port;
      const url = `http://localhost:${actualPort}/`;
      
      spinner.succeed(`✅ Fractal preview server started successfully!`);
      console.log(`🚀 Server running at:`);
      console.log(`   Local:   ${url}`);
      console.log(`   Network: Check terminal output above for network URL`);
      console.log(`\nPress Ctrl+C to stop the server`);
      
      // Automatically open browser unless --no-open flag is used
      if (options.open !== false) {
        try {
          const openCommand = process.platform === 'darwin' ? 'open' : 
                            process.platform === 'win32' ? 'start' : 'xdg-open';
          exec(`${openCommand} ${url}`, (error) => {
            if (error) {
              console.log(`\n💡 Could not automatically open browser. Please visit: ${url}`);
            } else {
              console.log(`\n🌐 Opened ${url} in your default browser`);
            }
          });
        } catch (error) {
          console.log(`\n💡 Could not automatically open browser. Please visit: ${url}`);
        }
      }
      
      // Handle graceful shutdown
      const shutdown = () => {
        console.log('\n🛑 Shutting down server...');
        server.close().then(() => {
          console.log('✅ Server stopped');
          process.exit(0);
        });
      };
      
      process.on('SIGINT', shutdown);
      process.on('SIGTERM', shutdown);
      
    } catch (error) {
      spinner.fail("❌ Failed to start preview server");
      console.error(error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program
  .command("deploy")
  .description("Deploy components (coming soon)")
  .action(() => {
    console.log("Deploy command coming soon!");
  });

// Handle the case where no command is provided
if (process.argv.length <= 2) {
  program.help();
}

program.parse();
