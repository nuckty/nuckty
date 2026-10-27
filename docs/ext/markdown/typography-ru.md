# @nuckty/ext-markdown-typography-ru

Russian typography: a non-breaking space keeps an em dash with the preceding word in supported prose patterns. The extension walks the Markdown tree before rendering and edits text only.

## Type

[markdown](../../how/ext/markdown.md) — registers an mdast transform via `env.markdown.use(...)`. It adds no block, no command, and no stage.

## What it does

Before the mdast → [BEMJSON](../../how/bemjson.md) bridge builds the page tree, the extension normalizes the spaces around the em dash ("—") according to the rules of Russian typography:

- **non-breaking space before the dash** — the dash will not hang at the start of a line;
- **regular space after the dash** — the canonical "word — text" form.

The rule applies to every variant of the source spacing: spaces on both sides, on one side only, or none at all between letters. The extension does not create dashes itself: a hyphen is not turned into a dash, and the en dash ("–") is left untouched. The author writes the dash in the text.

Repeated spaces, tabs and existing non-breaking spaces converge to the same spacing. Line breaks, a dialogue dash at the start of a line and unspaced numeric ranges remain unchanged.

## Code is left untouched

Code nodes — fenced code blocks and inline code — are skipped. Inside code, the typography changes nothing: exact text matters there.

## Russian only

The extension is optional: it is enabled when Russian typography is needed. An English-language site does not need it — it is simply not installed, and the core knows nothing about typography. Without the extension, text is output verbatim, with no typographic substitutions.

## Installation

This example extends the quickstart with the standard `@nuckty/ext-block-root` document handler. Add the new extension to `ext` in the global `config/config-nuckty.ts`, retaining the other entries. If you use a custom document handler, keep its registration instead of `@nuckty/ext-block-root`.

Run the command below from the extracted [starter project](../../how/start.md); prepared extension archives are in `packages/`.

```
npm install ./packages/nuckty-ext-markdown-typography-ru-1.0.0-beta1.tgz
```

```ts
import { defineNucktyConfig } from '@nuckty/core';

export default defineNucktyConfig({
    targets: { main: { configDir: 'config/', outDir: 'site/' } },
    ext: ['@nuckty/ext-block-root', '@nuckty/ext-markdown-typography-ru'],
});
```

When loaded through the global `ext`, the extension processes Markdown for every target being built. The value of `target.lang` does not automatically limit its scope.
