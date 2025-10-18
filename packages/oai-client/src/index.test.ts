import { describe, expect, it, jest } from "@jest/globals";
import type { ReadResourceResult } from "@modelcontextprotocol/sdk/types.js";

import { resolveResourceMetadata } from "./index";

describe("resolveResourceMetadata", () => {
  it("returns undefined when no resource references are present", async () => {
    const meta = { "openai/toolInvocation/invoked": "done" };
    const reader = jest.fn<(uri: string) => Promise<ReadResourceResult>>();

    const result = await resolveResourceMetadata(meta, reader);

    expect(result).toBeUndefined();
    expect(reader).not.toHaveBeenCalled();
  });

  it("resolves widget HTML and records resolved resources", async () => {
    const templateUri = "ui://widget/example.html";
    const meta = {
      "openai/outputTemplate": templateUri,
      "openai/toolInvocation/invoking": "Loading"
    };
    const html = "<div>widget</div>";
    const reader = jest.fn<(uri: string) => Promise<ReadResourceResult>>();
    reader.mockResolvedValue({
      contents: [
        {
          uri: templateUri,
          text: html
        }
      ]
    } as ReadResourceResult);

    const result = await resolveResourceMetadata(meta, reader);

    expect(result).not.toBeUndefined();
    expect(result).not.toBe(meta);
    const widgetHtml = result?.["openai/widgetHtml"] as string | undefined;
    const resolvedResources = result?.["fractal/resolvedResources"] as
      | Record<string, string>
      | undefined;

    expect(widgetHtml).toBe(html);
    expect(resolvedResources).toEqual({
      [templateUri]: html
    });
    expect(meta).not.toHaveProperty("openai/widgetHtml");
  });

  it("ignores resources that do not contain text content", async () => {
    const templateUri = "ui://widget/empty.html";
    const meta = {
      "openai/outputTemplate": templateUri
    };
    const reader = jest.fn<(uri: string) => Promise<ReadResourceResult>>();
    reader.mockResolvedValue({
      contents: [
        {
          uri: templateUri
        }
      ]
    } as ReadResourceResult);

    const result = await resolveResourceMetadata(meta, reader);

    expect(result).toBeUndefined();
    expect(reader).toHaveBeenCalledWith(templateUri);
  });
});
