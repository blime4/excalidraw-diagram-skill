# excalidraw-diagram-skill

Excalidraw diagram generator skill repo with a shared implementation layer and thin provider wrappers for Codex and Claude Code.

## Goals

- default behavior should produce handcrafted explanatory boards
- `--mermaid` should use a more official Mermaid -> Excalidraw conversion path
- shared logic should live once, not be copied by hand across providers

## Repository Layout

```text
shared/
  references/
  backends/
    handcrafted/
    mermaid-browser/
  docs/

skills/
  codex/
    excalidraw-diagram/
  claude/
    excalidraw-diagram/

tools/
  sync-skill.ps1
```

## Modes

- default: `handcrafted`
- explicit: `--mermaid` or `--mode mermaid`

## Sync Shared Assets

Run:

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\sync-skill.ps1
```

This copies shared references, docs, and browser Mermaid backend files into:

- `skills/codex/excalidraw-diagram/`
- `skills/claude/excalidraw-diagram/`

so each provider folder can be packaged or installed as a self-contained skill.

## Based On

- https://github.com/coleam00/excalidraw-diagram-skill
- https://github.com/axtonliu/axton-obsidian-visual-skills

## Example Style

<img width="1584" height="1046" alt="image" src="https://github.com/user-attachments/assets/0412f191-572a-46b2-8955-18ca60150d67" />
