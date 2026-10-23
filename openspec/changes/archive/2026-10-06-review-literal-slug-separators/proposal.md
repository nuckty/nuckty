# Treat slug separators as literal strings

## Why

The public Markdown slugify options accept string separators, but empty and multi-hyphen strings throw invalid RegExp errors. Regex quantifiers and replacement-string substitutions also interpret separator content rather than treating it literally.

## What Changes

Escape separators for their regex contexts, group whole tokens when trimming/collapsing, handle empty strings, and use literal replacement callbacks. Preserve existing case/slash behavior and hierarchical level joining. Add meaningful regressions through the Markdown API and compatibility helpers.

## Impact

Affected capability: markdown. No new dependency or option. Evidence: pass-01/slug-reproduction.json. Source changes follow validated/applied requirements.

