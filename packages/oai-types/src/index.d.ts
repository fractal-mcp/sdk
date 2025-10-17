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
export type DeviceType = "mobile" | "tablet" | "desktop" | "unknown";
export type UserAgent = {
    device: {
        type: DeviceType;
    };
    capabilities: {
        hover: boolean;
        touch: boolean;
    };
};
export type WebplusGlobals = {
    theme: Theme;
    userAgent: UserAgent;
    maxHeight: number;
    displayMode: DisplayMode;
    safeArea: SafeArea;
    toolInput: UnknownObject;
    toolOutput: UnknownObject;
    widgetState: UnknownObject | null;
    setWidgetState: SetWidgetState;
};
export type OpenAiGlobals<ToolInput extends UnknownObject = UnknownObject, ToolOutput extends UnknownObject = UnknownObject, ToolResponseMetadata extends UnknownObject = UnknownObject, WidgetState extends UnknownObject = UnknownObject> = {
    theme: Theme;
    userAgent: UserAgent;
    locale: string;
    maxHeight: number;
    displayMode: DisplayMode;
    safeArea: SafeArea;
    toolInput: ToolInput;
    toolOutput: ToolOutput | null;
    toolResponseMetadata: ToolResponseMetadata | null;
    widgetState: WidgetState | null;
};
export type LegacyAPI = {
    streamCompletion: StreamCompletion;
    callCompletion: CallCompletion;
    callTool: CallTool;
    sendFollowUpMessage: SendFollowUpMessage;
    requestDisplayMode: RequestDisplayMode;
};
export type OpenAiAPI<WidgetState extends UnknownObject = UnknownObject> = {
    /** Calls a tool on your MCP. Returns the full response. */
    callTool: (name: string, args: Record<string, unknown>) => Promise<CallToolResponse>;
    /** Triggers a followup turn in the ChatGPT conversation */
    sendFollowUpMessage: (args: {
        prompt: string;
    }) => Promise<void>;
    /** Opens an external link, redirects web page or mobile app */
    openExternal(payload: {
        href: string;
    }): void;
    /** For transitioning an app from inline to fullscreen or pip */
    requestDisplayMode: (args: {
        mode: DisplayMode;
    }) => Promise<{
        /**
        * The granted display mode. The host may reject the request.
        * For mobile, PiP is always coerced to fullscreen.
        */
        mode: DisplayMode;
    }>;
    setWidgetState: (state: WidgetState) => Promise<void>;
};
/** Display mode */
export type DisplayMode = "pip" | "inline" | "fullscreen";
export type RequestDisplayMode = (args: {
    mode: DisplayMode;
}) => Promise<{
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
export type CallTool = (name: string, args: Record<string, unknown>) => Promise<CallToolResponse>;
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
export type StreamCompletion = (request: CreateMessageRequestParams) => AsyncIterable<CreateMessageResponse>;
export type CallCompletion = (request: CreateMessageRequestParams) => Promise<CreateMessageResponse>;
export type SendFollowUpMessage = (args: {
    prompt: string;
}) => Promise<void>;
/** Legacy events */
export declare const SET_GLOBALS_EVENT_TYPE = "webplus:set_globals";
export declare class SetGlobalsEvent extends CustomEvent<{
    globals: Partial<WebplusGlobals>;
}> {
    readonly type = "webplus:set_globals";
}
/** OpenAI Apps SDK events */
export declare const OPENAI_SET_GLOBALS_EVENT_TYPE = "openai:set_globals";
export declare class OpenAiSetGlobalsEvent extends CustomEvent<{
    globals: Partial<OpenAiGlobals>;
}> {
    readonly type = "openai:set_globals";
}
export declare const TOOL_RESPONSE_EVENT_TYPE = "webplus:tool_response";
export declare class ToolResponseEvent extends CustomEvent<{
    tool: {
        name: string;
        args: UnknownObject;
    };
}> {
    readonly type = "webplus:tool_response";
}
/**
 * Global objects injected by the web sandbox for communicating with chatgpt host page.
 * - webplus: Legacy API (maintained for backward compatibility)
 * - openai: Official OpenAI Apps SDK API
 */
declare global {
    interface Window {
        webplus: LegacyAPI & WebplusGlobals;
        openai: OpenAiAPI & OpenAiGlobals;
    }
    interface WindowEventMap {
        [SET_GLOBALS_EVENT_TYPE]: SetGlobalsEvent;
        [OPENAI_SET_GLOBALS_EVENT_TYPE]: OpenAiSetGlobalsEvent;
        [TOOL_RESPONSE_EVENT_TYPE]: ToolResponseEvent;
    }
}
export {};
