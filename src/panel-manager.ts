import * as vscode from "vscode";
import * as path from "path";

export class PanelManager {
  private panel: vscode.WebviewPanel | null = null;
  private extensionPath: string = "";

  setExtensionPath(p: string): void {
    this.extensionPath = p;
  }

  open(url: string): void {
    if (this.panel) {
      this.panel.webview.html = getHtml(url);
      this.panel.reveal(vscode.ViewColumn.One);
    } else {
      this.panel = vscode.window.createWebviewPanel(
        "plannotator",
        "Plannotator",
        vscode.ViewColumn.One,
        { enableScripts: true, retainContextWhenHidden: true },
      );
      this.panel.iconPath = vscode.Uri.file(
        path.join(this.extensionPath, "images", "icon.png"),
      );
      this.panel.webview.html = getHtml(url);
      this.panel.onDidDispose(() => {
        this.panel = null;
      });
    }
  }

  close(): void {
    this.panel?.dispose();
  }
}

function getHtml(url: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy"
        content="default-src 'none'; style-src 'unsafe-inline'; frame-src http://127.0.0.1:*;">
  <style>
    body { margin: 0; padding: 0; height: 100vh; display: flex; flex-direction: column; overflow: hidden; }
    iframe { flex: 1; width: 100%; border: none; }
  </style>
</head>
<body>
  <iframe src="${url}"></iframe>
</body>
</html>`;
}
