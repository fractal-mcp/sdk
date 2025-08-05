import * as z from "zod";
import * as fs from "fs";
import path from "path";
import os from "os";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import { ServerRequest, ServerNotification } from "@modelcontextprotocol/sdk/types.js";
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
export type FractalComponentToolUISpec = { componentBundlePath: string } 

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

export interface GenerateHtmlOptions {
    jsPath: string;
    cssPath?: string;
    title?: string;
    data?: unknown;
  }
  
  /**
   * Generates a full HTML document from a snippet and CSS.
   */
  export const getSourceHtml = (
    html: string,
    css: string,
    title: string = 'Component Preview'
  ): string => {
    return `
  <html lang="en">
  <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
      ${css ? `<style>${css}</style>` : ''}
  </head>
  <body>
      ${html}
  </body>
  </html>`;
  };
  
  export function generateHtml(options: GenerateHtmlOptions): string {
  const { jsPath, cssPath, title, data } = options;
  const js = fs.readFileSync(jsPath, "utf8");
  let css = "";
  if (cssPath && fs.existsSync(cssPath)) {
    css = fs.readFileSync(cssPath, "utf8");
  }
  const encodedJs = Buffer.from(js, "utf8").toString("base64");

  // Read React version from metadata.json in the same directory as jsPath
  let reactVersion = "19"; // fallback
  try {
    const bundleDir = path.dirname(jsPath);
    const metadataPath = path.join(bundleDir, "metadata.json");
    if (fs.existsSync(metadataPath)) {
      const metadata = JSON.parse(fs.readFileSync(metadataPath, "utf8"));
      if (metadata.react_version && metadata.react_version !== "unknown") {
        // Extract major version for esm.sh (e.g., "18.2.0" -> "18")
        reactVersion = metadata.react_version.split('.')[0];
      }
    }
  } catch (error) {
    console.warn(`Failed to read React version from metadata: ${error}`);
  }

  const dataScript =
    data !== undefined
      ? `<script id="fractal-data" type="application/json">${JSON.stringify(data)}</script>`
      : '';

  const snippet = `\n<div id="root"></div>${dataScript}\n<script type="importmap">\n{
    "imports": {
      "react": "https://esm.sh/react@${reactVersion}",
      "react-dom/client": "https://esm.sh/react-dom@${reactVersion}/client"
    }
}</script>\n<script type="module">\nimport React from 'react';\nimport { createRoot } from 'react-dom/client';\nconst dataEl = document.getElementById('fractal-data');\nwindow.__FRACTAL_DATA__ = dataEl ? JSON.parse(dataEl.textContent || '{}') : undefined;\nconst url = 'data:text/javascript;base64,${encodedJs}';\nimport(url).then(mod => {
  const Component = mod.default;
  const root = createRoot(document.getElementById('root'));
  root.render(React.createElement(Component));
});\n</script>`;

return getSourceHtml(snippet, css, title);
}


/**
 * Get the component HTML from the component tool.
 * 
 * @param componentTool 
 * @returns 
 */
export async function getComponentBundle(
    componentTool: FractalComponentTool<any, any>
): Promise<FractalComponentToolBundle | undefined> {
    
    if ('componentPath' in componentTool) {
        throw new Error("'componentPath' has been deprecated -- use 'componentBundlePath' instead")
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

