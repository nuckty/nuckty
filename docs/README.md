# nuckty-docs

Source content for the documentation of the [nuckty](https://github.com/nuckty/nuckty) static site generator. This repository contains the Markdown pages; it does not include the consumer configuration or build scripts for a documentation site.

## Layout

| Directory | About |
|-----------|-------|
| `how`     | How to use it: data model, templates, sitemap, build pipeline, blocks, extensions |
| `out`     | Build output: HTML, assets, images, compression, hosting config |
| `ext`     | The nuckty ecosystem extension catalog |
| `why`     | Architectural decisions: why things are done this way, not another |

## Ecosystem repositories

nuckty is a family of independent repositories, not a monorepo. Shared rules come from `nuckty-codestyle`. Details in [the repos decision](why/repos.md).

| Repository | Role |
|---|---|
| `nuckty` | The core — only `nuckty build [target]`. Depends on no `nuckty-*`. |
| `nuckty-codestyle` | The shared `AGENTS.md` rulebook for every repository. |
| `nuckty-demo` | Quick-start demo. |
| `nuckty-docs` | Markdown source only; the site build configuration is not included. |

The extensions themselves (`@nuckty/ext-*`) are listed in the [extension catalog](ext/index.md).

## Check source links

Run `node scripts/check-source-links.mjs` to check that local Markdown links resolve to source files. The check skips fenced and inline code.

## License

[MIT](LICENSE)
