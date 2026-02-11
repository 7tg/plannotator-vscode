# 📋 Plannotator for VS Code

<p align="center">
  <img src="images/icon.png" alt="Plannotator for VS Code" width="128" />
</p>

[![CI](https://github.com/7tg/plannotator-vscode/actions/workflows/ci.yml/badge.svg)](https://github.com/7tg/plannotator-vscode/actions/workflows/ci.yml)
[![VS Code](https://img.shields.io/badge/VS%20Code-^1.85.0-blue?logo=visualstudiocode)](https://code.visualstudio.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Opens [Plannotator](https://github.com/backnotprop/plannotator) plan reviews inside VS Code tabs instead of an external browser. 🚀

## ✨ Features

- 🔄 Automatically intercepts Plannotator browser opens and displays them in VS Code's Simple Browser
- 🤖 Works with Claude Code running in VS Code's integrated terminal
- ⚙️ Configurable via VS Code settings
- 🎯 Manual URL opening via command palette

## 🔧 How It Works

When Plannotator opens a browser to show a plan review, this extension intercepts the request and opens it in a VS Code tab instead:

1. 💉 The extension injects a `PLANNOTATOR_BROWSER` environment variable into integrated terminals
2. 🔀 When Plannotator opens a URL, the bundled router script redirects it to VS Code via a `vscode://` URI
3. 🌐 The extension's URI handler receives the URL and opens it in Simple Browser

## 📦 Requirements

- [Plannotator](https://github.com/backnotprop/plannotator) installed
- VS Code `code` CLI on PATH (run "Shell Command: Install 'code' command in PATH" from the command palette)

## ⚙️ Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `plannotatorWebview.injectBrowser` | `true` | Inject PLANNOTATOR_BROWSER env var into integrated terminals |

## 🎮 Commands

- **Plannotator: Open URL in Simple Browser** — Manually open a URL in the Simple Browser tab

## 🐛 Troubleshooting

### URL opens in external browser instead of VS Code
- ✅ Ensure the `code` CLI is on your PATH
- ✅ Check that `plannotatorWebview.injectBrowser` is enabled
- ✅ Open a **new** terminal after installing the extension (existing terminals won't have the env var)

### Simple Browser shows a blank page
- ✅ Check if Plannotator's server is still running
- ✅ Some network configurations may block localhost access from the webview

## 📄 License

MIT
