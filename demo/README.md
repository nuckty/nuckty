# nuckty-demo

An interactive showcase built with the public nuckty CLI. Five pages in each language demonstrate Markdown/GFM, exact sample sources, gallery/lightbox, grid, typography, a live BEMJSON editor and actual build files. The supplied new logo has light/dark variants; a separate square favicon uses its mark. `blocks/package.json` keeps `.bemdecl.js` in CommonJS; templates load through the page declaration.

The editor and actual gallery/grid samples are available directly on the landing page. Dedicated pages provide detailed instructions and exact sources.

## Local development

Requires Node.js 24+. Run `npm ci`, then `npm run build`; exact Nuckty releases come from public npm. Russian output is `site/`; English output is `site-en/`. The browser editor uses `@nuckty/core/browser` and a sandboxed iframe.

With nginx installed, `npm run serve` starts the demo at `http://localhost:8092`; `npm run stop` stops it. Start the sibling website preview for `http://localhost:8091`. Use `npm run serve:en` for English at `http://localhost:8094` and `npm run stop:en` to stop it. Production domains are demo.nuckty.ru and demo.nuckty.com; use `npm run build:preview` for local language/site links. Contact: vitaly@harisov.name.

## Showcase verification

Run `npm run build`, `npm run lint`, `npm test` and `npm run validate`. Artifact checks cover links, anchors, assets, hashes, compression, gallery, typography and sandbox. Nu validation requires Java. The local `ext/showcase.ts` registers showcase/example/playground directives and snapshots the actual output as `build-files.txt` before manifest generation; the snapshot excludes itself and the final manifest.

## Reproducible package check

Run `npm run test:package` with access to public npm. The script installs all eleven published `1.0.0-beta1` packages in an isolated consumer whose path contains spaces and Unicode, verifies registry URLs and integrity in its lockfile, checks public types and CLI, then builds HTML plus gallery/grid assets. It never packs sibling sources. Failed fixtures are preserved with their paths.

## Clean install check

Run `npm run test:clean-install`. It copies only this demo's source, installs its checked-in manifest and lockfile with `npm ci`, then builds both languages without access to sibling repositories. Failed fixtures are preserved; successful fixtures are removed.
