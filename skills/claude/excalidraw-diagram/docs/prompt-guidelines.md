# Handcrafted Mode Guidelines

`handcrafted` is the default mode for `excalidraw-diagram`.

This mode is for diagrams that should feel designed, taught, and narrated, not merely auto-laid-out.

## Use Handcrafted Mode For

- visual explanations
- teaching boards
- insight maps
- annotated architecture diagrams
- before/after comparisons
- tradeoff summaries
- "why this matters" style posters

## Visual Expectations

- Use a clear visual hierarchy: title, sections, key ideas, and supporting detail.
- Prefer grouped zones over one giant undifferentiated node graph.
- Use callouts, legends, examples, and highlighted takeaways.
- Avoid plain Mermaid-looking box networks unless the user explicitly wants that style.
- Keep enough whitespace so the board remains readable in Obsidian Excalidraw view.

## Composition Pattern

For a rich explanatory board, a reliable structure is:

1. Title / framing statement
2. Main concept or flow area
3. Supporting annotations
4. Key takeaway / warning / conclusion card

## Mermaid Inside Handcrafted Mode

If one portion is strongly structural:

- generate only that subgraph with the Mermaid backend
- treat it as one panel inside the bigger handcrafted composition
- surround it with annotations and explanation cards

Handcrafted mode should own the overall page composition even when it embeds Mermaid-derived subgraphs.
