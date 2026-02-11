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

  it("creates a webview panel on first open", () => {
    const spy = spyOn(vscode.window, "createWebviewPanel");
    spies.push(spy);

    manager.open("http://127.0.0.1:9999/review");

    expect(spy).toHaveBeenCalledWith(
      "plannotator",
      "Plannotator",
      vscode.ViewColumn.One,
      { enableScripts: true, retainContextWhenHidden: true },
    );
  });

  it("sets iframe src in webview html", () => {
    let capturedHtml = "";
    const spy = spyOn(vscode.window, "createWebviewPanel");
    spy.mockImplementation((..._args: unknown[]) => {
      let disposeListener: (() => void) | null = null;
      const panel: vscode.WebviewPanel = {
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
      };
      return panel;
    });
    spies.push(spy);

    manager.open("http://127.0.0.1:9999/review?id=42");

    expect(capturedHtml).toContain(
      'src="http://127.0.0.1:9999/review?id=42"',
    );
  });

  it("reuses existing panel on subsequent opens", () => {
    const spy = spyOn(vscode.window, "createWebviewPanel");
    spies.push(spy);

    manager.open("http://127.0.0.1:9999/review");
    manager.open("http://127.0.0.1:9999/other");

    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("creates new panel after previous one is disposed", () => {
    const spy = spyOn(vscode.window, "createWebviewPanel");
    spies.push(spy);

    manager.open("http://127.0.0.1:9999/review");
    manager.close();
    manager.open("http://127.0.0.1:9999/review");

    expect(spy).toHaveBeenCalledTimes(2);
  });

  it("close is a no-op when no panel exists", () => {
    // Should not throw
    manager.close();
  });
});
