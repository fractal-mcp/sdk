import { MessagingClient } from "@fractal-mcp/shared-ui";
import { GenericMessageData } from "@fractal-mcp/protocol";

type GenericMessageDataWithRoutingInfo = GenericMessageData & { componentId: string };

const LOG_ENABLE = true;
function log(...args: unknown[]) {
    if (LOG_ENABLE) {
        console.log("[MessageRouter]", ...args);
    }
}

export class MessageRouter {
    clients: Map<string, MessagingClient> = new Map();

    registerClient(id: string, client: MessagingClient) {
        log('registerClient', id);
        this.clients.set(id, client);
    }

    unregisterClient(id: string) {
        this.clients.delete(id);
    }
    
    getClient(id: string) {
        return this.clients.get(id);
    }

    getAllClients() {
        return Array.from(this.clients.values());
    }
    
    request(msg: GenericMessageDataWithRoutingInfo): Promise<unknown> {
        const {componentId, ...rest} = msg
        log('request', componentId, rest);
        const client = this.getClient(componentId);
        if (client) {
            log('found client');
            return client.request(rest);
        } else {
            throw new Error(`MessageRouter could not find id=${componentId}`)
        }
    }
    
    emit(msg: GenericMessageDataWithRoutingInfo) {
        const {componentId, ...rest} = msg
        const client = this.getClient(componentId);
        if (client) {
            client.emit(rest);
        } else {
            throw new Error(`MessageRouter could not find id=${componentId}`)
        }
    }
    
    on(id: string, message: string, handler: (payload: unknown) => void) {
        const client = this.getClient(id);
        if (client) {
            client.on(message, handler);
        }
    }
}


let instance: MessageRouter | null = null;

export function getMessageRouter() {
    if (!instance) {
        instance = new MessageRouter();
    }
    return instance;
}