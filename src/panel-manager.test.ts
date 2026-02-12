import { describe, it, expect, spyOn, beforeEach, afterEach } from "bun:test";
import * as vscode from "vscode";
import { PanelManager } from "./panel-manager";

describe("PanelManager", () => {
  let manager: PanelManager;
  const spies: Array<{ mockRestore: () => void }> = [];

  beforeEach(() => {
    manager = new PanelManager();
  });

  afterEach(() => {
    for (const spy of spies) spy.mockRestore();
    spies.length = 0;
  });

  it("creates a webview panel on first open", async () => {
    const spy = spyOn(vscode.window, "createWebviewPanel");
    spies.push(spy);

    await manager.open("http://127.0.0.1:9999/review");

    expect(spy).toHaveBeenCalledWith(
      "plannotator",
      "Plannotator",
      vscode.ViewColumn.One,
      { enableScripts: true, retainContextWhenHidden: true },
    );
  });

  it("sets iframe src in webview html", async () => {
    let capturedHtml = "";
    const spy = spyOn(vscode.window, "createWebviewPanel");
    spy.mockImplementation((() => {
      let disposeListener: (() => void) | null = null;
      return {
        webview: {
          get html() { return capturedHtml; },
          set html(v: string) { capturedHtml = v; },
        },
        reveal() {},
        dispose() { disposeListener?.(); },
        onDidDispose(listener: () => void) {
          disposeListener = listener;
          return { dispose() {} };
        },
      } as unknown as vscode.WebviewPanel;
    }) as typeof vscode.window.createWebviewPanel);
    spies.push(spy);

    await manager.open("http://127.0.0.1:9999/review?id=42");

    expect(capturedHtml).toContain(
      'src="http://127.0.0.1:9999/review?id=42"',
    );
  });

  it("creates a new panel on every open call", async () => {
    const spy = spyOn(vscode.window, "createWebviewPanel");
    spies.push(spy);

    await manager.open("http://127.0.0.1:9999/review");
    await manager.open("http://127.0.0.1:9999/other");

    expect(spy).toHaveBeenCalledTimes(2);
  });

  it("returns the created panel", async () => {
    const panel = await manager.open("http://127.0.0.1:9999/review");

    expect(panel).toBeDefined();
    expect(panel.webview).toBeDefined();
  });

  it("closeAll disposes all open panels", async () => {
    const spy = spyOn(vscode.window, "createWebviewPanel");
    spies.push(spy);

    await manager.open("http://127.0.0.1:9999/review");
    await manager.open("http://127.0.0.1:9999/other");
    manager.closeAll();
    await manager.open("http://127.0.0.1:9999/third");

    expect(spy).toHaveBeenCalledTimes(3);
  });

  it("closeAll is a no-op when no panels exist", () => {
    // Should not throw
    manager.closeAll();
  });

  it("uses asExternalUri resolved URL in iframe and CSP", async () => {
    const envSpy = spyOn(vscode.env, "asExternalUri");
    envSpy.mockImplementation(async (_uri: vscode.Uri) => {
      return vscode.Uri.parse("https://localhost:8443/review?id=42");
    });
    spies.push(envSpy);

    let capturedHtml = "";
    const panelSpy = spyOn(vscode.window, "createWebviewPanel");
    panelSpy.mockImplementation((() => {
      let disposeListener: (() => void) | null = null;
      return {
        webview: {
          get html() { return capturedHtml; },
          set html(v: string) { capturedHtml = v; },
        },
        reveal() {},
        dispose() { disposeListener?.(); },
        onDidDispose(listener: () => void) {
          disposeListener = listener;
          return { dispose() {} };
        },
      } as unknown as vscode.WebviewPanel;
    }) as typeof vscode.window.createWebviewPanel);
    spies.push(panelSpy);

    await manager.open("http://127.0.0.1:9999/review?id=42");

    expect(envSpy).toHaveBeenCalled();
    expect(capturedHtml).toContain(
      'src="https://localhost:8443/review?id=42"',
    );
    expect(capturedHtml).toContain("frame-src https://localhost:8443;");
  });
});
