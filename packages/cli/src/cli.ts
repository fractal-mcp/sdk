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
    // Project options
    projectName: string;
    outputDirectory: string;
    
    // UI-specific options
    reactVersion: ReactVersion;
    includeTailwind: boolean;
    
    // Server-specific options
    serverFramework: ServerFramework;
}

// Helper function to replace template variables in file content
function replaceTemplateVariables(content: string, variables: Record<string, string>): string {
    let result = content;
    for (const [key, value] of Object.entries(variables)) {
        result = result.replace(new RegExp(`{{${key}}}`, 'g'), value);
    }
    return result;
}

// Helper function to copy and process template files
async function copyTemplate(
    templateDir: string,
    targetDir: string,
    variables: Record<string, string>
): Promise<void> {
    if (!fs.existsSync(templateDir)) {
        throw new Error(`Template directory not found: ${templateDir}`);
    }

    // Create target directory
    fs.mkdirSync(targetDir, { recursive: true });

    // Read all files in template directory
    const files = fs.readdirSync(templateDir, { withFileTypes: true });

    for (const file of files) {
        const sourcePath = path.join(templateDir, file.name);
        const targetPath = path.join(targetDir, file.name.replace('.template', ''));

        if (file.isDirectory()) {
            // Recursively copy subdirectories
            await copyTemplate(sourcePath, targetPath, variables);
        } else {
            // Copy and process file
            const content = fs.readFileSync(sourcePath, 'utf8');
            const processedContent = replaceTemplateVariables(content, variables);
            fs.writeFileSync(targetPath, processedContent);
        }
    }
}

// Helper function to run npm install
function runNpmInstall(directory: string): Promise<void> {
    return new Promise((resolve, reject) => {
        exec('npm install', { cwd: directory }, (error, stdout, stderr) => {
            if (error) {
                reject(new Error(`npm install failed in ${directory}: ${error.message}`));
            } else {
                resolve();
            }
        });
    });
}

