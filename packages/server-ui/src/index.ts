import { MessagingClient } from '@fractal-mcp/shared-ui';
import { AgentActionCallTool, AgentActionListTools, AgentActionQueryDOM, AgentActionClick, AgentActionEnterText } from '@fractal-mcp/protocol';
import { handshakeForMessagePort } from './handshake';

export type { MessagingClient };

type JsonSchema = Record<string, unknown>;

export type ToolHandler = (args: Record<string, unknown>) => Promise<unknown> | unknown;

export type RegisteredTool = {
  name: string;
  description?: string;
  inputSchema?: JsonSchema;
  handler: ToolHandler;
};

// Minimal MCP-aligned shape for listTools result
export type ListToolsResult = {
  tools: Array<{
    name: string;
    description?: string;
    inputSchema?: JsonSchema;
  }>;
};

export class ServerUIMessenger {
  private readonly messaging: MessagingClient;
  private readonly tools = new Map<string, RegisteredTool>();
  private static instance: ServerUIMessenger | null = null;
  private static initPromise: Promise<ServerUIMessenger> | null = null;
  private readonly renderData: Record<string, unknown> | null = null;

  constructor(messaging: MessagingClient, renderData: Record<string, unknown> | null) {
    console.log('ServerUIMessenger constructor');
    this.messaging = messaging;
    this.renderData = renderData;
    this.setupMCPListeners();
    this.setupDOMActionListeners();
    this.setupResizeObserver();
  }

  static async init(): Promise<ServerUIMessenger> {
    if (ServerUIMessenger.instance) return ServerUIMessenger.instance;
    if (ServerUIMessenger.initPromise) return ServerUIMessenger.initPromise;

    ServerUIMessenger.initPromise = (async () => {
      const {port, renderData} = await handshakeForMessagePort();
      const messaging = new MessagingClient({ port });
      ServerUIMessenger.instance = new ServerUIMessenger(messaging, renderData);
      return ServerUIMessenger.instance;
    })();

    return ServerUIMessenger.initPromise;
  }

  static get(): ServerUIMessenger | null {
    return ServerUIMessenger.instance;
  }

  getRenderData(): Record<string, unknown> | null {
    return this.renderData;
  }

  // Register a callable tool for the parent (MCP-like: name/description/inputSchema)
  registerTool(args: { name: string; handler: ToolHandler; inputSchema?: JsonSchema; description?: string }) {
    const { name, handler, inputSchema, description } = args;
    this.tools.set(name, { name, handler, inputSchema, description });
  }

  setupDOMActionListeners() {
    console.log('setupDOMActionListeners');
    this.messaging.on('queryDom', async (): Promise<string> => {
      const root = document.getElementById('root');
      if (!root) {
          return 'No root element found';
      }
      console.log('queryDom', root.innerHTML);
      return root.innerHTML; // This will include the React-rendered components
  });

    this.messaging.on('click', async (rawPayload: unknown): Promise<'ok' | 'not found'> => {
      const payload = rawPayload as AgentActionClick['payload'];
      const selector = (payload as any)?.selector as string | undefined;
      const el = selector ? document.querySelector(selector) : null;
      if (el instanceof HTMLElement) {
        el.click();
        return 'ok';
      }
      return 'not found';
    });

    this.messaging.on('enterText', async (rawPayload: unknown): Promise<'ok' | 'not found'> => {
      const payload = rawPayload as AgentActionEnterText['payload'];
      const selector = (payload as any)?.selector as string | undefined;
      const text = (payload as any)?.text as string | undefined;
      const el = selector ? document.querySelector(selector) : null;
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
        (el as HTMLInputElement).value = text ?? '';
        return 'ok';
      }
      return 'not found';
    });
  }

  setupMCPListeners() {
    this.messaging.on('listTools', async (_payload: unknown): Promise<ListToolsResult> => {
      const tools = Array.from(this.tools.values()).map(t => ({
        name: t.name,
        description: t.description,
        inputSchema: t.inputSchema,
      }));
      return { tools };
    });

    this.messaging.on('callTool', async (rawPayload: unknown): Promise<unknown> => {
      const payload = rawPayload as AgentActionCallTool['payload'];
      const name: string | undefined = (payload as any)?.name;
      const args: Record<string, unknown> | undefined = (payload as any)?.arguments as any;
      if (!name) throw new Error('Tool name required');
      const tool = this.tools.get(name);
      if (!tool) throw new Error(`Tool not found: ${name}`);
      return await tool.handler(args ?? {});
    });
  }

  // Observe element size and emit resize events to the parent
  setupResizeObserver(rootEl?: HTMLElement): () => void {
    const el = rootEl ?? (document.getElementById('root') as HTMLElement | null) ?? document.documentElement;
    let lastWidth = 0;
    let lastHeight = 0;

    const emitSize = () => {
      const width = el.clientWidth;
      const height = el.clientHeight;
      if (width !== lastWidth || height !== lastHeight) {
        lastWidth = width;
        lastHeight = height;
        this.resize(height, width);
      }
    };

    const ro = new ResizeObserver(() => emitSize());
    ro.observe(el);
    emitSize();

    return () => {
      ro.disconnect();
    };
  }

  notify(message: string) {
    this.messaging.emit({type: 'notify', payload: { message }});
  }

  link(url: string) {
    // Change this back to emit
    console.log('link', url);
    return this.messaging.request({type: 'link', payload: { url }});
  }

  intent(intent: string, params: Record<string, unknown> = {}) {
    this.messaging.emit({type: 'intent', payload: { intent, params }});
  }

  prompt(prompt: string) {
    this.messaging.emit({type: 'prompt', payload: { prompt }});
  }
  
  tool(toolName: string, params: Record<string, unknown>) {
    this.messaging.emit({type: 'tool', payload: { toolName, params }});
  }

  resize(height: number, width: number) {
    this.messaging.emit({type: 'resize', payload: { width, height }});
  }
  
}

export async function initServerUIMessenger(): Promise<ServerUIMessenger> {
  return ServerUIMessenger.init();
}
  
export function getServerUIMessenger(): ServerUIMessenger | null {
  return ServerUIMessenger.get();
}


