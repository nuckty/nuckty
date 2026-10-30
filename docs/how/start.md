# Getting started

Download the starter, build a first page and edit its text. Then add pages and blocks of your own. For details, see [How to use](index.md).

## Requirements

Building requires **Node.js 24+**, **npm**, and public npm access for dependencies. Install nginx to preview with `npm run serve`; the build itself does not need it.

## 1. Download the starter

<a href="/nuckty-starter.zip" download>Download nuckty-starter.zip</a>

Extract the archive and open `nuckty-starter` in a terminal:

```bash
cd nuckty-starter
npm install
```

`package.json` pins exact versions of `@nuckty/core`, the `root` document wrapper and the `serve` preview commands from public npm. Follow the [catalog](../ext/index.md) to install other extensions at compatible versions.

## 2. Build and preview the page

The build also generates `.build/nginx.conf`. Its generator rejects paths containing a dollar sign (`$`) or control characters; choose a project directory without them.

```bash
npm run build
npm run serve
```

After a local install, npm scripts can invoke `nuckty` directly. In a terminal, use `npx @nuckty/core …`.

Open `http://localhost:8080`. The build wrote `site/html/index.html`, and nginx serves it at `/`. To stop the preview, run `npm run stop` in another terminal from the same directory.

## 3. Edit the content

Open `content/index.md`, replace the heading and add a paragraph:

```md
# My first website

This page is built with nuckty: Markdown → BEMJSON → HTML.
```

Run `npm run build` and reload the page. The server keeps serving files from `site/`, so a content edit does not require restarting it.

## 4. Explore the configuration

`config/config-nuckty.ts` defines one [target](targets.md) — one website build:

```ts
import { defineNucktyConfig } from '@nuckty/core';

export default defineNucktyConfig({
    targets: {
        main: { configDir: 'config/', outDir: 'site/', lang: 'en', host: 'localhost' },
    },
    ext: ['@nuckty/ext-block-root', '@nuckty/ext-command-serve'],
});
```

`root` provides the [HTML document wrapper](../out/html.md); `serve` provides preview and stop commands. `site.json` selects the `page` bundle. Its declaration in `blocks/page/page.bemdecl.js` lists the blocks:

```js
module.exports = ['root'];
```

## 5. Add a page

Create `content/about.md` and include it in `config/sitemap.yml`:

```yaml
sitemap:
  - Home [/, index.md]
  - About [/about, about.md]
```

After a build, the page is available at `/about`. Link to it from the first page as `[About](about.md)`; the engine substitutes its URL from the [sitemap](sitemap.md).

## Build output

```text
site/
├── html/                  ← pages
├── css/                   ← content-hashed styles
├── svg/                   ← logo
├── brotli/                ← Brotli copies
├── gzip/                  ← Gzip copies
├── .htaccess              ← Apache configuration
└── manifest.json          ← sizes and hashes for publication
```

The artifact can be copied to a compatible server. Apache must provide the required modules and allow `.htaccess` overrides; see [hosting configuration](../out/hosting.md).

## What's next

- [Data model: BEMJSON](bemjson.md) — blocks, elements and modifiers.
- [nu.ts templates](templates.md) — define your block's markup.
- [Markdown](markdown.md) — links, anchors and constructs.
- [Extensions](ext/index.md) — add capabilities.
