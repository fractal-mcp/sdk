// Core hooks - OpenAI Apps SDK API
export { useOpenAiGlobal, useOpenAIGlobal } from './useOpenAIGlobal';

// Legacy hooks (backward compatibility)
export { useWebplusGlobal } from './useWebplusGlobal';

// Updated hooks using OpenAI API
export { useWidgetState } from './useWidgetState';
export { useWidgetProps } from './useWidgetProps';
export { useMaxHeight } from './useMaxHeight';
export { useDisplayMode } from './useDisplayMode';

// New hooks based on official OpenAI Apps SDK API
export { useToolInput } from './useToolInput';
export { useToolOutput } from './useToolOutput';
export { useToolResponseMetadata } from './useToolResponseMetadata';
export { useTheme } from './useTheme';
export { useSafeArea } from './useSafeArea';

// OpenAI Apps SDK types
export type {
  OpenAiGlobals,
  DeviceType,
  OPENAI_SET_GLOBALS_EVENT_TYPE,
  OpenAiSetGlobalsEvent,
} from './types';

// All types (includes both legacy and new)
export type {
  WidgetState,
  SetWidgetState,
  Theme,
  SafeAreaInsets,
  SafeArea,
  UserAgent,
  DisplayMode,
  CallToolResponse,
  WebplusGlobals,
  RequestDisplayMode,
  CallTool,
  ModelHintName,
  CompletionStreamOptions,
  Annotations,
  TextContent,
  ImageContent,
  AudioContent,
  SamplingMessage,
  ModelHint,
  ModelPreferences,
  CreateMessageRequestParams,
  CreateMessageResponse,
  StreamCompletion,
  CallCompletion,
  SendFollowUpMessage,
} from './types';

export {
  TOOL_RESPONSE_EVENT_TYPE,
  ToolResponseEvent,
} from './types';

