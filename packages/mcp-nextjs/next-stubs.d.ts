import { IncomingMessage, ServerResponse, IncomingHttpHeaders } from 'http';
import { Socket } from 'net';

declare module 'next' {
  export interface NextApiRequest extends IncomingMessage {
    body: any;
    query: any;
    cookies: any;
    method?: string;
    headers: IncomingHttpHeaders;
    socket: Socket;
  }
  
  export interface NextApiResponse<T = any> extends ServerResponse {
    status(code: number): this;
    json(data: T): this;
    end(data?: any): this;
    setHeader(name: string, value: string | string[]): this;
  }
}

declare module 'next/server' {
  export interface NextRequest extends Request {}
  export type NextResponse = Response;
} 