# @fractal-mcp/test-utils-mcp

Utilities for testing Model Context Protocol (MCP) servers. The package ships:

- Example MCP server factories for verifying connectivity and session behaviors.
- A `runTestServer` helper that spins up the example servers behind SSE and streamable HTTP transports.
- Reusable Jest test cases that assert core transport and session handling scenarios.

Use these utilities to validate that an MCP server implementation can establish transports, invoke tools, and persist session state across requests.
