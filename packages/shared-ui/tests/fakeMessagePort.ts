export type MessageHandler = ((event: { data: any }) => void) | null;

export class FakeMessagePort {
  onmessage: MessageHandler = null;
  private counterpart: FakeMessagePort | null = null;

  link(counterpart: FakeMessagePort) {
    this.counterpart = counterpart;
  }

  postMessage(data: any) {
    // simulate async delivery
    const target = this.counterpart;
    if (!target) return;
    setTimeout(() => {
      target.onmessage?.({ data });
    }, 0);
  }
}

export function createLinkedPorts() {
  const a = new FakeMessagePort();
  const b = new FakeMessagePort();
  a.link(b);
  b.link(a);
  return { a: a as unknown as MessagePort, b: b as unknown as MessagePort };
}
