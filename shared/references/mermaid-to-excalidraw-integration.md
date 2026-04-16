# Mermaid to Excalidraw Integration Notes

These notes summarize the local review of `https://github.com/excalidraw/mermaid-to-excalidraw.git` and how this skill should use it.

## What the upstream package does

- Public entry point: `parseMermaidToExcalidraw(definition, config)`.
- Internally it calls Mermaid to render SVG into the DOM, then parses Mermaid's diagram database and SVG positions.
- It supports flowchart, sequence, class, ER, and state diagrams as structured Excalidraw skeleton elements.
- Unsupported diagram types fall back to an SVG image element.
- For flowcharts, it preserves Mermaid's DOM-derived node coordinates, node dimensions, styles, subgraphs, and edge reflection points.
- The result is an Excalidraw skeleton, not a complete Obsidian `.excalidraw.md` file.

## Important limitations

- The package is not a full layout engine for explanatory posters.
- Mermaid's layout can be too tight once labels are rendered with Excalifont or Chinese/CJK text.
- The skeleton labels still need to become real text elements when writing parsed Obsidian Excalidraw files.
- After node size expansion, arrow points from the original Mermaid SVG can become stale.
- Node/jsdom use requires browser polyfills such as `document`, `window`, `SVGElement.getBBox`, `getComputedTextLength`, `atob`, and `btoa`.

## Skill policy

Use Mermaid conversion only for the structured subgraph portion of a diagram. For the final teaching diagram, compose the converted subgraph with explanatory visual elements:

- large title and thesis
- callout cards
- before/after panels
- warning or insight badges
- legends and examples
- background zones
- manually placed annotations

The final composition must be validated as a whole.

## Browser converter pipeline

Use:

```powershell
node C:\Users\denglinAI\.codex\skills\excalidraw-diagram\scripts\mermaid-to-excalidraw-browser.mjs `
  --input path\to\diagram.mmd `
  --output path\to\diagram.excalidraw.md `
  --x 80 --y 80 --fontSize 20
```

This is the default Mermaid path. The converter intentionally follows the upstream playground and visual-test path in a real browser:

1. Use the cloned `mermaid-to-excalidraw` repository as the execution environment.
2. Start a small Vite browser app.
3. Launch Chromium through Playwright.
4. Load Excalifont with the upstream `ensureExcalidrawFontsLoaded()` helper.
5. Call upstream `parseMermaidToExcalidraw()` in the browser.
6. Expand the skeleton with Excalidraw's official `convertToExcalidrawElements()` instead of hand-building full elements.
7. Normalize text to Excalifont `fontFamily: 5`.
8. Emit either full JSON or Obsidian-ready `.excalidraw.md`.

This replaced the earlier Node/jsdom and hand-built paths because the upstream visual tests reveal that correct output depends on real browser geometry and font loading. Hand-building final JSON from skeletons is fragile: labels, bound text, arrow binding, and text metrics can drift from real Excalidraw behavior.

## Layout policy

The browser converter is necessary but not sufficient. Mermaid's flowchart layout can still be visually boring or too dense for teaching diagrams, so the skill must:

1. Treat the converted Mermaid graph as a sub-diagram inside a larger teaching composition.
2. Avoid dense "all-in-one" Mermaid graphs; split dense ideas into multiple small Mermaid subgraphs plus freeform explanation cards.
3. Run `validate-layout.py` on the final combined `.excalidraw.md`.
4. If validation passes but the picture is still visually confusing, redesign the Mermaid source or replace part of it with hand-laid explanatory panels.

Fallback paths, not default:

- `mermaid-to-excalidraw-official.mjs`: Node/jsdom + official `convertToExcalidrawElements()`. Structurally better than hand-building, but browser geometry may still drift.
- `mermaid-to-excalidraw-safe.mjs`: old hand-built conversion path. Keep only for experiments; do not use for final diagrams unless the browser path is unavailable.

Historical hand-built converter behavior, now fallback only:

1. Bootstrap or reuse a temp runtime containing `@excalidraw/mermaid-to-excalidraw`, Mermaid, jsdom, and DOMPurify.
2. Install a jsdom browser environment before importing Mermaid-related code.
3. Convert Mermaid to upstream skeleton elements.
4. Scale the skeleton coordinates to create breathing room.
5. Convert skeleton containers and labels into full Excalidraw shape/text elements.
6. Estimate CJK-aware text sizes and expand nodes with padding.
7. Resolve collisions between visible shapes.
8. Recompute arrows from the final source/target node boxes.
9. Emit either full JSON or Obsidian-ready `.excalidraw.md`.

## Validation rule

After inserting any Mermaid-converted subgraph into a larger drawing, run:

```powershell
python C:\Users\denglinAI\.codex\skills\excalidraw-diagram\references\validate-layout.py path\to\diagram.excalidraw.md
```

Do not claim completion until the validator reports no overlaps.
