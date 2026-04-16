---
name: excalidraw-diagram
description: Generate Excalidraw diagrams for Obsidian. Default mode is handcrafted explanatory diagrams. Use `--mermaid` or `--mode mermaid` to convert Mermaid through the browser-backed official pipeline.
metadata:
  provider: claude
  role: wrapper
  default_mode: handcrafted
  modes:
    - handcrafted
    - mermaid
---

# Excalidraw Diagram Skill

This is the Claude Code wrapper for the shared `excalidraw-diagram` capability.

It exposes the same two modes as the Codex wrapper, but the instructions are phrased for Claude-style skill execution.

## Modes

### `handcrafted` (default)

Use this when the goal is an explanatory or presentation-quality visual:

- visual teaching boards
- diagrammatic summaries
- annotated architecture overviews
- concept maps with commentary
- side-by-side comparisons
- insight-heavy infographic layouts

In this mode, the assistant should compose the diagram deliberately rather than defaulting to auto-layout.

### `mermaid`

Triggered by:

- `--mermaid`
- `--mode mermaid`

Use this for structured graph conversion:

- flowcharts
- sequence diagrams
- state diagrams
- class diagrams
- ER diagrams

This route should use the browser-backed Mermaid conversion pipeline, then write the result as Obsidian Excalidraw output.

## Routing Policy

### Default

Without an explicit mode flag:

- choose `handcrafted`
- optimize for clarity, teaching value, and visual composition
- avoid turning the whole result into a plain Mermaid-shaped graph unless the user explicitly asks for that

### Explicit Mermaid

With `--mermaid` or `--mode mermaid`:

- use the shared Mermaid browser backend
- use the provider-local backend script after sync:
  `scripts/mermaid-to-excalidraw-browser.mjs`
- do not hand-build final Excalidraw elements from Mermaid skeletons
- preserve the upstream-style conversion path:
  Mermaid parse -> Excalidraw official element conversion -> Obsidian export

### Hybrid

If the user wants a rich visual explanation and only one region is strongly structural:

- keep the overall task in `handcrafted`
- generate that structural region with Mermaid
- integrate the Mermaid-derived portion into the surrounding handcrafted board

## Claude-Specific Expectations

- Claude should follow the shared skill structure, but adapt wording to Claude Code's execution conventions.
- If the user names this skill directly, it should be treated as the authoritative diagram skill for this repo.
- Claude should validate the final file and fix overlap issues before presenting completion.
- Claude should prefer high-quality visual composition over generic box-and-arrow output.

## Local Dependencies

After running the repository sync script, this provider-local folder should contain:

- `references/`
- `scripts/`
- `docs/`

Claude should rely on those local copies when the skill is installed.

## Output Contract

The final artifact must:

- use `.excalidraw.md`
- follow the Obsidian Excalidraw parsed file format
- populate `## Text Elements`
- use `fontFamily: 5`
- pass `references/validate-layout.py`

## Future Expansion Points

When this wrapper is fully implemented later, add:

- links to `docs/prompt-guidelines.md`
- links to `docs/architecture.md`
- links to `docs/modes.md`
- links to `scripts/mermaid-to-excalidraw-browser.mjs`
- provider-specific notes about how Claude should invoke the backend and report results
