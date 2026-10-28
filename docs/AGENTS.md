# Global
@../nuckty-codestyle/AGENTS.md

# Rules
- `why/*` entries follow: Decision → Context → Alternatives → Argument → Consequences
- Docs are canonical — verify facts against engine code and `~/site`, not the lagging `openspec/specs/core` or READMEs

# Section roles
- `how` — data model, templates, sitemap, pipeline, blocks
- `out` — HTML, assets, images, compression, hosting
- `ext` — ready extensions, one per package
- `why` — decision records (format above)
- One canonical explanation, never duplicated; link instead
- First mention links to concept home page: `bemjson`, `templates`, `sitemap`, `pipeline`, `deps`, `levels`, `targets`, `compression`, `hosting`, `images`, `html`
- "how" links to "why" when decision non-obvious; "why" links to "how" and "out" for detail

# Before delivery
- Cross-references point to existing URLs from `sitemap.yml`
- Same term named identically across all sections (one glossary site-wide)
- Terminology follows `../nuckty-codestyle/GLOSSARY.ru.md`, paired with `GLOSSARY.md` for English; canonical forms mandatory, rejected variants forbidden
- Russian prose follows the «Русская проза» section of `GLOSSARY.ru.md`
