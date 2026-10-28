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

## Reading order

`pages.json` lists every page once, without the language suffix, in reading order. Consumers build navigation from it; add a new page to the list and remove a deleted one. Run `node scripts/check-pages.mjs` to check that the list matches the pages and that each page exists in English and Russian.

## Check source links

Run `node scripts/check-source-links.mjs` to check that local Markdown links resolve to source files. The check skips fenced and inline code.

## License

[MIT](LICENSE)
