import * as vscode from "vscode";
import * as path from "path";
import { PlannotatorUriHandler } from "./uri-handler";

export function activate(context: vscode.ExtensionContext): void {
  const openInSimpleBrowser = (url: string) => {
    return vscode.commands.executeCommand("simpleBrowser.show", url);
  };

  // Register URI handler for vscode://plannotator-webview/open?url=...
  const uriHandler = new PlannotatorUriHandler(openInSimpleBrowser);
  context.subscriptions.push(vscode.window.registerUriHandler(uriHandler));

  // Inject PLANNOTATOR_BROWSER env var into integrated terminals
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
