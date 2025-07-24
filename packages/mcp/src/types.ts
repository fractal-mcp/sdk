import { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";

export interface IMcpConnectable {
    connect: (transport: Transport) => Promise<void>;
}