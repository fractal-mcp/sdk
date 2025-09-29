import { MessagingClient } from '@fractal-mcp/shared-ui';
import { createLinkedPorts } from './fakeMessagePort';

function waitFor<T>(fn: () => T | Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    setTimeout(async () => {
      try {
        resolve(await fn());
      } catch (e) {
        reject(e);
      }
    }, 0);
  });
}

describe('MessagingClient', () => {
  test('emit delivers event to other client', async () => {
    const { a, b } = createLinkedPorts();
    const clientA = new MessagingClient({ port: a });
    const clientB = new MessagingClient({ port: b });

    const received: any[] = [];
    clientB.on('notify', (payload) => {
      received.push(payload);
    });

    clientA.emit({ type: 'notify', payload: { message: 'hello' } });

    await waitFor(() => {
      expect(received).toEqual([{ message: 'hello' }]);
    });
  });

  test('request gets success response with payload', async () => {
    const { a, b } = createLinkedPorts();
    const clientA = new MessagingClient({ port: a });
    const clientB = new MessagingClient({ port: b });

    clientB.on('ping', async (payload) => {
      return { ok: true, echo: payload };
    });

    const resp = await clientA.request({ type: 'ping', payload: { n: 42 } });
    expect(resp).toEqual({ ok: true, echo: { n: 42 } });
  });

  test('request propagates error response', async () => {
    const { a, b } = createLinkedPorts();
    const clientA = new MessagingClient({ port: a });
    const clientB = new MessagingClient({ port: b });

    clientB.on('boom', async () => {
      throw new Error('bad');
    });

    await expect(clientA.request({ type: 'boom', payload: {} })).rejects.toThrow('bad');
  });

  test('handles multiple concurrent requests with out-of-order responses', async () => {
    const { a, b } = createLinkedPorts();
    const clientA = new MessagingClient({ port: a });
    const clientB = new MessagingClient({ port: b });

    clientB.on('work', async (payload: any) => {
      const delayMs: number = payload?.delay ?? 0;
      await new Promise((r) => setTimeout(r, delayMs));
      return { value: payload.value };
    });

    const p1 = clientA.request({ type: 'work', payload: { value: 'first', delay: 50 } });
    const p2 = clientA.request({ type: 'work', payload: { value: 'second', delay: 10 } });
    const p3 = clientA.request({ type: 'work', payload: { value: 'third', delay: 30 } });

    const results = await Promise.all([p1, p2, p3]);
    // Even though responses return out of order, each Promise resolves to its own payload
    expect(results[0]).toEqual({ value: 'first' });
    expect(results[1]).toEqual({ value: 'second' });
    expect(results[2]).toEqual({ value: 'third' });
  });
});
