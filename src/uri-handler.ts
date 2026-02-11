import type * as vscode from "vscode";

/**
 * Handles vscode://plannotator-webview/open?url=... URIs.
 * Opens the target URL in VS Code's Simple Browser.
 */
export class PlannotatorUriHandler implements vscode.UriHandler {
  constructor(
    private readonly openInSimpleBrowser: (url: string) => PromiseLike<unknown>,
  ) {}

  async handleUri(uri: vscode.Uri): Promise<void> {
    if (uri.path !== "/open") {
      return;
    }

    const params = new globalThis.URLSearchParams(uri.query);
    const targetUrl = params.get("url");

    if (!targetUrl) {
      return;
    }

    await this.openInSimpleBrowser(targetUrl);
  }
}
