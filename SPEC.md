# Plannotator WebView - VSCode Extension Spec

## Goal

Intercept browser open calls from Plannotator and display them inside a VSCode tab instead of an external browser. Support both Claude Code in the integrated terminal and Claude Code as a VSCode extension.

## How Plannotator Opens a Browser

Plannotator's server starts on a local port and opens a browser using Node's `open` package (or similar). This respects the `BROWSER` environment variable on Linux/macOS.

## Architecture

```
┌─────────────────────────────────────────────────┐
│ VSCode                                          │
│                                                 │
│  ┌──────────────┐    ┌───────────────────────┐  │
│  │ Terminal      │    │ Simple Browser Tab    │  │
│  │              │    │                       │  │
│  │ Claude Code  │    │  Plannotator UI       │  │
│  │ runs here    │    │  (localhost:PORT)      │  │
│  │              │    │                       │  │
│  └──────┬───────┘    └───────────▲───────────┘  │
│         │                        │              │
│         │ BROWSER env var        │              │
│         │ points to router       │              │
│         ▼                        │              │
│  ┌──────────────┐                │              │
│  │ Router Script │───────────────┘              │
│  │              │  matches plannotator?         │
│  │              │  → code --open-url vscode://  │
│  │              │  → extension opens Simple     │
│  │              │    Browser                    │
│  │              │                               │
│  │              │  no match?                    │
│  │              │  → xdg-open (normal browser)  │
│  └──────────────┘                               │
│                                                 │
│  ┌──────────────────────────────────────────┐   │
│  │ Extension (plannotator-webview)          │   │
│  │                                          │   │
│  │ • On activate: inject BROWSER env var    │   │
│  │   into integrated terminals              │   │
│  │ • URI handler: vscode://plannotator-     │   │
│  │   webview/open?url=...                   │   │
│  │ • Opens Simple Browser for matched URLs  │   │
│  │ • Falls through to external browser      │   │
│  │   for everything else                    │   │
│  └──────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
```

## Two Claude Code Modes

### 1. Claude Code in Integrated Terminal

- User runs `claude` in VSCode's terminal
- Extension injects `BROWSER` env var via `context.environmentVariableCollection.replace()`
- When Plannotator opens a URL, the router script handles it

### 2. Claude Code as VSCode Extension

- Claude Code extension opens URLs via `vscode.env.openExternal()`
- VSCode fires `registerExternalUriOpener` — our extension intercepts
- If URL matches plannotator pattern → open Simple Browser
- If not → pass through to default handler

## Components

### 1. Router Script (`bin/open-in-vscode`)

Shell script that `BROWSER` env var points to.

```bash
#!/usr/bin/env bash
URL="$1"
PATTERN="${PLANNOTATOR_URL_PATTERN:-plannotator}"

if [[ "$URL" == *"$PATTERN"* ]]; then
  code --open-url "vscode://plannotator-webview/open?url=$(python3 -c "import urllib.parse; print(urllib.parse.quote('$URL', safe=''))")"
else
  xdg-open "$URL" 2>/dev/null || open "$URL" 2>/dev/null
fi
```

### 2. Extension Entry Point (`src/extension.ts`)

Responsibilities:
- **Activate on startup** (`onStartupFinished`)
- **Inject BROWSER env var** into integrated terminals pointing to the bundled router script
- **Register URI handler** for `vscode://plannotator-webview/open?url=...`
- **Register external URI opener** to catch URLs from Claude Code VSCode extension
- **Open Simple Browser** via `vscode.commands.executeCommand('simpleBrowser.show', url)` for matched URLs

### 3. Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `plannotatorWebview.urlPattern` | `"plannotator"` | Substring match against URL to identify Plannotator |

## Package Management

Use **Bun** for dependency management and scripts.

```json
{
  "scripts": {
    "compile": "tsc -p ./",
    "watch": "tsc -watch -p ./",
    "package": "vsce package"
  }
}
```

Install with `bun install`, run with `bun run compile`.

## Key VSCode APIs

| API | Purpose |
|-----|---------|
| `context.environmentVariableCollection.replace()` | Inject BROWSER env var into terminals |
| `vscode.window.registerExternalUriOpener()` | Intercept URL opens from extensions |
| `vscode.window.registerUriHandler()` | Handle `vscode://` URI scheme callbacks |
| `vscode.commands.executeCommand('simpleBrowser.show', url)` | Open URL in VSCode Simple Browser tab |
| `vscode.workspace.getConfiguration()` | Read user settings |

## File Structure

```
plannotator-vscode/
├── SPEC.md
├── package.json          # Extension manifest + bun
├── tsconfig.json
├── bun.lock
├── bin/
│   └── open-in-vscode    # Router shell script
├── src/
│   └── extension.ts      # Extension entry point
└── out/                   # Compiled JS (gitignored)
```

## Edge Cases

- **Port detection**: Plannotator URL contains a dynamic port. The URL pattern match handles this since we match on "plannotator" substring, not port.
- **Multiple Plannotator tabs**: Each `simpleBrowser.show` call can reuse or create a new tab. Default behavior is fine.
- **No VSCode CLI on PATH**: If `code` isn't on PATH, the router script falls back to `xdg-open`. User needs to install "Shell Command: Install 'code' command in PATH" from VSCode.
- **CSP / X-Frame-Options**: If Plannotator sets headers blocking iframe embedding, Simple Browser won't render it. Would need a custom WebView with a proxy, or a patch to Plannotator to allow framing from `vscode-webview://`.
