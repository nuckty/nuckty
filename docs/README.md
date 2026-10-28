# nuckty documentation

Source content for the documentation of the [nuckty](https://github.com/nuckty/nuckty) static site generator. This directory contains the Markdown pages; it does not include the consumer configuration or build scripts for a documentation site.

## Layout

| Directory | About |
|-----------|-------|
| `how`     | How to use it: data model, templates, sitemap, build pipeline, blocks, extensions |
| `out`     | Build output: HTML, assets, images, compression, hosting config |
| `ext`     | The nuckty ecosystem extension catalog |
| `why`     | Architectural decisions: why things are done this way, not another |

## Monorepository

The documentation lives in the nuckty monorepository alongside the core, extensions and demo. See the [repository decision](why/repos.md) and [extension catalog](ext/index.md).

## Check source links

Run `node scripts/check-source-links.mjs` to check that local Markdown links resolve to source files. The check skips fenced and inline code.

## License

[MIT](LICENSE)
