# Changelog

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
