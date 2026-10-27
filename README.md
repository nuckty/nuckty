# nuckty

> **All static site generators suck. This one just sucks less.**
>
> *(after mutt: «All mail clients suck. This one just sucks less.»)*

nuckty is a static site generator for documentation and content projects. It combines a BEMJSON → HTML template engine, a programmatic build pipeline, and targets for several sites in one repository. The output includes pre-compressed files and generated nginx and Apache configurations. It can be published over FTP to compatible shared hosting.

The core provides `nuckty build [target]`. Serving, validation, deployment, and block libraries are extensions. The core ships no blocks or pages; each site registers a document handler, supplied by the standard root extension or by the site itself.

**Documentation sources:** [English getting-started guide](https://github.com/nuckty/nuckty-docs/blob/main/how/start.md) · [Russian getting-started guide](https://github.com/nuckty/nuckty-docs/blob/main/how/start.ru.md). Documentation sites: [nuckty.com](https://nuckty.com) (English) · [nuckty.ru](https://nuckty.ru) (Russian).

## Ecosystem

| Repository | Role |
|---|---|
| [`nuckty`](https://github.com/nuckty/nuckty) | **Core** — the `nuckty build` engine. This repo. |
| [`nuckty-codestyle`](https://github.com/nuckty/nuckty-codestyle) | Shared code and documentation rules for all `nuckty-*` repos. |
| [`@nuckty/ext-block-root`](https://github.com/nuckty/nuckty-ext-block-root) | Extension: HTML page shell (`root`). |
| [`@nuckty/ext-block-gallery`](https://github.com/nuckty/nuckty-ext-block-gallery) | Extension: image gallery + lightbox. |
| [`@nuckty/ext-command-deploy-ftp`](https://github.com/nuckty/nuckty-ext-command-deploy-ftp) | Extension: FTP deploy via manifest sync. |
| [`@nuckty/ext-command-serve`](https://github.com/nuckty/nuckty-ext-command-serve) | Extension: local `nuckty serve` and `nuckty stop` (nginx). |
| [`@nuckty/ext-command-validate-vnu`](https://github.com/nuckty/nuckty-ext-command-validate-vnu) | Extension: W3C Nu Html Checker (optional, JVM). |
| [`@nuckty/ext-block-grid`](https://github.com/nuckty/nuckty-ext-block-grid) | Responsive grid of text cells. |
| [`@nuckty/ext-markdown-video`](https://github.com/nuckty/nuckty-ext-markdown-video) | Video embedding in Markdown. |
| [`@nuckty/ext-markdown-typography-ru`](https://github.com/nuckty/nuckty-ext-markdown-typography-ru) | Russian typography. |
| [`@nuckty/ext-command-content-external`](https://github.com/nuckty/nuckty-ext-command-content-external) | Prepare external content repositories. |
| [`@nuckty/ext-command-convert-images`](https://github.com/nuckty/nuckty-ext-command-convert-images) | Prepare AVIF/WebP image variants. |
| [`nuckty-demo`](https://github.com/nuckty/nuckty-demo) | Quick-start demo consumer. |
| [`nuckty-docs`](https://github.com/nuckty/nuckty-docs) | Source content for the documentation site. |

Official extensions follow the naming convention `@nuckty/ext-<type>-<name>`, where the type is one of `pipeline`, `markdown`, `block`, `command`, `document`. The package name reads straight from its docs URL: `/ext/block/root` → `@nuckty/ext-block-root`.

Third-party extensions may use any npm name, including their author’s scope; list the complete package name in `ext`. The official organization owns `@nuckty/core` and `@nuckty/ext-*`; repository names and the `nuckty` executable remain unchanged.

## Requirements

- **Node.js 24+**
- **npm** or a compatible package manager

The CLI loads TypeScript configuration files itself. A separate TypeScript installation is needed for developing and type-checking packages, not for building a consumer site. Extensions and template modules use ESM.

## Trust boundaries

Build configuration, extensions, block templates and Markdown authors are trusted. Extensions run with the build process's permissions. Raw Markdown HTML and BEMJSON `raw` are preserved, and Markdown URL schemes are not filtered. Sanitize untrusted content before building; text/attribute escaping alone does not make arbitrary input safe.

Content hashes use truncated MD5 for filenames and change detection, not authentication. Deploy an immutable artifact. Apache hosting requires the modules and `.htaccess` overrides documented in the hosting guide; an nginx preview does not prove that a remote host is configured correctly.

The project's MIT license covers its own code. Installed dependencies keep their licenses, including Lightning CSS (MPL-2.0) and sharp's native libvips (LGPL-3.0-or-later). Preserve applicable upstream notices and distribution obligations when redistributing them.

## Public-site CI

A successful CI run after a push to this repository's `main` automatically starts the website and demo CI through the organization GitHub App. Each consumer builds from verified source commits and deploys its static artifact only after its checks pass. See the [CI rebuild setup](https://github.com/nuckty/nuckty-docs/blob/main/.github/README.md).

## License

MIT — see [LICENSE](LICENSE).

## Current candidate

`1.0.0-beta1` — We call its Beta, coz it's betta then nothin

See [CHANGELOG.md](CHANGELOG.md) for the source release notes.
