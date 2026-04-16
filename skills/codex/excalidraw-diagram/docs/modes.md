# Modes

## `handcrafted`

Default mode.

Use when the result should feel like a visual explanation board rather than an automatically converted graph.

Primary backend:

- manual Excalidraw composition

Optional embedded backend:

- Mermaid-derived subgraphs for strongly structured sections

## `mermaid`

Explicit mode.

Triggered by:

- `--mermaid`
- `--mode mermaid`

Use when the output is primarily a structured graph:

- flowchart
- state diagram
- sequence diagram
- class diagram
- ER diagram

Primary backend:

- real-browser Mermaid conversion via `shared/backends/mermaid-browser/mermaid-to-excalidraw-browser.mjs`
