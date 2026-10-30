# nuckty

> **All static site generators suck. This one just sucks less.**
>
> *(after mutt: “All mail clients suck. This one just sucks less.”)*

nuckty is a static site generator for documentation and content projects. It combines a BEMJSON → HTML template engine, a programmatic build pipeline, and targets for several sites in one repository. The output includes pre-compressed files and generated nginx and Apache configurations. It can be published over FTP to compatible shared hosting.

The core provides `nuckty build [target]`. Serving, validation, publication, and block libraries are extensions. The core ships no blocks or pages; each site registers a document handler, supplied by the standard root extension or by the site itself.

**Documentation sources:** [English getting-started guide](https://github.com/nuckty/nuckty/blob/main/docs/how/start.md) · [Russian getting-started guide](https://github.com/nuckty/nuckty/blob/main/docs/how/start.ru.md). Documentation sites: [nuckty.com](https://nuckty.com) (English) · [nuckty.ru](https://nuckty.ru) (Russian).

## Ecosystem

| Package or directory | Role |
|---|---|
| [`@nuckty/core`](https://github.com/nuckty/nuckty/tree/main/packages/core) | **Core** — the `nuckty build` engine. This package. |
| [`codestyle`](https://github.com/nuckty/nuckty/tree/main/codestyle) | Shared code and documentation rules. |
| [`@nuckty/ext-block-root`](https://github.com/nuckty/nuckty/tree/main/packages/ext-block-root) | Extension: HTML page shell (`root`). |
| [`@nuckty/ext-block-gallery`](https://github.com/nuckty/nuckty/tree/main/packages/ext-block-gallery) | Extension: image gallery + lightbox. |
| [`@nuckty/ext-command-deploy-ftp`](https://github.com/nuckty/nuckty/tree/main/packages/ext-command-deploy-ftp) | Extension: FTP publication via manifest sync. |
| [`@nuckty/ext-command-serve`](https://github.com/nuckty/nuckty/tree/main/packages/ext-command-serve) | Extension: local `nuckty serve` and `nuckty stop` (nginx). |
| [`@nuckty/ext-command-validate-vnu`](https://github.com/nuckty/nuckty/tree/main/packages/ext-command-validate-vnu) | Extension: W3C Nu Html Checker (optional, JVM). |
| [`@nuckty/ext-block-grid`](https://github.com/nuckty/nuckty/tree/main/packages/ext-block-grid) | Responsive multi-column grid (`:::grid`). |
| [`@nuckty/ext-markdown-video`](https://github.com/nuckty/nuckty/tree/main/packages/ext-markdown-video) | Video embedding in Markdown. |
| [`@nuckty/ext-markdown-typography-ru`](https://github.com/nuckty/nuckty/tree/main/packages/ext-markdown-typography-ru) | Russian typography. |
| [`@nuckty/ext-command-content-external`](https://github.com/nuckty/nuckty/tree/main/packages/ext-command-content-external) | Prepare external content repositories. |
| [`@nuckty/ext-command-convert-images`](https://github.com/nuckty/nuckty/tree/main/packages/ext-command-convert-images) | Prepare AVIF/WebP image variants. |
| [`demo`](https://github.com/nuckty/nuckty/tree/main/demo) | Feature showcase built from all official packages. |
| [`docs`](https://github.com/nuckty/nuckty/tree/main/docs) | Source content for the documentation site. |

Official extensions follow the naming convention `@nuckty/ext-<type>-<name>`, where the type is one of `pipeline`, `markdown`, `block`, `command`, `document`. The package name reads straight from its docs URL: `/ext/block/root` → `@nuckty/ext-block-root`.

Third-party extensions may use any npm name, including their author’s scope; list the complete package name in `ext`. The official organization owns `@nuckty/core` and `@nuckty/ext-*`; the CLI command is `nuckty`.

## Requirements

- **Node.js 24+**
- **npm** or a compatible package manager

The CLI loads TypeScript configuration files itself. A separate TypeScript installation is needed for developing and type-checking packages, not for building a consumer site. Extensions and template modules use ESM.

Browser previews import `Templates`, `render` and `renderToHtml` from `@nuckty/core/browser`. This compiled entry contains the pure renderer; build commands and Node template-context APIs remain in `@nuckty/core`.

## Trust boundaries

Build configuration, extensions, block templates and Markdown authors are trusted. Extensions run with the build process's permissions. Raw Markdown HTML and BEMJSON `raw` are preserved, and Markdown URL schemes are not filtered. Sanitize untrusted content before building; text/attribute escaping alone does not make arbitrary input safe.

Content hashes use truncated MD5 for filenames and change detection, not authentication. Publish an immutable artifact. Apache hosting requires the modules and `.htaccess` overrides documented in the hosting guide; an nginx preview does not prove that a remote host is configured correctly.

The project's MIT license covers its own code. Installed dependencies keep their licenses, including Lightning CSS (MPL-2.0) and sharp's native libvips (LGPL-3.0-or-later). Preserve applicable upstream notices and distribution obligations when redistributing them.

## Releases

All official packages live in the [nuckty monorepository](https://github.com/nuckty/nuckty) and release together with one version. After publication the release workflow verifies the packages from the public registry, publishes the demo and updates the website. See the [changelog](https://github.com/nuckty/nuckty/blob/main/CHANGELOG.md) and the [release procedure](https://github.com/nuckty/nuckty/blob/main/RELEASE.md).

## License

MIT — see [LICENSE](LICENSE).
