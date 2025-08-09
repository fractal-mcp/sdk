#!/usr/bin/env node
import * as fs from "fs";
import * as path from "path";
import { exec } from "child_process";
import { Command } from "commander";
import ora from "ora";
import prompts, { PromptObject } from "prompts";
import { bundle } from "@fractal-mcp/bundle";

import {
  introspectServerUrl,
  generateToolTypes,
} from "@fractal-mcp/generate";
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

// Shared function to handle individual bundling with spinner updates
async function bundleSingleComponent(
  entrypoint: string,
  outputDir: string,
  componentName?: string,
  spinner?: any
): Promise<{ jsPath: string; cssPath?: string }> {
  const componentBaseName = path.basename(entrypoint, path.extname(entrypoint));
  
  if (spinner) {
    spinner.text = `Bundling ${componentBaseName}...`;
  }

  const result = await bundle({
    entrypoint,
    dst: outputDir,
    componentName: componentName || componentBaseName,
  });

  return result;
}

// Helper function to find all .tsx files in a directory
function findTsxFiles(directory: string): string[] {
  const files: string[] = [];
  
  function scanDirectory(dir: string) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        scanDirectory(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.tsx')) {
        files.push(fullPath);
      }
    }
  }
  
  scanDirectory(directory);
  return files;
}