// Main implementation
async function createFractalApp(config: CreateFractalAppConfig): Promise<void> {
    const cliDir = path.dirname(new URL(import.meta.url).pathname);
    const templatesDir = path.join(cliDir, '..', 'templates');

    // Ensure output directory exists
    fs.mkdirSync(config.outputDirectory, { recursive: true });

    // Resolve absolute paths for UI and server directories within output directory
    const uiPath = path.resolve(config.outputDirectory, "./ui");
    const serverDirName = "server" // config.serverFramework === "nextjs" ? "app" : "server";
    const serverPath = path.resolve(config.outputDirectory, serverDirName);

    const variables = {
        PROJECT_NAME: config.projectName,
        REACT_VERSION: config.reactVersion,
        SERVER_DIR: serverDirName,
    };

    console.log(`\nCreating Fractal app: ${config.projectName}`);
    console.log(`Output directory: ${config.outputDirectory}`);
    console.log(`UI: React ${config.reactVersion}${config.includeTailwind ? ' + Tailwind' : ''} → ${uiPath}`);
    console.log(`Server: ${config.serverFramework} → ${serverPath}`);

    try {
        // Copy UI template
        const uiTemplate = config.includeTailwind ? 'ui-tailwind' : 'ui-base';
        const uiTemplatePath = path.join(templatesDir, uiTemplate);
        await copyTemplate(uiTemplatePath, uiPath, variables);
        console.log(`✓ UI template copied to ${uiPath}`);

        // Copy server template
        const serverTemplate = config.serverFramework === 'nextjs' ? 'nextjs-server' : 'express-server';
        const serverTemplatePath = path.join(templatesDir, serverTemplate);
        await copyTemplate(serverTemplatePath, serverPath, variables);
        console.log(`✓ Server template copied to ${serverPath}`);

        // Install dependencies
        console.log('\nInstalling dependencies...');
        await Promise.all([
            runNpmInstall(uiPath),
            runNpmInstall(serverPath)
        ]);
        console.log('✓ Dependencies installed');

        // Success message
        console.log(`\n🎉 Fractal app "${config.projectName}" created successfully!`);
        console.log('\nNext steps:');
        console.log(`  cd ${serverPath} && npm run dev  # Start ${config.serverFramework} server`);
        console.log(`  cd ${uiPath} && npm run bundle-all  # Bundle UI components`);
        
    } catch (error) {
        throw new Error(`Failed to create Fractal app: ${error instanceof Error ? error.message : error}`);
    }
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
  .description("Initialize a new Fractal app")
  .option("-y, --yes", "Accept defaults without prompting")
  .option("--project-name <name>", "Project name")
  .option("--output-directory <path>", "Output directory")
  .option("--react-version <version>", "React version (18 or 19)")
  .option("--no-tailwind", "Disable Tailwind CSS (enabled by default)")
  .option("--server-framework <framework>", "Server framework (express or nextjs)")
  .action(async (options) => {
      const spinner = ora("Preparing interactive setup...").start();

      try {
          // Step 1: Collect args from command line
          const cliArgs: Partial<CreateFractalAppConfig> = {};
          
          if (options.projectName) {
              if (!/^[a-zA-Z0-9-_]+$/.test(options.projectName.trim())) {
                  throw new Error("Project name can only contain letters, numbers, hyphens, and underscores");
              }
              cliArgs.projectName = options.projectName.trim();
          }
          
          if (options.outputDirectory) {
              cliArgs.outputDirectory = path.resolve(options.outputDirectory);
          }
          
          if (options.reactVersion) {
              if (!["18", "19"].includes(options.reactVersion)) {
                  throw new Error("React version must be 18 or 19");
              }
              cliArgs.reactVersion = options.reactVersion as ReactVersion;
          }
          
          if (options.noTailwind !== undefined) {
              cliArgs.includeTailwind = !options.noTailwind;
          }
          
          if (options.serverFramework) {
              if (!["express", "nextjs"].includes(options.serverFramework)) {
                  throw new Error("Server framework must be 'express' or 'nextjs'");
              }
              cliArgs.serverFramework = options.serverFramework as ServerFramework;
          }

          // defaults
          const defaultConfig: CreateFractalAppConfig = {
              projectName: "my-fractal-app",
              outputDirectory: "./",
              reactVersion: "19",
              includeTailwind: true,
              serverFramework: "nextjs"
          };

          let finalConfig: CreateFractalAppConfig;

          if (options.yes) {
              // Use CLI args + defaults without prompting
              finalConfig = { ...defaultConfig, ...cliArgs };
              spinner.stop();
          } else {
              // Step 2: Prompt for remaining args
              spinner.stop(); // Stop spinner before prompting
              const questions: PromptObject[] = [];
              
              if (cliArgs.projectName === undefined) {
                  questions.push({
                      type: "text",
                      name: "projectName",
                      message: "Project name",
                      initial: defaultConfig.projectName,
                      validate: (val: string) => {
                          const trimmed = val?.trim();
                          if (!trimmed) return "Project name cannot be empty";
                          if (!/^[a-zA-Z0-9-_]+$/.test(trimmed)) return "Project name can only contain letters, numbers, hyphens, and underscores";
                          return true;
                      }
                  });
              }
              
              if (cliArgs.outputDirectory === undefined) {
                  questions.push({
                      type: "text",
                      name: "outputDirectory",
                      message: "Output directory",
                      initial: defaultConfig.outputDirectory,
                      validate: (val: string) => val?.trim().length > 0 || "Directory cannot be empty"
                  });
              }
              
              if (cliArgs.reactVersion === undefined) {
                  questions.push({
                      type: "select",
                      name: "reactVersion",
                      message: "React Version",
                      choices: [
                          { title: "18", value: "18" },
                          { title: "19", value: "19" }
                      ],
                      initial: defaultConfig.reactVersion === "19" ? 1 : 0
                  });
              }
              
              if (cliArgs.includeTailwind === undefined) {
                  questions.push({
                      type: "confirm",
                      name: "includeTailwind",
                      message: "Include Tailwind CSS?",
                      initial: defaultConfig.includeTailwind
                  });
              }
              
              if (cliArgs.serverFramework === undefined) {
                  questions.push({
                      type: "select",
                      name: "serverFramework",
                      message: "Server framework",
                      choices: [
                          { title: "Express", value: "express" },
                          { title: "Next.js", value: "nextjs" }
                      ],
                      initial: defaultConfig.serverFramework === "nextjs" ? 1 : 0
                  });
              }

              const answers = questions.length > 0 ? await prompts(questions) : {};
              
              // Check if user cancelled prompts
              if (questions.length > 0 && (!answers || Object.keys(answers).length === 0)) {
                  console.log("Operation cancelled.");
                  process.exit(0);
              }

              // Merge CLI args, prompted answers, and defaults
              finalConfig = {
                  projectName: cliArgs.projectName ?? answers.projectName ?? defaultConfig.projectName,
                  outputDirectory: cliArgs.outputDirectory ?? (answers.outputDirectory ? path.resolve(answers.outputDirectory) : path.resolve(defaultConfig.outputDirectory)),
                  reactVersion: cliArgs.reactVersion ?? answers.reactVersion ?? defaultConfig.reactVersion,
                  includeTailwind: cliArgs.includeTailwind ?? answers.includeTailwind ?? defaultConfig.includeTailwind,
                  serverFramework: cliArgs.serverFramework ?? answers.serverFramework ?? defaultConfig.serverFramework
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
