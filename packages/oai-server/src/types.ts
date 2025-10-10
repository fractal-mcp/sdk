/**
 * Core types and utilities for OpenAI widgets
 */

import type { z } from "zod";

/**
 * OpenAI Widget definition
 */
export type OpenAIWidget<TInputSchema extends z.ZodType = z.ZodType> = {
  /** Unique identifier for the widget */
  id: string;
  /** Human-readable title */
  title: string;
  /** Template URI for the widget resource */
  templateUri: string;
  /** Text displayed while the widget is invoking */
  invoking: string;
  /** Text displayed when the widget is invoked */
  invoked: string;
  /** HTML content for the widget */
  html: string;
  /** Response text returned when the tool is called */
  responseText: string;
  /** Optional Zod schema for input validation and schema generation */
  inputSchema?: TInputSchema;
  /** Optional description for the widget/tool */
  description?: string;
};

/**
 * Widget metadata for OpenAI integration
 */
export type WidgetMeta = {
  "openai/outputTemplate": string;
  "openai/toolInvocation/invoking": string;
  "openai/toolInvocation/invoked": string;
  "openai/widgetAccessible": boolean;
  "openai/resultCanProduceWidget": boolean;
};

/**
 * Generate widget metadata from an OpenAI widget
 */
export function getWidgetMeta(widget: OpenAIWidget): WidgetMeta {
  return {
    "openai/outputTemplate": widget.templateUri,
    "openai/toolInvocation/invoking": widget.invoking,
    "openai/toolInvocation/invoked": widget.invoked,
    "openai/widgetAccessible": true,
    "openai/resultCanProduceWidget": true
  };
}

