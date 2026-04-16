#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawn, execFileSync } from "node:child_process";
import { createRequire } from "node:module";

const DEFAULT_REPO = "C:\\Users\\denglinAI\\Desktop\\MyObsidian\\tmp\\mermaid-to-excalidraw";
const DEFAULT_PORT = 3429;

function parseArgs(argv) {
  const args = {
    repo: DEFAULT_REPO,
    port: DEFAULT_PORT,
    fontSize: 20,
    x: 80,
    y: 80,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith("--")) {
      continue;
    }
    const key = arg.slice(2);
    const value = argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[++i] : "true";
    args[key] = value;
  }
  if (!args.input) {
    throw new Error("Missing --input <file.mmd>");
  }
  if (!args.output) {
    throw new Error("Missing --output <file.excalidraw.md|file.json>");
  }
  args.port = Number(args.port) || DEFAULT_PORT;
  args.fontSize = Number(args.fontSize) || 20;
  args.x = Number(args.x) || 80;
  args.y = Number(args.y) || 80;
  return args;
}

function log(message) {
  if (process.env.DEBUG_MERMAID_BROWSER) {
    console.error(message);
  }
}

function ensureRepo(repo) {
  if (!fs.existsSync(path.join(repo, "src", "index.ts"))) {
    throw new Error(`Missing mermaid-to-excalidraw repo at ${repo}`);
  }
  if (!fs.existsSync(path.join(repo, "node_modules"))) {
    execFileSync("npm", ["install"], { cwd: repo, stdio: "inherit" });
  }
}

function writeBrowserApp(repo) {
  const appDir = path.join(repo, ".codex-browser-converter");
  fs.mkdirSync(appDir, { recursive: true });
  fs.writeFileSync(
    path.join(appDir, "index.html"),
    `<html><head><title>Codex Mermaid Converter</title></head><body><div id="root"></div><script type="module" src="/main.ts"></script></body></html>\n`,
    "utf8",
  );
  fs.writeFileSync(
    path.join(appDir, "vite.config.ts"),
    `import { defineConfig } from "vite";
import { resolve } from "node:path";

export default defineConfig({
  root: __dirname,
  resolve: { dedupe: ["react", "react-dom", "react/jsx-runtime"] },
  define: { "process.env.IS_PREACT": JSON.stringify("false") },
  server: {
    host: "127.0.0.1",
    fs: { allow: [resolve(__dirname, "..")] },
  },
});
`,
    "utf8",
  );
  fs.writeFileSync(
    path.join(appDir, "main.ts"),
    `import { convertToExcalidrawElements, FONT_FAMILY } from "@excalidraw/excalidraw";
import { parseMermaidToExcalidraw } from "../src/index";
import { DEFAULT_FONT_SIZE } from "../src/constants";
import { ensureExcalidrawFontsLoaded } from "../playground/loadExcalidrawFonts";
import "@excalidraw/excalidraw/index.css";

const clearTextMeasureCache = async () => {
  try {
    const [{ charWidth }, { getFontString }] = await Promise.all([
      import("@excalidraw/element"),
      import("@excalidraw/common"),
    ]);
    [12, 14, 16, 18, 20, 24, DEFAULT_FONT_SIZE].forEach((fontSize) => {
      charWidth.clearCache(getFontString({ fontSize, fontFamily: FONT_FAMILY.Excalifont }));
    });
  } catch (error) {
    console.warn("Could not clear Excalidraw text cache", error);
  }
};

(window as any).__convertMermaidToExcalidraw = async (definition: string, options: { fontSize?: number }) => {
  await ensureExcalidrawFontsLoaded();
  await document.fonts.ready;
  const fontSize = options.fontSize || DEFAULT_FONT_SIZE;
  const result = await parseMermaidToExcalidraw(definition, {
    flowchart: { curve: "linear" },
    themeVariables: { fontSize: \`\${fontSize}px\` },
    maxEdges: 2000,
    maxTextSize: 100000,
  });
  await clearTextMeasureCache();
  const elements = convertToExcalidrawElements(result.elements, { regenerateIds: false });
  return {
    elements,
    files: result.files || {},
    skeleton: result.elements,
  };
};

(window as any).__converterReady = true;
`,
    "utf8",
  );
  return appDir;
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForServer(url, timeoutMs = 60000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        return;
      }
    } catch {
      // keep waiting
    }
    await wait(500);
  }
  throw new Error(`Timed out waiting for ${url}`);
}

function normalizeAndTranslate(elements, targetX, targetY) {
  const boxes = elements
    .filter((element) => !element.isDeleted && typeof element.x === "number" && typeof element.y === "number")
    .map((element) => ({
      x: element.x,
      y: element.y,
      x2: element.x + Math.abs(element.width || 0),
      y2: element.y + Math.abs(element.height || 0),
    }));
  const minX = Math.min(...boxes.map((box) => box.x));
  const minY = Math.min(...boxes.map((box) => box.y));
  const dx = targetX - minX;
  const dy = targetY - minY;
  return elements.map((element) => {
    const next = { ...element };
    if (typeof next.x === "number") next.x += dx;
    if (typeof next.y === "number") next.y += dy;
    if (next.type === "text") {
      next.fontFamily = 5;
      next.originalText = next.originalText ?? next.text ?? "";
      next.rawText = next.rawText ?? next.text ?? "";
      next.lineHeight = next.lineHeight || 1.25;
    }
    return next;
  });
}

