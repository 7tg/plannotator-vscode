#!/usr/bin/env node
// Plannotator WebView Router
// Invoked via PLANNOTATOR_BROWSER env var — all URLs are plannotator URLs.
// Redirects to VS Code Simple Browser via URI handler.

import { execSync } from "child_process";

const url = process.argv[2];
if (!url) process.exit(0);

const encoded = encodeURIComponent(url);
const vscodeUri = `vscode://plannotator-webview/open?url=${encoded}`;

for (const cli of ["code", "code-insiders"]) {
  try {
    execSync(`${cli} --open-url "${vscodeUri}"`, { stdio: "ignore" });
    process.exit(0);
  } catch {}
}

process.stderr.write("[plannotator-webview] Warning: 'code' CLI not found.\n");
process.exit(1);
