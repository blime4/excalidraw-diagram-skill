---
name: excalidraw-diagram
description: Generate Excalidraw diagrams for Obsidian. Default mode is handcrafted explanatory diagrams. Use `--mermaid` or `--mode mermaid` to convert Mermaid through the browser-backed official pipeline.
metadata:
  provider: codex
  role: wrapper
  default_mode: handcrafted
  modes:
    - handcrafted
    - mermaid
---

# Excalidraw Diagram Skill

This is the Codex wrapper for the shared `excalidraw-diagram` capability.

It has two modes:

1. `handcrafted` (default)
   - Use for teaching diagrams, insight boards, visual explanations, comparison boards, annotated concept maps, and any result that should feel intentionally designed rather than auto-laid-out.
   - The assistant should compose the diagram manually in Excalidraw JSON / Obsidian `.excalidraw.md` form.

2. `mermaid`
   - Triggered by `--mermaid` or `--mode mermaid`.
   - Use for flowcharts, state diagrams, class diagrams, ER diagrams, and other structured graph-like subdiagrams.
   - This mode should call the browser-backed Mermaid pipeline rather than hand-building final Excalidraw elements.

## Routing Rules

### Default Route

If the user invokes `/excalidraw-diagram-skill` without mode flags:

- choose `handcrafted`
- optimize for visual explanation quality
- prefer zones, callouts, examples, legends, before/after panels, and highlighted insights
- do not fall back to Mermaid unless the user explicitly requests it or a sub-part is clearly best represented as Mermaid

### Mermaid Route

If the user includes either:

- `--mermaid`
- `--mode mermaid`

then:

- route the structured portion through the Mermaid backend
- use the browser-backed converter script:
  `scripts/mermaid-to-excalidraw-browser.mjs`
- keep Mermaid as a subdiagram generator, not as the final design language for the whole page unless the user explicitly wants that

### Mixed Route

If the user wants a rich explanatory diagram and part of it is naturally a flowchart:

- keep the overall mode as `handcrafted`
- generate only the structured subgraph with Mermaid
- insert that Mermaid-derived subgraph into the larger handcrafted board
- validate the final combined file as one Excalidraw document

## Codex-Specific Expectations

- Codex should prefer performing the work directly rather than only describing the plan.
- When mode is `mermaid`, the preferred execution path is real-browser conversion, not a Node/jsdom-only approximation.
- When mode is `handcrafted`, Codex should still obey the shared Obsidian Excalidraw output rules and validation rules.
- Before claiming completion, always run the shared overlap validator on the final artifact.

## Local Assets

After running the repository sync script, this provider-local folder should contain:

- `references/`
- `scripts/`
- `docs/`

This wrapper should use those local copies when installed as a self-contained skill:

- validator and schema:
  `references/`
- Mermaid browser backend:
  `scripts/`
- handcrafted guidance and architecture notes:
  `docs/`

## Output Contract

Regardless of mode, the final result must:

- be an Obsidian `.excalidraw.md` file
- include valid Excalidraw parsed frontmatter
- populate `## Text Elements`
- use `fontFamily: 5` for text
- pass `references/validate-layout.py`

## Recommended Build Layout

This wrapper is intentionally thin.

- provider-specific behavior belongs here
- shared diagram logic belongs under `shared/`
- heavy scripts should not be duplicated by hand between provider wrappers

## TODO Hooks

When you flesh this out later, this file should point to:

- `docs/prompt-guidelines.md`
- `docs/architecture.md`
- `docs/modes.md`
- `references/validate-layout.py`
- `scripts/mermaid-to-excalidraw-browser.mjs`
- Codex-specific phrasing for autonomous execution
