import { describe, it, expect, spyOn, beforeEach, afterEach } from "bun:test";
import * as vscode from "vscode";
import { createMockExtensionContext, createMockTerminal, addMockTerminal, clearMockTerminals } from "../mocks/vscode";
import { activate } from "./extension";

describe("activate", () => {
  let context: ReturnType<typeof createMockExtensionContext>;
  const spies: Array<{ mockRestore: () => void }> = [];

  beforeEach(() => {
    context = createMockExtensionContext("/test/extension/path");
    clearMockTerminals();
  });

  afterEach(() => {
    // Dispose the IPC server and cookie proxy
    for (const sub of context.subscriptions) sub.dispose();
    for (const spy of spies) spy.mockRestore();
    spies.length = 0;
  });

  it("starts IPC server and injects port env var when config enabled", async () => {
    await activate(context as unknown as vscode.ExtensionContext);

    const port = context.environmentVariableCollection.get("PLANNOTATOR_VSCODE_PORT");
    expect(port).toBeDefined();
    expect(Number(port)).toBeGreaterThan(0);
  });

  it("injects PLANNOTATOR_BROWSER env var when config is enabled", async () => {
    const spy = spyOn(vscode.workspace, "getConfiguration");
    spy.mockReturnValue({
      get(key: string, defaultValue?: unknown) {
        if (key === "injectBrowser") return true;
        return defaultValue;
      },
    } as ReturnType<typeof vscode.workspace.getConfiguration>);
    spies.push(spy);

    await activate(context as unknown as vscode.ExtensionContext);

    expect(context.environmentVariableCollection.get("PLANNOTATOR_BROWSER")).toBe(
      "/test/extension/path/bin/open-in-vscode",
    );
  });

  it("does not inject env vars when injectBrowser is false", async () => {
    const spy = spyOn(vscode.workspace, "getConfiguration");
    spy.mockReturnValue({
      get(key: string, defaultValue?: unknown) {
        if (key === "injectBrowser") return false;
        return defaultValue;
      },
    } as ReturnType<typeof vscode.workspace.getConfiguration>);
    spies.push(spy);

    await activate(context as unknown as vscode.ExtensionContext);

    expect(context.environmentVariableCollection.get("PLANNOTATOR_BROWSER")).toBeUndefined();
    expect(context.environmentVariableCollection.get("PLANNOTATOR_VSCODE_PORT")).toBeUndefined();
  });

  it("registers the openUrl command", async () => {
    const spy = spyOn(vscode.commands, "registerCommand");
    spies.push(spy);

    await activate(context as unknown as vscode.ExtensionContext);

    expect(spy).toHaveBeenCalledWith(
      "plannotator-webview.openUrl",
      expect.any(Function),
    );
  });

  it("pushes disposables to context.subscriptions", async () => {
    await activate(context as unknown as vscode.ExtensionContext);

    // Cookie proxy + IPC server + command = at least 3 subscriptions
    expect(context.subscriptions.length).toBeGreaterThanOrEqual(3);
  });

  it("injects env vars into existing bash terminal on activation", async () => {
    // Create a mock bash terminal
    const terminal = createMockTerminal("bash", "/bin/bash");
    addMockTerminal(terminal);

    await activate(context as unknown as vscode.ExtensionContext);

    // Check that sendText was called with export commands
    const sentTexts = (terminal as any).sentTexts as string[];
    expect(sentTexts.length).toBe(2);
    expect(sentTexts[0]).toMatch(/^export PLANNOTATOR_BROWSER=/);
    expect(sentTexts[1]).toMatch(/^export PLANNOTATOR_VSCODE_PORT=/);
  });

  it("injects env vars into existing PowerShell terminal on activation", async () => {
    // Create a mock PowerShell terminal
    const terminal = createMockTerminal("powershell", "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe");
    addMockTerminal(terminal);

    await activate(context as unknown as vscode.ExtensionContext);

    // Check that sendText was called with $env: commands
    const sentTexts = (terminal as any).sentTexts as string[];
    expect(sentTexts.length).toBe(2);
    expect(sentTexts[0]).toMatch(/^\$env:PLANNOTATOR_BROWSER=/);
    expect(sentTexts[1]).toMatch(/^\$env:PLANNOTATOR_VSCODE_PORT=/);
  });

  it("injects env vars into existing cmd terminal on activation", async () => {
    // Create a mock cmd terminal
    const terminal = createMockTerminal("cmd", "C:\\Windows\\System32\\cmd.exe");
    addMockTerminal(terminal);

    await activate(context as unknown as vscode.ExtensionContext);

    // Check that sendText was called with set commands
    const sentTexts = (terminal as any).sentTexts as string[];
    expect(sentTexts.length).toBe(2);
    expect(sentTexts[0]).toMatch(/^set PLANNOTATOR_BROWSER=/);
    expect(sentTexts[1]).toMatch(/^set PLANNOTATOR_VSCODE_PORT=/);
  });

  it("does not inject env vars into terminals when injectBrowser is false", async () => {
    const spy = spyOn(vscode.workspace, "getConfiguration");
    spy.mockReturnValue({
      get(key: string, defaultValue?: unknown) {
        if (key === "injectBrowser") return false;
        return defaultValue;
      },
    } as ReturnType<typeof vscode.workspace.getConfiguration>);
    spies.push(spy);

    // Create a mock terminal
    const terminal = createMockTerminal("bash", "/bin/bash");
    addMockTerminal(terminal);

    await activate(context as unknown as vscode.ExtensionContext);

    // Check that sendText was not called
    const sentTexts = (terminal as any).sentTexts as string[];
    expect(sentTexts.length).toBe(0);
  });

  it("injects env vars into multiple existing terminals", async () => {
    // Create multiple mock terminals
    const bashTerminal = createMockTerminal("bash", "/bin/bash");
    const zshTerminal = createMockTerminal("zsh", "/bin/zsh");
    addMockTerminal(bashTerminal);
    addMockTerminal(zshTerminal);

    await activate(context as unknown as vscode.ExtensionContext);

    // Check both terminals received commands
    const bashTexts = (bashTerminal as any).sentTexts as string[];
    const zshTexts = (zshTerminal as any).sentTexts as string[];
    expect(bashTexts.length).toBe(2);
    expect(zshTexts.length).toBe(2);
    expect(bashTexts[0]).toMatch(/^export PLANNOTATOR_BROWSER=/);
    expect(zshTexts[0]).toMatch(/^export PLANNOTATOR_BROWSER=/);
  });
});
