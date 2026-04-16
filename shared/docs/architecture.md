# Repository Architecture

This repository separates shared diagram logic from provider-specific wrappers.

## Layers

### `shared/`

Source of truth for reusable assets:

- validation scripts
- Excalidraw references
- Mermaid conversion backends
- handcrafted-mode guidance
- cross-provider documentation

### `skills/codex/`

Codex-specific wrapper skills:

- provider wording
- Codex execution assumptions
- references/scripts synchronized from `shared/`

### `skills/claude/`

Claude Code-specific wrapper skills:

- provider wording
- Claude execution assumptions
- references/scripts synchronized from `shared/`

### `tools/`

Repository maintenance helpers:

- sync shared assets into provider wrappers
- packaging helpers if needed later

## Mode Model

The repository supports one skill name with multiple backends:

- default mode: `handcrafted`
- explicit structured mode: `mermaid`

This avoids splitting the user-facing concept into too many separate skills while still keeping implementation backends isolated.
