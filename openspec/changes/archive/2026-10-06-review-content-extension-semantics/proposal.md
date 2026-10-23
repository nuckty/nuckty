# Normalize supported content extensions without losing author intent

## Why

Typography leaves missing trailing spaces when the leading space is already NBSP or a tab, and leaves repeated spaces around an existing em dash. A bridge test still expects the older core bug that removed authored spacing before a link. Custom video provider names are compared against a lowercased link without normalizing the configured name. Gallery source comments claim viewport knowledge and client grouping not provided by the runtime.

## What Changes

Normalize horizontal whitespace around supported existing em-dash patterns in one pass, preserving newlines, leading dialogue dashes, code and raw literal content. Correct the bridge regression to preserve authored link spacing. Match custom provider names case-insensitively as the provider contract requires. Clarify only misleading gallery comments, keeping API and runtime grouping unchanged. Add behavioral red/green tests using Markdown and provider configuration.

## Impact

Affected capabilities: ext-markdown-typography-ru, ext-markdown-video, ext-block-gallery. No dependencies or publication. Research is in plans/2026-10-05-code-review; real content and player services remain untouched.
