import { Resource } from '@modelcontextprotocol/sdk/types.js';

/**
 * Thank you MCP UI!
 * Borrowed resource to detect the MCP UI's UIResource type
 */

export function isUIResource<T extends { type: string; resource?: Partial<Resource> }>(content: T): content is T & { type: 'resource'; resource: Partial<Resource> } {
    return (content.type === 'resource' && content.resource?.uri?.startsWith('ui://')) ?? false;
}