function drawingData(elements, files) {
  return {
    type: "excalidraw",
    version: 2,
    source: "https://github.com/zsviczian/obsidian-excalidraw-plugin",
    elements,
    appState: {
      gridSize: null,
      viewBackgroundColor: "#ffffff",
    },
    files: files || {},
  };
}

function toMarkdown(data) {
  const textElements = data.elements
    .filter((element) => element.type === "text")
    .map((element) => `${element.originalText || element.text || ""} ^${element.id}`)
    .join("\n\n");
  return `---

excalidraw-plugin: parsed
tags: [excalidraw]

---
==⚠  Switch to EXCALIDRAW VIEW in the MORE OPTIONS menu of this document. ⚠==

# Excalidraw Data

## Text Elements
${textElements}

%%
## Drawing
\`\`\`json
${JSON.stringify(data, null, 2)}
\`\`\`
%%
`;
}

async function ensureChromium(repo) {
  const requireFromRepo = createRequire(path.join(repo, "package.json"));
  const { chromium } = requireFromRepo("playwright");
  try {
    const browser = await chromium.launch({ headless: true });
    await browser.close();
  } catch (error) {
    if (String(error).includes("Executable doesn't exist") || String(error).includes("browserType.launch")) {
      execFileSync(process.platform === "win32" ? "npx.cmd" : "npx", ["playwright", "install", "chromium"], { cwd: repo, stdio: "inherit" });
      return;
    }
    throw error;
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  log("[browser-converter] ensuring repo/deps");
  ensureRepo(args.repo);
  log("[browser-converter] ensuring chromium");
  await ensureChromium(args.repo);
  log("[browser-converter] writing browser app");
  const appDir = writeBrowserApp(args.repo);
  log("[browser-converter] starting vite");
  const viteBin = path.join(args.repo, "node_modules", "vite", "bin", "vite.js");
  const server = spawn(
    process.execPath,
    [viteBin, "--config", "vite.config.ts", "--host", "127.0.0.1", "--port", String(args.port), "--strictPort"],
    { cwd: appDir, stdio: ["ignore", "pipe", "pipe"] },
  );
  let stderr = "";
  let stdout = "";
  server.stdout.on("data", (chunk) => {
    stdout += chunk.toString();
    if (process.env.DEBUG_MERMAID_BROWSER) {
      process.stderr.write(chunk);
    }
  });
  server.stderr.on("data", (chunk) => {
    stderr += chunk.toString();
    if (process.env.DEBUG_MERMAID_BROWSER) {
      process.stderr.write(chunk);
    }
  });
  try {
    const url = `http://127.0.0.1:${args.port}/`;
    log(`[browser-converter] waiting for ${url}`);
    await waitForServer(url, 30000);
    log("[browser-converter] launching browser");
    const requireFromRepo = createRequire(path.join(args.repo, "package.json"));
    const { chromium } = requireFromRepo("playwright");
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1800, height: 1400 }, deviceScaleFactor: 1 });
    page.on("console", (msg) => {
      if (process.env.DEBUG_MERMAID_BROWSER) {
        process.stderr.write(`[browser:${msg.type()}] ${msg.text()}\n`);
      }
    });
    page.on("pageerror", (error) => {
      process.stderr.write(`[browser:error] ${error.stack || error.message}\n`);
    });
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
    log("[browser-converter] waiting for page readiness");
    await page.waitForFunction(() => (window).__converterReady === true, null, { timeout: 60000 });
    log("[browser-converter] converting mermaid");
    const definition = fs.readFileSync(args.input, "utf8");
    const result = await page.evaluate(
      async ({ definition, fontSize }) => {
        return await (window).__convertMermaidToExcalidraw(definition, { fontSize });
      },
      { definition, fontSize: args.fontSize },
    );
    await browser.close();
    log("[browser-converter] writing output");
    const elements = normalizeAndTranslate(result.elements, args.x, args.y);
    const data = drawingData(elements, result.files);
    fs.mkdirSync(path.dirname(args.output), { recursive: true });
    if (args.output.toLowerCase().endsWith(".json")) {
      fs.writeFileSync(args.output, JSON.stringify(data, null, 2), "utf8");
    } else {
      fs.writeFileSync(args.output, toMarkdown(data), "utf8");
    }
    console.log(JSON.stringify({
      ok: true,
      elements: data.elements.length,
      skeleton: result.skeleton.length,
      output: args.output,
    }, null, 2));
  } finally {
    if (process.platform === "win32") {
      try {
        execFileSync("taskkill", ["/pid", String(server.pid), "/T", "/F"], { stdio: "ignore" });
      } catch {
        server.kill();
      }
    } else {
      server.kill("SIGTERM");
    }
    if (process.env.DEBUG_MERMAID_BROWSER && stdout.trim()) {
      process.stderr.write(stdout);
    }
    if (stderr.trim()) {
      process.stderr.write(stderr);
    }
  }
}

main().catch((error) => {
  console.error(error?.stack || String(error));
  process.exit(1);
});
