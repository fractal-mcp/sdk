declare module 'next' {
  export interface NextApiRequest extends import('http').IncomingMessage {
    body: any;
    query: any;
    cookies: any;
  }
  export interface NextApiResponse<T = any> extends import('http').ServerResponse {
    status(code: number): this;
    json(data: T): this;
    end(data?: any): this;
  }
}

declare module 'next/server' {
  export interface NextRequest extends Request {}
  export type NextResponse = Response;
}
