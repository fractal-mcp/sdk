
import type { Resource } from '@modelcontextprotocol/sdk/types.js';

// Primary identifier for the resource. Starts with ui://`
export type URI = `ui://${string}`;

// text/html for rawHtml content, text/uri-list for externalUrl content
export type MimeType =
  | 'text/html'
  | 'text/uri-list'
  | 'application/vnd.mcp-ui.remote-dom+javascript; framework=react'
  | 'application/vnd.mcp-ui.remote-dom+javascript; framework=webcomponents';

export type HTMLTextContent = {
  uri: URI;
  mimeType: MimeType;
  text: string; // HTML content (for mimeType `text/html`), or iframe URL (for mimeType `text/uri-list`)
  blob?: never;
  _meta?: Record<string, unknown>;
};

export type Base64BlobContent = {
  uri: URI;
  mimeType: MimeType;
  blob: string; //  Base64 encoded HTML content (for mimeType `text/html`), or iframe URL (for mimeType `text/uri-list`)
  text?: never;
  _meta?: Record<string, unknown>;
};

export type UIResource = {
  type: 'resource';
  resource: HTMLTextContent | Base64BlobContent;
};

export type ResourceContentPayload =
  | { type: 'rawHtml'; htmlString: string }
  | { type: 'externalUrl'; iframeUrl: string }
  | {
      type: 'remoteDom';
      script: string;
      framework: 'react' | 'webcomponents';
    };

export interface CreateUIResourceOptions {
  uri: URI;
  content: ResourceContentPayload;
  encoding: 'text' | 'blob';
  // specific mcp-ui metadata
  uiMetadata?: UIResourceMetadata;
  // additional metadata to be passed on _meta
  metadata?: Record<string, unknown>;
  // additional resource props to be passed on resource (i.e. annotations)
  resourceProps?: UIResourceProps;
}

export type UIResourceProps = Omit<Partial<Resource>, 'uri' | 'mimeType'>;

export const UIMetadataKey = {
  PREFERRED_FRAME_SIZE: 'preferred-frame-size',
  INITIAL_RENDER_DATA: 'initial-render-data',
} as const;

export const UI_METADATA_PREFIX = 'mcpui.dev/ui-';

export type UIResourceMetadata = {
  [UIMetadataKey.PREFERRED_FRAME_SIZE]?: [string, string];
  [UIMetadataKey.INITIAL_RENDER_DATA]?: Record<string, unknown>;
};

// import { RemoteReceiver } from '@remote-dom/core/receivers';
// import React from 'react';

export const ALL_RESOURCE_CONTENT_TYPES = ['rawHtml', 'externalUrl', 'remoteDom'] as const;
export type ResourceContentType = (typeof ALL_RESOURCE_CONTENT_TYPES)[number];

/**
 * This is the API that the remote environment (iframe) exports to the host.
 * The host can call these methods on the thread.
 */
// export interface SandboxAPI {
//   render: (options: RenderOptions, receiver: RemoteReceiver) => void | Promise<void>;
// }

export interface RemoteElementConfiguration {
  tagName: string;
  remoteAttributes?: string[];
  remoteEvents?: string[];
}
export interface RenderOptions {
  code: string;
  componentLibrary?: string;
  useReactRenderer?: boolean;
  remoteElements?: RemoteElementConfiguration[];
}

export interface ComponentLibraryElement {
  tagName: string;
  component: React.ComponentType<Record<string, unknown>>;
  propMapping?: Record<string, string>;
  eventMapping?: Record<string, string>;
}

export interface ComponentLibrary {
  name: string;
  elements: ComponentLibraryElement[];
}