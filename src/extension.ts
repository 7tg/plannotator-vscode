import * as vscode from "vscode";
import * as path from "path";
import { createIpcServer } from "./ipc-server";

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  const openInSimpleBrowser = (url: string) => {
    return vscode.commands.executeCommand("simpleBrowser.show", url);
  };

  // Start local IPC server to receive URLs from the router script
  const { server, port } = await createIpcServer((url) => {
    openInSimpleBrowser(url);
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
        await openInSimpleBrowser(url);
      }
    },
  );
  context.subscriptions.push(openCommand);
}

export function deactivate(): void {}
