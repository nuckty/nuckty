# Why this way

This section covers nuckty's architectural decisions. Each page is a record of a choice: which alternatives were considered, why one of them won, and what had to be sacrificed.

The selection principle is simple: a record is needed when the decision is nontrivial and its rationale will be useful later. If the choice is obvious, it does not belong here.

Every record follows the same template: **Decision → Context → Alternatives → Argument → Consequences**.

## Records

- [The Markdown engine](markdown.md) — remark/unified instead of markdown-it
- [BEMJSON as the data model](bemjson.md) — a typed tree instead of string templates
- [Two-pass rendering](render.md) — separating tree construction from serialization
- [Sitemap instead of routes](sitemap.md) — an explicit URL tree instead of file-based routing
- [Compression without zstd](compression.md) — Brotli Q11 and Gzip 9, no third codec
- [Hosting and format negotiation](hosting.md) — format selection at a single URL
- [The repository family](repos.md) — independent `nuckty-*` repositories and a single `nuckty-codestyle` rulebook

## The common criterion

The criteria running through every decision: long-term support of a TypeScript project, ease of maintenance, and speed. The amount of code already written and the cost of migration are not counted. Sunk costs are not an argument for a worse decision going forward.

Each record connects the choice to concrete data structures, extension contracts, and maintenance tradeoffs. Comparisons of build speed or maintenance cost require separate evidence; the records do not establish a measured advantage by themselves.

