# Changelog

## 1.0.0-rc.4

- The generated nginx configuration no longer routes extensionless `_s…`, `_c…` and `_j…` files, and `.htaccess` no longer probes a `.ico` variant for `/_i…` image URLs: the build never produces them.
- `nuckty --help` describes `deploy-ftp` as publishing the built site over FTP/FTPS.

## 1.0.0-rc.3

- `nuckty build` checks its arguments like any declared command: an option or a second target fails with `nuckty: build: unknown option --name` or `nuckty: build: expected at most 1 argument`.
- CLI errors carry the `nuckty:` prefix once, including an unknown target, a missing nginx in `serve` and a target without `outDir` in `deploy-ftp`.
- `deploy-ftp` honours `progress: false` in `config/auth-ftp.json`.

## 1.0.0-rc.2

### Breaking changes

- The Markdown bridge emits `article` entities with their data in `props` and no tags, attributes or HTML strings. The core registers default templates for them, exported as `markdownTemplates`, before the site's templates, so a site can change any Markdown markup. The copy-code button is no longer part of the core output; inline HTML stays raw. The document handler receives the content tree and the page renders in one pass.
- Directive handlers return a `BEMTree` and receive the directive form as `type`, the page's Markdown options including `lang`, and `convert.inline` and `convert.blocks` as the third argument. `env.markdown.node(type, handler)` maps mdast node types to BEMJSON.
- `.mod()` in a template selector refines the selected entity: a block modifier on a block selector, an element modifier after `.elem()`. `.elemMod()` is removed, and `.elem()` after `.mod()` is rejected.
- Commands declare their arguments with `env.commands.add(name, description, handler, { flags, maxPositionals })` instead of `{ booleanFlags }`. The CLI rejects undeclared options, invalid switch values, string options without a value and extra positional arguments; `validateCommandArgs` checks a declaration in tests.
- Unused core exports are removed: `getRoot`, `getExternalContent`, `getFileTimestamp`, `formatLastUpdated`, `classify`, `stringifyEntity`, `parseClass`, `createBlockFor`, `classicPreset` and `NamingPreset`, with the `tightList` node field and the `contentRepo`/`assetRepos` settings. `page.lastUpdated` is the Unix time in seconds of the source's last commit.
- `resolveAlternates` takes the sibling pages by target name as its fourth argument; alternates link only to pages that exist in the sibling target and carry their title.
- `@[provider](id)` becomes a block-level `video` node rendered by the new `video` block of `@nuckty/ext-markdown-video`, with a frame title in the page language and responsive CSS. Add `video` to the bundle's bemdecl; providers need a display `label`, and `createVideoExtension(providers)` builds a custom list.
- `deploy-ftp` uses FTPS with certificate verification by default; `secure: false` or `FTP_SECURE=false` selects plain FTP with a warning. `--force` only re-uploads every file, and `--allow-mass-delete` lifts the guard against deleting more than 30% of remote files.
- `convert-images` requires the content directory argument.
- The gallery emits data only and fails the build on content other than images; its lightbox is labelled in the page language and opens on the dialog's `open` state. `data-group` is gone.

### Build and content

- BEM declarations expand `{ block, elem }` and `{ block, elems }` into element entities, so element CSS and JS are bundled.
- `BuildContext.store` is typed as `BuildStore`. `.build/hash-css.json` and `.build/hash-js.json` are no longer written, and a bundle without CSS publishes no empty stylesheet. An unreadable SVG referenced by CSS fails the build.
- Sitemap entries indented with tabs or an odd number of spaces, and two home-section entries that give one URL different files, fail the build; titles may contain brackets.
- Heading anchors keep letters and digits of every script, and a heading's own link no longer jumps to another heading with the same GitHub-style slug.
- Relative `.pdf`, `.zip` and `.ini` links point to the file copied to the artifact root, and the build fails when that file was not published. The assets stage accepts upper-case extensions.
- The assets and images stages skip hidden directories and `node_modules`, exported as `isToolingDirectory`; `external/` is always a protected input.
- An unknown leaf directive renders its label as a paragraph; leaf and text `grid` directives fall back to plain content, and grid cells keep links, emphasis, inline code and images.
- `@nuckty/ext-markdown-typography-ru` puts a non-breaking space before a dash that follows a link, emphasis or inline code.
- `generateFileHash` is exported; `externalRepoName` rejects URLs whose last segment is not a plain directory name.

