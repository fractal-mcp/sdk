import { describe, it, jest } from "@jest/globals";

import {
  createHelloMcpServer,
  createSessionMcpServer,
  runTestServer,
  testHelloMcpServerSessionOverSse,
  testHelloMcpServerSessionOverStreamableHttp,
  testMcpServerCanHandleSSE,
  testMcpServerCanHandleStreamableHttp
} from "../src/index.js";

describe("test-utils-mcp", () => {
  jest.setTimeout(60000);

  it("runs SSE connectivity test", async () => {
    const server = await runTestServer(createHelloMcpServer);
    try {
      await testMcpServerCanHandleSSE(server.url);
    } finally {
      await server.close();
    }
  });

  it("runs Streamable HTTP connectivity test", async () => {
    const server = await runTestServer(createHelloMcpServer);
    try {
      await testMcpServerCanHandleStreamableHttp(server.url);
    } finally {
      await server.close();
    }
  });

  it("verifies SSE sessions", async () => {
    const server = await runTestServer(createSessionMcpServer);
    try {
      await testHelloMcpServerSessionOverSse(server.url);
    } finally {
      await server.close();
    }
  });

  it("verifies Streamable HTTP sessions", async () => {
    const server = await runTestServer(createSessionMcpServer);
    try {
      await testHelloMcpServerSessionOverStreamableHttp(server.url);
    } finally {
      await server.close();
    }
  });
});
