/**
 * Widget registration function
 */

import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { z } from "zod";
import { type OpenAIWidget, getWidgetMeta } from "./types.js";

/**
 * Tool call handler for OpenAI widgets
 */
export type WidgetToolHandler<T = any> = (args: T) => Promise<{
  content: any[];
  structuredContent?: Record<string, any>;
}>;

/**
 * Register an OpenAI widget with an MCP server.
 * 
 * This is a standalone function that registers a widget as:
 * - A tool (for invocation)
 * - A resource (for the widget HTML)
 * - A resource template
 * 
 * @param mcpServer - The McpServer instance to register with
 * @param widget - The OpenAI widget definition
 * @param handler - Handler function for tool invocation
 * 
 * @example
 * ```typescript
 * const server = new McpServer({ name: 'my-server', version: '1.0.0' });
 * 
 * registerOpenAIWidget(server, myWidget, async (args) => ({
 *   content: [
 *     { type: 'text', text: 'Widget rendered!' }
 *   ],
 *   structuredContent: { data: args }
 * }));
 * ```
 */
export function registerOpenAIWidget<TInputSchema extends z.ZodType>(
  mcpServer: McpServer,
  widget: OpenAIWidget<TInputSchema>,
  handler: WidgetToolHandler<z.infer<TInputSchema>>
): void {
  console.log(`[registerOpenAIWidget] Registering widget: ${widget.id}`);
  const widgetMeta = getWidgetMeta(widget);
  console.log(`[registerOpenAIWidget] Widget metadata:`, widgetMeta);

  // Register the tool - pass handler directly, just add _meta to response
  console.log(`[registerOpenAIWidget] Registering tool: ${widget.id}`);
  
  // Build tool config - extract shape from Zod schema if it exists
  const toolConfig: any = {
    title: widget.title,
    description: widget.description || widget.title,
    _meta: widgetMeta
  };
  
  if (widget.inputSchema) {
    // McpServer expects an object with Zod schemas as values, not a Zod object
    // Extract the shape from z.object()
    toolConfig.inputSchema = (widget.inputSchema as any).shape || widget.inputSchema;
  }
  
  console.log(`[registerOpenAIWidget] Tool config for ${widget.id}:`, toolConfig);
  
  mcpServer.registerTool(
    widget.id,
    toolConfig,
    async (args: any) => {
      console.log(`[registerOpenAIWidget] Tool called: ${widget.id}`, args);
      
      try {
        // Validate with Zod schema if provided
        const validatedArgs = widget.inputSchema 
          ? widget.inputSchema.parse(args)
          : args;

        console.log(`[registerOpenAIWidget] Validated args for ${widget.id}:`, validatedArgs);

        // Call user's handler
        const result = await handler(validatedArgs);
        console.log(`[registerOpenAIWidget] Handler result for ${widget.id}:`, result);

        // Just add _meta to the response
        const response = {
          ...result,
          _meta: widgetMeta
        };
        console.log(`[registerOpenAIWidget] Final response for ${widget.id}:`, response);
        return response;
      } catch (error) {
        console.error(`[registerOpenAIWidget] Error in tool ${widget.id}:`, error);
        throw error;
      }
    }
  );

  // Register the resource (static URI)
  console.log(`[registerOpenAIWidget] Registering resource: ${widget.id} at ${widget.templateUri}`);
  mcpServer.registerResource(
    widget.id,
    widget.templateUri,
    {
      name: widget.title,
      description: widget.description || `${widget.title} widget markup`,
      mimeType: "text/html+skybridge",
      _meta: widgetMeta
    },
    async () => {
      console.log(`[registerOpenAIWidget] Resource requested: ${widget.id}`);
      return {
        contents: [
          {
            uri: widget.templateUri,
            mimeType: "text/html+skybridge",
            text: widget.html,
            _meta: widgetMeta
          }
        ]
      };
    }
  );

  // Register the resource template
  console.log(`[registerOpenAIWidget] Registering resource template: ${widget.id}-template`);
  mcpServer.registerResource(
    `${widget.id}-template`,
    new ResourceTemplate(widget.templateUri, {
      list: undefined,
      complete: undefined
    }),
    {
      name: widget.title,
      description: widget.description || `${widget.title} widget markup`,
      mimeType: "text/html+skybridge",
      _meta: widgetMeta
    },
    async () => {
      console.log(`[registerOpenAIWidget] Resource template requested: ${widget.id}-template`);
      return {
        contents: [
          {
            uri: widget.templateUri,
            mimeType: "text/html+skybridge",
            text: widget.html,
            _meta: widgetMeta
          }
        ]
      };
    }
  );
  
  console.log(`[registerOpenAIWidget] Successfully registered widget: ${widget.id}`);
}