### Hosting and commands

- Apache answers missing routes and artifact directories with the site's 404 page, returns 404 for `/manifest.json` and blocks encoded or dot-segment requests to compressed and `.html` files. nginx no longer marks pages or query URLs as immutable assets. Neither configuration routes the `_c…`, `_j…` and `_s…` files the build never produces.
- Each target's preview keeps its configuration, PID and logs in `.build/serve/<target>/`, so several targets can be served at once; `nuckty stop [target]` stops one or all of them.
- `deploy-ftp` removes the server manifest before the first change and validates ports.
- `validate` allows 60 seconds per page and terminates a validator that never became ready.

## 1.0.0-rc.1

- `config/external.json` entries may be objects `{ "url", "ref", "path" }`. `content-external` checks out the pinned tag or commit, accepts tags moved upstream, keeps only the configured subdirectory without top-level files, fetches only its blobs and LFS files, and refuses an unknown ref, a missing path or a detached copy without `ref` before changing the working copy. The core reads both entry forms and exports `parseExternalSources`, `externalRepoName` and `ExternalSource`.
- `@nuckty/core` exports `b()`, `attributes()` and `EntityOptions` for composing BEMJSON in code and selecting template attributes from props.
- Extensions declare `exports` with their entry and `package.json` only; deep imports of `dist/` modules are no longer resolved. Every extension declares the Node.js 24 engine, and every package lists its homepage, issue tracker and keywords.
- The generated nginx configuration includes the installed `mime.types`, including Homebrew on Intel Macs.
- The documentation publishes its reading order in `docs/pages.json`, and the guides describe `rootTitle`, `baseUrl`, `logPrefix` and `validate --port`.

## 1.0.0-rc.0

- All official packages are developed in the nuckty monorepository and released together through Changesets. Package contents and public APIs are unchanged.
- `@nuckty/core` exports the `Plugin` and `Root` types used by Markdown extensions and declares `@types/mdast` as a dependency, so published declarations resolve without development dependencies.
- The demo, documentation and shared rules live in the monorepository; the website remains a separate registry consumer.

## 1.0.0-beta3

- Explicit BEMJSON `tag` values take precedence over nu tag declarations, including callbacks. `tag: false` remains a tagless fragment; an absent or undefined tag uses the template declaration.
- Block selectors match block nodes only. Named and wildcard element selectors match elements independently, including structural modes such as `content` and `wrap`.
- Website and demo templates use direct block declarations without predicates compensating for these engine bugs.
- Official extensions declare compatibility with `@nuckty/core@1.0.0-beta3`.

## 1.0.0-beta2

- Package-specific GitHub Release workflows publish verified archives through npm OIDC trusted publishers, then update compatible exact registry dependencies in the website and demo.
- Official extension peer dependencies target `@nuckty/core@1.0.0-beta2`.
- This release uses the automated publishing path; completion is verified in the release workflow and consumer CI.

## 1.0.0-beta1

> We call its Beta, coz it's betta then nothin

First beta source candidate. This entry describes the prepared source set; it does not announce npm publication or a deployed website.

### Core

- TypeScript and ESM BEMJSON template engine with two-pass rendering, composable nu.ts templates and HTML serialization with optional-tag omission.
- Explicit sitemap, Markdown content, reusable block levels, dependency declarations and multiple build targets.
- Programmable build pipeline with CSS and JavaScript bundling, hashed assets, images, Brotli/Gzip output, manifests, and nginx/Apache hosting configuration.
- Shared extension contract: pipeline, Markdown, block levels, CLI commands and document generation. TypeScript configuration and templates load through the CLI.

### Extensions

- Separate root, gallery and grid block packages.
- Markdown video and Russian typography packages.
- Commands for preview/stop, HTML validation, external content, image conversion and FTP deployment.

### Documentation and consumers

- Paired English and Russian documentation, shared development rules and glossary.
- Product website with local Orama search, light/dark themes and build-time TanStack syntax highlighting.
- Interactive demo, standalone starter archives and a separately maintained SVG logo source.

### Verification and release boundaries

- Package tests, source-link checks and CI workflows accompany the source set. Compatible package sources are pinned by commit SHA for CI.
- Packages share version 1.0.0-beta1. Demo and website are private npm consumers; source publication, npm publication and deployment remain separate operations.
