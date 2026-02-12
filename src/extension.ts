import * as vscode from "vscode";
import * as path from "path";
import { createIpcServer } from "./ipc-server";
import { createCookieProxy } from "./cookie-proxy";
import { PanelManager } from "./panel-manager";

const COOKIE_KEY = "plannotator-cookies";

const log = vscode.window.createOutputChannel("Plannotator", { log: true });

/**
 * Detect shell type from terminal creation options or platform defaults
 */
function detectShellType(terminal: vscode.Terminal): "bash" | "powershell" | "cmd" | "unknown" {
  const creationOptions = terminal.creationOptions;
  
  // Try to detect from shellPath in creation options
  if ("shellPath" in creationOptions && creationOptions.shellPath) {
    const shellPath = creationOptions.shellPath.toLowerCase();
    if (shellPath.includes("powershell") || shellPath.includes("pwsh")) {
      return "powershell";
    }
    if (shellPath.includes("cmd.exe") || shellPath.includes("cmd")) {
      return "cmd";
    }
    if (shellPath.includes("bash") || shellPath.includes("zsh") || shellPath.includes("sh")) {
      return "bash";
    }
  }
  
  // Fall back to platform defaults
  if (process.platform === "win32") {
    return "powershell"; // Default to PowerShell on Windows
  }
  return "bash"; // Default to bash/zsh compatible on Unix-like systems
}

/**
 * Inject environment variables into a terminal using sendText
 */
function injectEnvVarsIntoTerminal(
  terminal: vscode.Terminal,
  envVars: Record<string, string>
): void {
  const shellType = detectShellType(terminal);
  
  for (const [key, value] of Object.entries(envVars)) {
    let command: string;
    
    switch (shellType) {
      case "powershell":
        // PowerShell syntax
        command = `$env:${key}="${value}"`;
        break;
      case "cmd":
        // CMD syntax
        command = `set ${key}=${value}`;
        break;
      case "bash":
      default:
        // Bash/Zsh syntax (works for most Unix shells)
        command = `export ${key}="${value}"`;
        break;
    }
    
    terminal.sendText(command, true);
    log.info(`[terminal:${terminal.name}] Injected ${key} via ${shellType} command`);
  }
}

/**
 * Inject environment variables into all existing terminals
 */
function injectEnvVarsIntoAllTerminals(envVars: Record<string, string>): void {
  const terminals = vscode.window.terminals;
  
  if (terminals.length === 0) {
    log.info("No existing terminals to inject env vars into");
    return;
  }
  
  log.info(`Injecting env vars into ${terminals.length} existing terminal(s)`);
  
  for (const terminal of terminals) {
    injectEnvVarsIntoTerminal(terminal, envVars);
  }
}

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
    
    const envVars = {
      PLANNOTATOR_BROWSER: routerPath,
      PLANNOTATOR_VSCODE_PORT: String(port),
    };
    
    // Set env vars for new terminals
    context.environmentVariableCollection.replace(
      "PLANNOTATOR_BROWSER",
      routerPath,
    );
    context.environmentVariableCollection.replace(
      "PLANNOTATOR_VSCODE_PORT",
      String(port),
    );
    
    // Inject env vars into existing terminals
    injectEnvVarsIntoAllTerminals(envVars);
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
}

export function deactivate(): void {}
