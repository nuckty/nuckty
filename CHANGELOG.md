# Changelog

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
