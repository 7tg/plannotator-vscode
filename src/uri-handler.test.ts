import { describe, it, expect, mock } from "bun:test";
import { Uri } from "vscode";
import { PlannotatorUriHandler } from "./uri-handler";

describe("PlannotatorUriHandler", () => {
  it("opens Simple Browser for valid /open URI with url param", async () => {
    const openFn = mock(async (_url: string) => {});
    const handler = new PlannotatorUriHandler(openFn);

    const uri = Uri.parse("vscode://plannotator-webview/open?url=http%3A%2F%2Flocalhost%3A3000");
    await handler.handleUri(uri);

    expect(openFn).toHaveBeenCalledTimes(1);
    expect(openFn).toHaveBeenCalledWith("http://localhost:3000");
  });

  it("ignores URIs with non-/open path", async () => {
    const openFn = mock(async (_url: string) => {});
    const handler = new PlannotatorUriHandler(openFn);

    const uri = Uri.parse("vscode://plannotator-webview/other?url=http%3A%2F%2Flocalhost%3A3000");
    await handler.handleUri(uri);

    expect(openFn).not.toHaveBeenCalled();
  });

  it("ignores URIs with missing url param", async () => {
    const openFn = mock(async (_url: string) => {});
    const handler = new PlannotatorUriHandler(openFn);

    const uri = Uri.parse("vscode://plannotator-webview/open");
    await handler.handleUri(uri);

    expect(openFn).not.toHaveBeenCalled();
  });

  it("ignores URIs with empty url param", async () => {
    const openFn = mock(async (_url: string) => {});
    const handler = new PlannotatorUriHandler(openFn);

    const uri = Uri.parse("vscode://plannotator-webview/open?url=");
    await handler.handleUri(uri);

    expect(openFn).not.toHaveBeenCalled();
  });

  it("handles URLs with query parameters", async () => {
    const openFn = mock(async (_url: string) => {});
    const handler = new PlannotatorUriHandler(openFn);

    const encodedUrl = encodeURIComponent("http://localhost:3000?tab=review&id=123");
    const uri = Uri.parse(`vscode://plannotator-webview/open?url=${encodedUrl}`);
    await handler.handleUri(uri);

    expect(openFn).toHaveBeenCalledWith("http://localhost:3000?tab=review&id=123");
  });
});
