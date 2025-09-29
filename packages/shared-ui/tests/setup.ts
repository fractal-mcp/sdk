import { webcrypto } from 'crypto';

// Provide global crypto for code using crypto.randomUUID
// Node 18+ has webcrypto; this ensures it's available for tests.
(globalThis as any).crypto = webcrypto as any;
