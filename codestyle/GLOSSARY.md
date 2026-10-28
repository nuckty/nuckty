# English terminology glossary

Shared reference for the nuckty monorepository and its external consumers; paired with `GLOSSARY.ru.md` — edit both in sync. The canonical form is in the left column; the variants on the right are not used. Code keeps English identifiers; English prose uses these terms as-is.

## Architecture

| Term | Meaning | Do not use |
|---|---|---|
| core | The `@nuckty/core` package. Knows only `nuckty build` and the `register(env)` contract | — |
| engine | The `nu` render engine: applies templates and assembles pages | — |
| extension | A module with the `register(env)` entry point, supplied by an npm package or a local file; official packages use `@nuckty/ext-*`. Umbrella term for user-facing additions. Five types: pipeline, markdown, block, command, document | plugin¹ |
| remark plugin | Internal mechanism: an MDAST transformation that a markdown extension registers via `env.markdown.use(...)`. Technical remark-ecosystem term, not user-facing | — |
| `ext` | Field in `config-nuckty.ts` listing extensions | `plugins` |

## Extension types

| Term | Entry point | Adds |
|---|---|---|
| pipeline extension | `env.pipeline` | Build stages or hooks |
| markdown extension | `env.markdown` | Markdown constructs |
| block extension | `env.levels` | A set of BEM blocks as a level |
| command extension | `env.commands` | A CLI command |
| document extension | `env.document` | A BEMJSON document built from engine-prepared data |

## Data model and rendering

| Term | Meaning | Do not use |
|---|---|---|
| BEMJSON | Internal page representation: BEM nodes, text, nested arrays, and empty positions | — |
| `BemNode` | TypeScript type of one BEMJSON tree node | — |
| `BEMTree` | TypeScript type of the whole BEMJSON tree: `BemNode`, text, nested arrays, or empty `null`/`undefined`/`false` positions | — |
| `Templates` | Per-build collection of template declarations used by `block()` and the renderer | `Registry` |
| nu.ts templates | Template declarations written in TypeScript in `.nu.ts` files and applied by the `nu` engine | nu templates |
| block | Reusable interface unit, described by a `.nu.ts` file | — |
| wrapper | What content is wrapped in: document wrapper (`<html>`), page wrapper | — |
| build (a page) | The engine's action on a page as a whole: applies templates and emits HTML. Command: `nuckty build` | render² |
| `renderToBemJson` | First pass: tree → resolved BEMJSON | — |
| `renderToHtml` | Second pass: resolved tree → minimal HTML | — |
| override | Own version of a block at a later level instead of another's | customization |
| level | Directory where the engine looks for block files. Level order sets priority | — |
| deps | Declaration of which blocks a page needs. Entry point: `*.bemdecl.js` | — |
| target | One site built from the repository: own language, domain, output directory. In code — `target` | — |

## Build output

| Term | Meaning | Do not use |
|---|---|---|
| artifact | The `outDir` directory — the publishable build result | — |
| assets | Static site resources: styles, scripts, images, and downloadable files | — |
| bundle | CSS or JS assembly from a bundle’s block declaration; page selection is the document handler’s responsibility | — |
| content-hash | Truncated MD5 of content → file name. Raster hashes include the original and available variants; changed content gets a new URL | — |
| manifest | `manifest.json` — registry of artifact files with sizes and hashes, excluding the manifest itself | — |
| `image-mapping.json` | Mapping of logical image names to hashed ones | — |
| minification | Emitting minimal HTML at serialization: `renderToHtml` omits optional end tags (for example, `</li>` in supported contexts), quotes around unambiguous attribute values, and boolean attribute values. No separate stage | compression |
| compression | Lossless encoding of selected nonempty artifact files: Brotli Q11 into `brotli/`, Gzip 9 into `gzip/`, 1:1 with the original. Stage `compression` | minification |

## Hosting and delivery

| Term | Meaning | Do not use |
|---|---|---|
| server | Target machine serving the site (nginx/Apache) | host³ |
| hosting | Hosting class (shared, VPS, dedicated) | — |
| shared hosting | Hosting where multiple customer accounts share server resources | — |
| configuration generator | What builds `nginx.conf` and `.htaccess` from data | builder |
| publish | Upload the artifact to the server. Command: `nuckty deploy-ftp` | deploy |

## Pipeline

| Term | Meaning | Do not use |
|---|---|---|
| phase | One of the ordered pipeline phases: `clean → prepare → render → resolve → emit` | — |
| stage | Named step inside a phase (`sitemap`, `html`, `compression`, ...) | — |
| `before`/`after` hook | Code around a stage | — |

## Documentation

| Term | Meaning | Do not use |
|---|---|---|
| markdown construct | Markdown syntax expanding into a block (`:::gallery`, `:::callout`). Tied to a markdown extension | content construct |
| editor | In user hints, the tool the user edits in (any editor or IDE) | development environment |

---

## Footnotes

¹ "plugin" is correct only for remark plugins, third-party ones (`eleventy-navigation`), and external library fields. The umbrella term for `@nuckty/ext-*` is extension.

² "render"/"rendering" is allowed for the serialization passes only. For the engine's work on a page as a whole, say build.

³ "host" as a config field with a domain value (`host: 'example.ru'`) is correct. As the serving machine — no, use server.
