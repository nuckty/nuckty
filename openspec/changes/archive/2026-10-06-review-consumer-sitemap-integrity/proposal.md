# Keep consumer XML sitemaps valid and target-specific

## Why

The consumer XML hook emits unescaped route text and ignores the target configDir. A valid route containing ampersand produced XML rejected by an XML parser; two targets both emitted the global shadow origin. Its timestamp requests are also launched with unbounded Promise.all after the core has deliberately bounded the same class of work.

## What Changes

Expose the existing getBuildConfig helper and snapshot type through the core public API so extensions can reuse the captured target settings without duplicating reads or importing private package paths. Use that snapshot for consumer XML origin and content root, escape XML text, and bound timestamp workers to eight while retaining entry order and per-hook source caching. Add synthetic behavioral regressions, including actual Git child lifetimes, per-target metadata and finalized artifacts.

## Impact

Affected capabilities: core, release-audit. Sources: core public exports and site-nuckty sitemap-xml hook. No new dependencies or configuration options. No real site output, private content, network, commit/push or deploy. Research: plans/2026-10-05-code-review/pass-01.

