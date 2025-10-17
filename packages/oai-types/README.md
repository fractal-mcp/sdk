# @fractal-mcp/oai-types

TypeScript types for OpenAI Apps SDK compatible components.

## Installation

```bash
npm install @fractal-mcp/oai-types
```

## Usage

```typescript
import type { 
  OpenAiGlobals, 
  Theme, 
  DisplayMode, 
  UserAgent,
  CallToolResponse 
} from "@fractal-mcp/oai-types";
```

## What's Included

This package provides TypeScript types for:

- **OpenAI Apps SDK API**: Official types from [developers.openai.com/apps-sdk](https://developers.openai.com/apps-sdk/build/custom-ux)
- **Legacy Webplus API**: Backward compatibility types  
- **Event System**: Custom events for global state updates
- **MCP Protocol**: Model Context Protocol related types

## Types Overview

### Core OpenAI Apps SDK Types
- `OpenAiGlobals` - Main window.openai interface
- `Theme` - Light/dark theme
- `DisplayMode` - Inline/pip/fullscreen modes
- `UserAgent` - Device and capability detection
- `SafeArea` - Mobile safe area insets

### Legacy Types (Backward Compatibility)
- `WebplusGlobals` - Legacy window.webplus interface
- Legacy MCP streaming types

### Event Types
- `OpenAiSetGlobalsEvent` - Official openai:set_globals event
- `SetGlobalsEvent` - Legacy webplus:set_globals event

## Related Packages

- [`@fractal-mcp/oai-hooks`](../oai-hooks) - React hooks using these types
- [`@fractal-mcp/oai-preview`](../oai-preview) - Preview component using these types
