import * as z from "zod";
import * as fs from "fs";
import path from "path";
import os from "os";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import { ServerRequest, ServerNotification } from "@modelcontextprotocol/sdk/types.js";

// Useful for demo purposes
// Consider removing when we move to production
import bundle, { generateHtml } from "@fractal-mcp/bundle"

export type McpInput = { [x: string]: any };
 

/**
 * Every tool should have a name, description, and input schema.
 */
export type BasicToolSchemaInfo = {
    name: string;
    description: string;
    inputSchema: z.ZodRawShape;
    outputSchema?: z.ZodRawShape;
    // annotations?: Record<string, any>;
    price?: number;
}

export type FractalComponentToolBundle =
    | { html: string }
    | { jsPath: string; cssPath?: string };

export type WithComponentBundle<TData> =
    | {
          data: TData;
          component: FractalComponentToolBundle;
      }
    | {
          error: string;
      };

/**
 * Options:
 * - componentPath - a path to a raw unbundled component
 * - componentBundlePath - a path to a bundled component
 * - Or specify both the bundled JSX and CSS files directly
 */
export type FractalComponentToolUISpec = { componentPath: string } 
    | { componentBundlePath: string } 
    | { componentBundleHtmlPath: string } ;

export type FractalComponentToolHandler<TInput extends McpInput, TOutput> = (args: TInput, extra: RequestHandlerExtra<ServerRequest, ServerNotification>) => Promise<TOutput>;

/**
 * A dynamic component tool doesn't know what its UI will look like until it's run.
 * -> No UI spec is required at tool registration time.
 * -> The tool must return a component bundle in its response.
 */
export type FractalDynamicComponentTool<TInput extends McpInput, TData> = BasicToolSchemaInfo & {
    componentHandler: FractalComponentToolHandler<TInput, WithComponentBundle<TData>>;
}

/**
 * A static component tool knows what its UI will look like at tool registration time.
 * -> A UI spec is required at tool registration time.
 * -> The tool does not return a component bundle in its response.
 */
export type FractalStaticComponentTool<TInput extends McpInput, TData> = BasicToolSchemaInfo & FractalComponentToolUISpec & {
    handler: FractalComponentToolHandler<TInput, TData>;
}

export type FractalComponentTool<TInput extends McpInput, TData> = FractalDynamicComponentTool<TInput, TData> | FractalStaticComponentTool<TInput, TData>;

/**
 * Get the component HTML from the component tool.
 * 
 * @param componentTool 
 * @returns 
 */
export async function getComponentBundle(
    componentTool: FractalComponentTool<any, any>
): Promise<FractalComponentToolBundle | undefined> {

    // Danger! This is super nice for dev, but don't do this in production!
    // It is HIGHLY RECOMMENDED to prebundle your components before shipping them to the client.
    if ('componentPath' in componentTool) {
        const tmpComponentDir = await fs.promises.mkdtemp(
            path.join(os.tmpdir(), 'fractal-component-')
        );
        const result = await bundle({
            entrypoint: componentTool.componentPath,
            dst: tmpComponentDir,
        });
        return {
            jsPath: result.jsPath,
            cssPath: result.cssPath,
        };
    }
    
    // Recommended for production.
    if ('componentBundlePath' in componentTool) {
        const htmlPath = path.join(componentTool.componentBundlePath, 'index.html');
        if (fs.existsSync(htmlPath)) {
            const html = await fs.promises.readFile(htmlPath, 'utf-8');
            return { html };
        }
        const jsPath = path.join(componentTool.componentBundlePath, 'Component.jsx');
        const cssPath = path.join(componentTool.componentBundlePath, 'index.css');
        return {
            jsPath,
            cssPath: fs.existsSync(cssPath) ? cssPath : undefined,
        };
    }

    // Recommended if you need more - takes a raw html path
    if ('componentBundleHtmlPath' in componentTool) {
        const html = await fs.promises.readFile(componentTool.componentBundleHtmlPath, "utf-8");
        return { html };
    }

    return undefined
}

/**
 * Register a component tool with the server.
 * 
 * @param server 
 * @param componentTool 
 */
export function registerComponentTool<TInput extends McpInput, TData>(server: McpServer, componentTool: FractalComponentTool<TInput, TData>) {
    const handler = async (args: McpInput, extra: RequestHandlerExtra<ServerRequest, ServerNotification>) => {
        let dataWithComponent: WithComponentBundle<TData>;

        // Dynamic case
        if ('componentHandler' in componentTool) {
            dataWithComponent = await componentTool.componentHandler(args as TInput, extra);
        }

        // Static case
        else if ('handler' in componentTool) {
            const data = await componentTool.handler(args as TInput, extra) as TData;
            const bundle = await getComponentBundle(componentTool);
            if (!bundle) {
                throw new Error(
                    "Improperly configured component tool: Could not find component information or 'componentHandler'"
                );
            }
            dataWithComponent = { data, component: bundle };
        } else {
            throw new Error(
                "Improperly configured component tool: Must specify either 'handler' or 'componentHandler'"
            );
        }

        // Convert bundle with JS/CSS paths into final HTML
        if (
            'data' in dataWithComponent &&
            'component' in dataWithComponent &&
            'jsPath' in dataWithComponent.component
        ) {
            const html = generateHtml({
                jsPath: dataWithComponent.component.jsPath,
                cssPath: dataWithComponent.component.cssPath,
                data: dataWithComponent.data,
            });
            dataWithComponent = {
                data: dataWithComponent.data,
                component: { html },
            };
        }
        
        return {
            content: [{ type: "text", text: JSON.stringify(dataWithComponent) } as const]
        };
    }

    const annotations: Record<string, any> = { ui: true };
    if (componentTool.price) {
        annotations.price = componentTool.price;
    }

    server.registerTool(componentTool.name, {
        description: componentTool.description || "",
        inputSchema: componentTool.inputSchema,
        outputSchema: componentTool.outputSchema,
        annotations: annotations
    },  handler);
}

