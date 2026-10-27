# @nuckty/ext-block-root

> **The page wrapper block — `root`.**

A document and block extension for [nuckty](https://github.com/nuckty/nuckty). It registers the standard document handler and supplies the `root` block, which wraps page content in `<html>`, `<head>`, and `<body>`.

## What it adds

`register(env)` registers a handler through `env.document` and adds the package's `blocks/` directory through `env.levels`. The handler maps the engine-provided `DocumentData` to `{ block: 'root', props, content }`.

The block uses the `wrap` mode to form the document. The engine does not know the `root` name or its markup; it only passes `DocumentData` to the registered handler and serializes the returned BEMJSON tree.

The block reads page data from `n.props`:

- `page` — URL, title, source and sitemap metadata;
- `content` — a BEMTree containing already serialized content in a `raw` node;
- `assets` — CSS, JS, image, and video maps;
- `lang` — the current target's language;
- `alternates` — `Map<lang, { url, title, host }>` for hreflang.

The standard block emits the title, viewport, hreflang links, all nonempty CSS bundles, and JavaScript bundles with `defer`. A site override can select bundles, add metadata, and place inner layout blocks. The core does not select a block from `page.layout`.

## Naming contract

The extension owns only the `root` name. The `page*` namespace (`page`, `page-index`, `page-about`, …) stays with the site — no collision with the core.

## How to load

```bash
npm install @nuckty/ext-block-root
```

Add the extension to `ext` in the global `config/config-nuckty.ts`, retaining other extension entries. It registers the document handler; remove any other handler registration before using it:

```ts
import { defineNucktyConfig } from '@nuckty/core';

export default defineNucktyConfig({
    targets: { main: { configDir: 'config/', outDir: 'site/' } },
    ext: ['@nuckty/ext-block-root'],
});
```

Add `root` to each document bundle's bemdecl, e.g. `blocks/page/page.bemdecl.js`.

## Overriding

Place your own `blocks/root/root.nu.ts` on a later level (for example, the site's `blocks/`) — the engine picks it by level priority. That is how a site changes the `<head>` structure, meta tags, or analytics counters without forking the package.

## Spec

Behavior is fixed by the openspec `ext-block-root` spec (`openspec/specs/ext-block-root/spec.md`).

## License

MIT.
