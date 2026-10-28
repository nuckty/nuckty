# @nuckty/ext-block-root

The [HTML](../../out/html.md) page wrapper — the `root` block that wraps content in `<html>`, `<head>`, and `<body>`. A document handler is required; this package supplies the standard handler together with the root template. A consumer may register its own handler instead.

## Type

[block](../../how/ext/block.md) and [document](../../how/ext/document.md) — adds a level containing `root` and the standard document handler.

## What it does

The `root` block uses the [`wrap`](../../how/templates.md) mode to wrap the page in an HTML document:

```ts
block<{ lang?: string }>('root').wrap((n) => ({
    tag: 'html',
    attrs: { lang: n.props?.lang ?? 'en' },
    content: [
        { tag: 'head', content: [/* meta, title, link */] },
        { tag: 'body', content: n.content ?? null },
    ],
}));
```


## The root and page contract

This extension provides `root`, the outer wrapper. Site authors can structure its content with their own `page*` blocks:

- `root` — the outer level, provided by this extension.
- `page`, `page-index`, `page-about`, and the like — the user layer. The `page*` names stay with the site; nuckty does not claim them.

## Page data in props

Through `n.props`, the block receives the data the engine has collected:

- `page` — `{ url, title, ... }` and other metadata from the [sitemap](../../how/sitemap.md).
- `lang` — the language of the current [target](../../how/targets.md).
- `alternates` — `Map<lang, {url, title, host}>` for [hreflang](../../how/targets.md).

The block turns this data into title, metadata, hreflang and stylesheet links in `<head>`. It loads the JavaScript bundles with `defer` after the body content.

## Installation

Add the package to `ext` in the global `config/config-nuckty.ts`. It registers the document handler; remove another handler registration before using it.

Install the extension from npm in the extracted [starter project](../../how/start.md):

```
npm install --save-exact @nuckty/ext-block-root@1.0.0-rc.0
```

Register the extension in `config-nuckty.ts`:

```ts
import { defineNucktyConfig } from '@nuckty/core';

export default defineNucktyConfig({
    targets: { main: { configDir: 'config/', outDir: 'site/' } },
    ext: ['@nuckty/ext-block-root'],
});
```

And add `root` to the page bundle's bemdecl (for example, `blocks/page/page.bemdecl.js`) — the engine loads the template from that entry.

## Overriding

Place your own `blocks/root/root.nu.ts` on a later [level](../../how/blocks/levels.md). The engine picks the file from the latest level. This lets you set a different `<head>` structure, your own meta tags, or analytics counters without forking the extension.

Package registration calls `env.document.register`: the handler creates root with `DocumentData` in props. Core does not choose root from the sitemap. `assets` contains bundle URLs; `target.data` contains consumer settings.

The default root emits each non-empty URL in `assets.css` and `assets.js` once, preserving insertion order; scripts use `defer` after page content. It does not guess bundle names from the route. Use a custom document handler or root override for page-specific selection.
