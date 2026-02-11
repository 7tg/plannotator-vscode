import { describe, it, expect, spyOn, beforeEach, afterEach } from "bun:test";
import * as vscode from "vscode";
import { createMockExtensionContext } from "../mocks/vscode";
import { activate } from "./extension";

describe("activate", () => {
  let context: ReturnType<typeof createMockExtensionContext>;
  const spies: Array<{ mockRestore: () => void }> = [];

  beforeEach(() => {
    context = createMockExtensionContext("/test/extension/path");
  });

  afterEach(() => {
    for (const spy of spies) spy.mockRestore();
    spies.length = 0;
  });

  it("registers a URI handler", () => {
    const spy = spyOn(vscode.window, "registerUriHandler");
    spies.push(spy);

    activate(context as unknown as vscode.ExtensionContext);

    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("injects PLANNOTATOR_BROWSER env var when config is enabled", () => {
    const spy = spyOn(vscode.workspace, "getConfiguration");
    spy.mockReturnValue({
      get(key: string, defaultValue?: unknown) {
        if (key === "injectBrowser") return true;
        return defaultValue;
      },
    } as ReturnType<typeof vscode.workspace.getConfiguration>);
    spies.push(spy);

    activate(context as unknown as vscode.ExtensionContext);

    expect(context.environmentVariableCollection.get("PLANNOTATOR_BROWSER")).toBe(
      "/test/extension/path/bin/open-in-vscode",
    );
  });

  it("does not inject env vars when injectBrowser is false", () => {
    const spy = spyOn(vscode.workspace, "getConfiguration");
    spy.mockReturnValue({
      get(key: string, defaultValue?: unknown) {
        if (key === "injectBrowser") return false;
        return defaultValue;
      },
    } as ReturnType<typeof vscode.workspace.getConfiguration>);
    spies.push(spy);

    activate(context as unknown as vscode.ExtensionContext);

    expect(context.environmentVariableCollection.get("PLANNOTATOR_BROWSER")).toBeUndefined();
  });

  it("registers the openUrl command", () => {
    const spy = spyOn(vscode.commands, "registerCommand");
    spies.push(spy);

    activate(context as unknown as vscode.ExtensionContext);

    expect(spy).toHaveBeenCalledWith(
      "plannotator-webview.openUrl",
      expect.any(Function),
    );
  });

  it("pushes disposables to context.subscriptions", () => {
    activate(context as unknown as vscode.ExtensionContext);

    // URI handler + command = at least 2 subscriptions
    expect(context.subscriptions.length).toBeGreaterThanOrEqual(2);
  });
});
