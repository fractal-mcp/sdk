/**
 * Message Envelope types. Agnostic to data being passed through.
 * These are meant to support a messaging system capable of
 * - emitting events "for and forget" style, and
 * - sending requests and waiting for a response.
 * - detecting and handling errors.
 */

export interface ReplySuccessMessageEnvelope {
    kind: 'success';
    id: string;
}

export type ReplySuccessMessage<TData extends Record<string, unknown> = Record<string, unknown>> = 
    ReplySuccessMessageEnvelope & TData;
  
export interface ReplyErrorMessage {
    kind: 'error';
    id: string;
    error: string;
}

export interface EventMessageEnvelope {
    kind: 'event';
    id: string;
}

export type EventMessage<TData extends Record<string, unknown> = Record<string, unknown>> = 
    EventMessageEnvelope & TData;

export interface RequestMessageEnvelope {
    kind: 'request';
    id: string;
}

export type RequestMessage<TData extends Record<string, unknown> = Record<string, unknown>> = 
    RequestMessageEnvelope & TData;

export type MessageEnvelope<TData extends Record<string, unknown> = Record<string, unknown>> = 
    RequestMessage<TData> | 
    ReplySuccessMessage<TData> | 
    ReplyErrorMessage | 
    EventMessage<TData>;
