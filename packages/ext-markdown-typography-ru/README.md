# @nuckty/ext-markdown-typography-ru

> **Russian typography for markdown — the dash never dangles from its word.**

A markdown-extension for [nuckty](https://github.com/nuckty/nuckty). It applies Russian typography during an mdast transform, before the mdast → BEMJSON bridge: it walks the text and normalizes the spaces around the em-dash (`—`, U+2014 — the Russian «тире») — a non-breaking space before it and a regular space after, per the Russian typographic convention (`<word> — <text>`).

A site loads this extension only when it wants Russian typography. Without it, the core emits text verbatim with no typographic substitutions — an English-language site simply does not list it.

## What it adds

A remark mdast plugin, registered through `env.markdown.use(...)`. It is a markdown-extension only — no block, no CLI command, no build stage.

It normalizes the spaces around an em-dash that is already there:

- a non-breaking space before the dash — the dash never dangles at a line start;
- a regular space after — the canonical «word — text» form;
- the rule applies to any source spacing: on both sides, on one, or no spaces between letters at all.

The extension never creates a dash: a hyphen is not turned into one, and the en-dash (`–`) is left untouched. The dash in the text is the author's.

Code is skipped: `code` and `inlineCode` are separate mdast node types, so the transform never visits them — code is left exactly as written.

## How to load

This example extends the quickstart with the standard `@nuckty/ext-block-root` document handler. Add the new extension to `ext` in the global `config/config-nuckty.ts`, retaining the other entries. If you use a custom document handler, keep its registration instead of `@nuckty/ext-block-root`.

```ts
import { defineNucktyConfig } from '@nuckty/core';

export default defineNucktyConfig({
    targets: { main: { configDir: 'config/', outDir: 'site/' } },
    ext: ['@nuckty/ext-block-root', '@nuckty/ext-markdown-typography-ru'],
});
```

The core knows nothing about typography. The extension does the transform only for consumers that load it. When loaded through the global `ext`, the extension processes Markdown for every target being built. The value of `target.lang` does not automatically limit its scope.

## Contract

`register(env: NucktyEnv)` installs `remarkTypographyRu` through `env.markdown.use`. The package exports this remark plugin and the text function `applyRussianTypography`.

## Spec

Behavior is fixed by the openspec `ext-markdown-typography-ru` spec (`openspec/specs/ext-markdown-typography-ru/spec.md`): registered as an mdast transform, em-dash and non-breaking spaces, code is skipped, installed separately.

## License

MIT.
