type UnknownObject = Record<string, unknown>;

export type WidgetState = UnknownObject;

export type SetWidgetState = (state: WidgetState) => Promise<void>;

export type Theme = "light" | "dark";

export type SafeAreaInsets = {
  top: number;
  bottom: number;
  left: number;
  right: number;
};

export type SafeArea = {
  insets: SafeAreaInsets;
};

export type UserAgent = {
  //
};

export type WebplusGlobals = {
  // visuals
  theme: Theme;

  userAgent: UserAgent;

  // layout
  maxHeight: number;
  displayMode: DisplayMode;
  safeArea: SafeArea;

  // state
  toolInput: UnknownObject;
  toolOutput: UnknownObject;
  widgetState: UnknownObject | null;
  setWidgetState: SetWidgetState;
};

// currently copied from types.ts in chatgpt/web-sandbox.
// Will eventually use a public package.
type API = {
  // Calling APIs
  streamCompletion: StreamCompletion;
  callCompletion: CallCompletion;
  callTool: CallTool;
  sendFollowUpMessage: SendFollowUpMessage;

  // Layout controls
  requestDisplayMode: RequestDisplayMode;
};

/** Display mode */
export type DisplayMode = "pip" | "inline" | "fullscreen";
export type RequestDisplayMode = (args: { mode: DisplayMode }) => Promise<{
  /**
   * The granted display mode. The host may reject the request.
   * For mobile, PiP is always coerced to fullscreen.
   */
  mode: DisplayMode;
}>;

export type CallToolResponse = {
  result: string;
};

/** Calling APIs */
export type CallTool = (
  name: string,
  args: Record<string, unknown>
) => Promise<CallToolResponse>;

// Subest of the the params for sampling/createMessage
export type ModelHintName = "thinking-none" | "thinking-low" | "thinking-high";

export type CompletionStreamOptions = {
  systemPrompt?: string | null;
  modelType?: ModelHintName;
};

export type Annotations = {
  audience?: ("user" | "assistant")[] | null;
  priority?: number | null;
};

export type TextContent = {
  type: "text";
  text: string;
  annotations?: Annotations | null;
  _meta?: Record<string, never> | null;
};

export type ImageContent = {
  type: "image";
  data: string;
  mimeType: string;
  annotations?: Annotations | null;
  _meta?: Record<string, never> | null;
};

export type AudioContent = {
  type: "audio";
  data: string;
  mimeType: string;
  annotations?: Annotations | null;
  _meta?: Record<string, never> | null;
};

export type SamplingMessage = {
  role: "user" | "assistant";
  content: TextContent | ImageContent | AudioContent;
};

export type ModelHint = {
  name: ModelHintName;
};

export type ModelPreferences = {
  hints: ModelHint[];
};

export type CreateMessageRequestParams = {
  messages: SamplingMessage[];
  modelPreferences: ModelPreferences;
  systemPrompt?: string | null;
  metadata?: Record<string, string> | null;
};

export type CreateMessageResponse = {
  content: TextContent | ImageContent | AudioContent;
  model: string;
  role: "assistant";
  stopReason?: string;
};

// this is the MCP sample stream
export type StreamCompletion = (
  request: CreateMessageRequestParams
) => AsyncIterable<CreateMessageResponse>;

export type CallCompletion = (
  request: CreateMessageRequestParams
) => Promise<CreateMessageResponse>;

export type SendFollowUpMessage = (args: { prompt: string }) => Promise<void>;

/** Extra events */
export const SET_GLOBALS_EVENT_TYPE = "webplus:set_globals";
export class SetGlobalsEvent extends CustomEvent<{
  globals: Partial<WebplusGlobals>;
}> {
  readonly type = SET_GLOBALS_EVENT_TYPE;
}

export const TOOL_RESPONSE_EVENT_TYPE = "webplus:tool_response";
export class ToolResponseEvent extends CustomEvent<{
  tool: { name: string; args: UnknownObject };
}> {
  readonly type = TOOL_RESPONSE_EVENT_TYPE;
}

/**
 * Global oai object injected by the web sandbox for communicating with chatgpt host page.
 */
declare global {
  interface Window {
    webplus: API & WebplusGlobals;
    openai: API & WebplusGlobals;
  }

  interface WindowEventMap {
    [SET_GLOBALS_EVENT_TYPE]: SetGlobalsEvent;
    [TOOL_RESPONSE_EVENT_TYPE]: ToolResponseEvent;
  }
}
