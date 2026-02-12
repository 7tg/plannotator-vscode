import * as vscode from "vscode";
import * as path from "path";

export class PanelManager {
  private panels: Set<vscode.WebviewPanel> = new Set();
  private extensionPath: string = "";

  setExtensionPath(p: string): void {
    this.extensionPath = p;
  }

  open(url: string): vscode.WebviewPanel {
    const panel = vscode.window.createWebviewPanel(
      "plannotator",
      "Plannotator",
      vscode.ViewColumn.One,
      { enableScripts: true, retainContextWhenHidden: true },
    );
    panel.iconPath = vscode.Uri.file(
      path.join(this.extensionPath, "images", "icon.png"),
    );
    panel.webview.html = getHtml(url);
    this.panels.add(panel);
    panel.onDidDispose(() => {
      this.panels.delete(panel);
    });
    return panel;
  }

  closeAll(): void {
    for (const panel of this.panels) {
      panel.dispose();
    }
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
