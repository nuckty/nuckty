# nuckty-demo

An interactive showcase built with the public nuckty CLI. Five pages in each language demonstrate Markdown/GFM, exact sample sources, gallery/lightbox, grid, typography, a live BEMJSON editor and actual build files. The supplied new logo has light/dark variants; a separate square favicon uses its mark. `blocks/package.json` keeps `.bemdecl.js` in CommonJS; templates load through the page declaration.

The editor and actual gallery/grid samples are available directly on the landing page. Dedicated pages provide detailed instructions and exact sources.

## Local development

Requires Node.js 24+. File dependencies refer to sibling repositories: build core first, then root/gallery/grid, typography-ru and serve/validate/deploy-ftp, run `npm ci` here, then `npm run build`. Russian output is `site/`; English output is `site-en/`. The browser editor bundles pure engine source modules, so this development checkout requires those sibling sources. Its preview uses a sandboxed iframe.

With nginx installed, `npm run serve` starts the demo at `http://localhost:8092`; `npm run stop` stops it. Start the sibling website preview for `http://localhost:8091`. Use `npm run serve:en` for English at `http://localhost:8094` and `npm run stop:en` to stop it. Production domains are demo.nuckty.ru and demo.nuckty.com; use `npm run build:preview` for local language/site links. Contact: vitaly@harisov.name.

## Showcase verification

Run `npm run build`, `npm run lint`, `npm test` and `npm run validate`. Artifact checks cover links, anchors, assets, hashes, compression, gallery, typography and sandbox. Nu validation requires Java. The local `ext/showcase.ts` registers showcase/example/playground directives and snapshots the actual output as `build-files.txt` before manifest generation; the snapshot excludes itself and the final manifest.

## Reproducible package check

With development dependencies already installed, run `npm_config_cache=/path/to/populated-public-cache npm run test:package`. The script packs all 11 packages (core plus 10 extensions) from source copies, checks each tarball's `main` and `types` entries, type-checks every extension's public `register` declaration, and installs only the tarballs in a separate consumer whose path contains spaces and Unicode. Its temporary config loads all extensions and builds HTML plus gallery/grid assets; it then removes the source snapshots and rebuilds the installed consumer. No registry/network fallback is allowed; missing npm-cache dependencies cause an explicit failure.

The browser adapter is prebundled from the real engine before source snapshots are removed. The fixture is removed on success and preserved with its path on failure. This test does not validate a published registry release or live serve/FTP/JVM behavior; command packages are loaded as extensions during the build.

## Clean install check

Run `npm run test:clean-install` from this directory with the sibling package sources available and access to the public npm registry. The check copies the demo and its direct sibling packages to an isolated temporary workspace, runs `npm ci` and `npm run build` for each sibling, then runs `npm ci` and `npm run build` for the demo from its checked-in manifest and lockfile. The source checkout's `node_modules`, `site`, and `.build` are not used as the install destination. A failed check keeps the temporary snapshot and prints its path; a successful check removes it.