// Helper function to display bundling results
function displayBundleResults(outputDir: string, componentName?: string) {
  const files = fs.readdirSync(outputDir);
  if (files.length > 0) {
    console.log(`Generated files${componentName ? ` for ${componentName}` : ''}:`);
    files.forEach((file) => console.log(`   - ${file}`));
  }
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
      await bundleSingleComponent(
        options.entrypoint,
        options.dst,
        options.name,
        spinner
      );

      spinner.succeed(`Bundle created successfully in ${options.dst}`);
      displayBundleResults(options.dst);
    } catch (error) {
      spinner.fail("Bundle failed");
      console.error(error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Bundle-all command
program
  .command("bundle-all")
  .description("Bundle all .tsx files in a subdirectory into separate output directories")
  .requiredOption(
    "-s, --source <path>",
    "Source subdirectory containing .tsx files to bundle",
  )
  .requiredOption(
    "-d, --dst <path>", 
    "Output directory path (parent directory for all bundles)"
  )
  .action(async (options) => {
    const spinner = ora("Starting bundle-all process...").start();

    try {
      // Resolve paths
      const sourceDir = path.resolve(options.source);
      const outputDir = path.resolve(options.dst);

      // Validate source directory exists
      if (!fs.existsSync(sourceDir)) {
        throw new Error(`Source directory not found: ${sourceDir}`);
      }

      if (!fs.statSync(sourceDir).isDirectory()) {
        throw new Error(`Source path is not a directory: ${sourceDir}`);
      }

      // Find all .tsx files
      spinner.text = "Scanning for .tsx files...";
      const tsxFiles = findTsxFiles(sourceDir);

      if (tsxFiles.length === 0) {
        spinner.warn(`No .tsx files found in ${sourceDir}`);
        return;
      }

      spinner.text = `Found ${tsxFiles.length} .tsx file(s), starting bundling...`;

      // Ensure output directory exists
      fs.mkdirSync(outputDir, { recursive: true });

      const results: Array<{ componentName: string; outputPath: string; success: boolean; error?: string }> = [];

      // Bundle each file
      for (let i = 0; i < tsxFiles.length; i++) {
        const tsxFile = tsxFiles[i];
        const componentName = path.basename(tsxFile, '.tsx');
        const componentOutputDir = path.join(outputDir, componentName);
        
        try {
          spinner.text = `Bundling ${componentName} (${i + 1}/${tsxFiles.length})...`;
          
          // Create component-specific output directory
          fs.mkdirSync(componentOutputDir, { recursive: true });
          
          await bundleSingleComponent(tsxFile, componentOutputDir, componentName);
          
          results.push({
            componentName,
            outputPath: componentOutputDir,
            success: true,
          });
        } catch (error) {
          results.push({
            componentName,
            outputPath: componentOutputDir,
            success: false,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      // Report results
      const successful = results.filter(r => r.success);
      const failed = results.filter(r => !r.success);

      if (successful.length > 0) {
        spinner.succeed(`Bundle-all completed: ${successful.length}/${tsxFiles.length} components bundled successfully`);
        
        console.log("\n✅ Successfully bundled components:");
        successful.forEach(result => {
          console.log(`   ${result.componentName} → ${path.relative(process.cwd(), result.outputPath)}`);
        });
      }

      if (failed.length > 0) {
        console.log(`\n❌ Failed to bundle ${failed.length} component(s):`);
        failed.forEach(result => {
          console.log(`   ${result.componentName}: ${result.error}`);
        });
        
        if (successful.length === 0) {
          spinner.fail("All bundles failed");
          process.exit(1);
        }
      }

    } catch (error) {
      spinner.fail("Bundle-all failed");
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



// --- types ---
type ReactVersion = "18" | "19";
type ServerFramework = "express" | "nextjs";

interface CreateFractalAppConfig {
    reactVersion: ReactVersion;
    serverFramework: ServerFramework;
    serverPath: string;
    uiPath: string;
}

// --- stubbed impl for this step ---
async function createFractalApp(config: CreateFractalAppConfig): Promise<void> {
    // dummy for step 1
    console.log("\ncreateFractalApp() received config:");
    console.log(JSON.stringify(config, null, 4));
}

// Small helper to fail gracefully when user cancels a prompt
function assertNotCancelled<T extends Record<string, unknown>>(answers: T): T {
    if (!answers || (answers as any).__cancelled) {
        console.log("Operation cancelled.");
        process.exit(0);
    }
    return answers;
}

// --- command ---
program
  .command("create")
  .description("Interactively initialize a new Fractal app (step 1: gather config)")
  .option("-y, --yes", "Accept defaults without prompting")
  .action(async (options) => {
      const spinner = ora("Preparing interactive setup...").start();

      try {
          // defaults
          const defaultConfig: CreateFractalAppConfig = {
              reactVersion: "19",
              serverFramework: "nextjs",
              serverPath: "./server/",
              uiPath: "./ui/"
          };

          spinner.stop();

          let finalConfig: CreateFractalAppConfig;

          if (options.yes) {
              // Skip prompts; take defaults
              finalConfig = defaultConfig;
              console.log("Using defaults (--yes):");
              console.log(JSON.stringify(finalConfig, null, 4));
          } else {
              // Interactive prompts
              const questions: PromptObject[] = [
                  {
                      type: "select",
                      name: "reactVersion",
                      message: "React Version",
                      choices: [
                          { title: "18", value: "18" },
                          { title: "19", value: "19" }
                      ],
                      initial: 1 // default to 19
                  },
                  {
                      type: "select",
                      name: "serverFramework",
                      message: "Server framework",
                      choices: [
                          { title: "Express", value: "express" },
                          { title: "Next.js", value: "nextjs" }
                      ],
                      initial: 1 // default to nextjs
                  },
                  {
                      type: "text",
                      name: "serverPath",
                      message: "Server path",
                      initial: "./server/",
                      validate: (val: string) => val?.trim().length > 0 || "Path cannot be empty"
                  },
                  {
                      type: "text",
                      name: "uiPath",
                      message: "UI path",
                      initial: "./ui/",
                      validate: (val: string) => val?.trim().length > 0 || "Path cannot be empty"
                  }
              ];

              const onCancel = () => {
                  // mark a cancellation so we can exit cleanly
                  return { __cancelled: true } as any;
              };

              const answers = (await prompts(questions, { onCancel })) as any;
              assertNotCancelled(answers);

              finalConfig = {
                  reactVersion: answers.reactVersion as ReactVersion,
                  serverFramework: answers.serverFramework as ServerFramework,
                  serverPath: answers.serverPath,
                  uiPath: answers.uiPath
              };
          }

          const runSpinner = ora("Calling createFractalApp...").start();
          await createFractalApp(finalConfig);
          runSpinner.succeed("Done.");
      } catch (err) {
          spinner.fail("Initialization failed");
          console.error(err instanceof Error ? err.message : err);
          process.exit(1);
      }
  });


// Handle the case where no command is provided
if (process.argv.length <= 2) {
  program.help();
}

program.parse();
