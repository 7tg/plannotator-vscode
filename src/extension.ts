import * as vscode from "vscode";
import * as path from "path";
import { createIpcServer } from "./ipc-server";
import { createCookieProxy } from "./cookie-proxy";
import { PanelManager } from "./panel-manager";

const COOKIE_KEY = "plannotator-cookies";

const log = vscode.window.createOutputChannel("Plannotator", { log: true });

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  const panelManager = new PanelManager();
  panelManager.setExtensionPath(context.extensionPath);

  // Start cookie proxy for persisting webview state
  const proxy = await createCookieProxy({
    loadCookies: () => {
      const cookies = context.globalState.get<string>(COOKIE_KEY) ?? "";
      log.info(`[load] ${cookies.length} chars: ${cookies.slice(0, 120)}…`);
      return cookies;
    },
    onSaveCookies: (cookies) => {
      log.info(`[save] ${cookies.length} chars: ${cookies.slice(0, 120)}…`);
      context.globalState.update(COOKIE_KEY, cookies);
    },
    onClose: () => {
      log.info("[close] received close signal from plannotator");
    },
  });
  context.subscriptions.push({ dispose: () => proxy.server.close() });

  // Auto-close panel when plannotator signals completion
  proxy.events.on("close", () => panelManager.close());

  const openInPanel = (url: string) => {
    panelManager.open(proxy.rewriteUrl(url));
    vscode.window.showInformationMessage("Plannotator panel opened");
  };

  // Start local IPC server to receive URLs from the router script
  const { server, port } = await createIpcServer((url) => {
    openInPanel(url);
  });
  context.subscriptions.push({ dispose: () => server.close() });

  // Inject env vars into integrated terminals
  const config = vscode.workspace.getConfiguration("plannotatorWebview");
  const injectBrowser = config.get("injectBrowser", true) as boolean;

  if (injectBrowser) {
    const routerPath = path.join(
      context.extensionPath,
      "bin",
      "open-in-vscode",
    );
    context.environmentVariableCollection.replace(
      "PLANNOTATOR_BROWSER",
      routerPath,
    );
    context.environmentVariableCollection.replace(
      "PLANNOTATOR_VSCODE_PORT",
      String(port),
    );
  }

  // Register command for manual URL opening
  const openCommand = vscode.commands.registerCommand(
    "plannotator-webview.openUrl",
    async () => {
      const url = await vscode.window.showInputBox({
        prompt: "Enter the Plannotator URL to open",
        placeHolder: "http://localhost:3000",
      });
      if (url) {
        openInPanel(url);
      }
    },
  );
  context.subscriptions.push(openCommand);

  // Register external URI opener to intercept URLs from Claude Code VSCode extension
  // This uses optional chaining because the API might not be available in older VSCode versions
  // Note: This API was added in VSCode 1.54 but may not be in all type definitions
  const windowWithOpener = vscode.window as typeof vscode.window & {
    registerExternalUriOpener?: (
      id: string,
      opener: {
        canOpenExternalUri(uri: vscode.Uri): number | undefined;
        openExternalUri(uri: vscode.Uri): void;
      },
      metadata: { schemes: string[]; label: string },
    ) => vscode.Disposable;
  };

  const externalOpener = windowWithOpener.registerExternalUriOpener?.(
    "plannotator-webview.opener",
    {
      canOpenExternalUri(uri: vscode.Uri): number | undefined {
        const urlString = uri.toString();
        // Check if URL contains "plannotator" - this matches the Plannotator UI URL pattern
        // More specific matching (like hostname) isn't feasible since Plannotator can run
        // on any localhost port, and the pattern must match both development and production URLs
        // Note: While this could theoretically match unintended URLs (e.g., http://example.com?q=plannotator),
        // in practice this is only triggered by vscode.env.openExternal() calls from other extensions
        if (urlString.includes("plannotator")) {
          // Priority 2 (higher than default 0) to intercept these URLs before the default browser opener
          return 2;
        }
        return undefined; // Don't handle this URL - let default browser opener handle it
      },
      openExternalUri(uri: vscode.Uri): void {
        const urlString = uri.toString();
        log.info(`[external-opener] Opening URL: ${urlString}`);
        openInPanel(urlString);
      },
    },
    {
      schemes: ["http", "https"],
      label: "Open Plannotator in VS Code",
    },
  );
  if (externalOpener) {
    context.subscriptions.push(externalOpener);
  }
}

export function deactivate(): void {}
