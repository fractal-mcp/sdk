import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import {
  SSEClientTransport,
  type SSEClientTransportOptions
} from "@modelcontextprotocol/sdk/client/sse.js";
import type {
  CallToolResult,
  Implementation,
  ListToolsResult,
  ReadResourceResult
} from "@modelcontextprotocol/sdk/types.js";
import { jsonSchema, type JSONSchema7, type Tool as VercelTool } from "ai";

const DEFAULT_CLIENT_INFO: Implementation = {
  name: "@fractal-mcp/oai-client",
  version: "1.0.0"
};

const DEFAULT_SSE_PATH = "/mcp";
const RESOLVED_RESOURCES_KEY = "fractal/resolvedResources";
const OUTPUT_TEMPLATE_KEY = "openai/outputTemplate";
const WIDGET_HTML_KEY = "openai/widgetHtml";

type MetadataRecord = Record<string, unknown>;

type ResourceReference = {
  key: string;
  uri: string;
};

function toUrl(input: string | URL): URL {
  return input instanceof URL ? new URL(input.toString()) : new URL(input);
}

function isRecord(value: unknown): value is MetadataRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function looksLikeWidgetUri(value: unknown): value is string {
  return typeof value === "string" && value.startsWith("ui://");
}

function isTextContent(content: ReadResourceResult["contents"][number]): content is ReadResourceResult["contents"][number] & {
  text: string;
} {
  return "text" in content && typeof content.text === "string";
}

function collectResourceReferences(meta: MetadataRecord): ResourceReference[] {
  const references: ResourceReference[] = [];
  for (const [key, value] of Object.entries(meta)) {
    if (looksLikeWidgetUri(value)) {
      references.push({ key, uri: value });
    }
  }
  return references;
}

async function fetchResourceText(
  reader: (uri: string) => Promise<ReadResourceResult>,
  uri: string
): Promise<string | undefined> {
  const result = await reader(uri);
  for (const content of result.contents) {
    if (isTextContent(content)) {
      return content.text;
    }
  }
  return undefined;
}

function mergeResolvedResources(
  original: unknown,
  updates: Map<string, string>
): Record<string, string> {
  const base: Record<string, string> = isRecord(original)
    ? Object.fromEntries(
        Object.entries(original).filter((entry): entry is [string, string] => typeof entry[1] === "string")
      )
    : {};
  for (const [uri, text] of updates.entries()) {
    base[uri] = text;
  }
  return base;
}

/**
 * Resolve metadata resource references and return an updated metadata record.
 *
 * @returns A new metadata record when references were resolved, otherwise undefined.
 */
export async function resolveResourceMetadata(
  meta: MetadataRecord,
  reader: (uri: string) => Promise<ReadResourceResult>
): Promise<MetadataRecord | undefined> {
  const references = collectResourceReferences(meta);
  if (references.length === 0) {
    return undefined;
  }

  const resolvedTexts = new Map<string, string>();
  for (const reference of references) {
    if (resolvedTexts.has(reference.uri)) {
      continue;
    }
    const text = await fetchResourceText(reader, reference.uri);
    if (text !== undefined) {
      resolvedTexts.set(reference.uri, text);
    }
  }

  if (resolvedTexts.size === 0) {
    return undefined;
  }

  const updatedMeta: MetadataRecord = { ...meta };
  updatedMeta[RESOLVED_RESOURCES_KEY] = mergeResolvedResources(
    meta[RESOLVED_RESOURCES_KEY],
    resolvedTexts
  );

  const templateHtml = resolvedTexts.get(meta[OUTPUT_TEMPLATE_KEY] as string);
  if (
    templateHtml !== undefined &&
    (updatedMeta[WIDGET_HTML_KEY] === undefined || typeof updatedMeta[WIDGET_HTML_KEY] !== "string")
  ) {
    updatedMeta[WIDGET_HTML_KEY] = templateHtml;
  }

  return updatedMeta;
}

export type ProcessedToolResult = CallToolResult & {
  _meta?: MetadataRecord & {
    [RESOLVED_RESOURCES_KEY]?: Record<string, string>;
    [WIDGET_HTML_KEY]?: string;
  };
};

export interface OpenAIClientOptions {
  /** Base URL for the OpenAI app server. */
  url: string | URL;
  /** Optional SSE path (defaults to "/mcp"). */
  ssePath?: string;
  /** Custom client identification information. */
  clientInfo?: Implementation;
  /** Additional options for the SSE transport. */
  transportOptions?: SSEClientTransportOptions;
}

type ToolList = ListToolsResult["tools"];

export type VercelCompatibleTool = VercelTool<Record<string, unknown>, ProcessedToolResult>;

export class OpenAIClient {
  private readonly client: Client;
  private readonly baseUrl: URL;
  private toolCache?: ToolList;

  private constructor(
    client: Client,
    baseUrl: URL
  ) {
    this.client = client;
    this.baseUrl = baseUrl;
  }

  static async connect(options: OpenAIClientOptions): Promise<OpenAIClient> {
    const baseUrl = toUrl(options.url);
    const ssePath = options.ssePath ?? DEFAULT_SSE_PATH;
    const sseUrl = new URL(ssePath, baseUrl);
    const client = new Client(options.clientInfo ?? DEFAULT_CLIENT_INFO);
    const transport = new SSEClientTransport(sseUrl, options.transportOptions);
    await client.connect(transport);
    return new OpenAIClient(client, baseUrl);
  }

  get url(): URL {
    return this.baseUrl;
  }

  async close(): Promise<void> {
    await this.client.close();
  }

  private async ensureTools(forceRefresh = false): Promise<ToolList> {
    if (!this.toolCache || forceRefresh) {
      const { tools } = await this.client.listTools();
      this.toolCache = tools;
    }
    return this.toolCache;
  }

  async listTools(forceRefresh = false): Promise<ToolList> {
    return this.ensureTools(forceRefresh);
  }

  async callTool(
    name: string,
    args?: Record<string, unknown>
  ): Promise<ProcessedToolResult> {
    await this.ensureTools();
    const result = (await this.client.callTool({
      name,
      arguments: args
    })) as CallToolResult;

    if (!result._meta) {
      return result;
    }

    const enrichedMeta = await resolveResourceMetadata(result._meta, async (uri) =>
      this.client.readResource({ uri })
    );

    if (!enrichedMeta) {
      return result;
    }

    return {
      ...result,
      _meta: enrichedMeta
    };
  }

  async toVercelTools(): Promise<Record<string, VercelCompatibleTool>> {
    const tools = await this.ensureTools();
    const toolEntries = tools.map((tool) => {
      const schema = (tool.inputSchema ?? {
        type: "object",
        properties: {},
        additionalProperties: true
      }) as JSONSchema7;

      const execute: VercelCompatibleTool["execute"] = async (input, options) => {
        void options; // Options are currently unused but retained for signature compatibility.
        const args = isRecord(input) ? (input as Record<string, unknown>) : {};
        return this.callTool(tool.name, args);
      };

      const vercelTool: VercelCompatibleTool = {
        description: tool.description ?? undefined,
        inputSchema: jsonSchema(schema),
        execute
      };

      return [tool.name, vercelTool] as const;
    });

    return Object.fromEntries(toolEntries);
  }
}

export default OpenAIClient;
