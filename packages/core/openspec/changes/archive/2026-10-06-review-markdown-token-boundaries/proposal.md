# Respect Markdown and raw HTML token boundaries

## Why

Raw asset links match configured prefixes inside unrelated external URLs instead of at their start. Heading metadata is recognized inside inline code or formatted nodes, leaving visible text and heading metadata inconsistent and causing false duplicate IDs. The raw image pass misses unquoted src values and rewrites image-shaped strings inside scripts, comments, attributes and textarea content.

## What Changes

Match raw asset href prefixes literally from the start and preserve the whole remaining URL. Recognize custom heading IDs only in a terminal plain-text suffix. Target actual img attributes after matching complete markup tokens and literal regions; support quoted and unquoted src values while preserving unrelated bytes. Add behavioral tests for the reproduced failures and positive controls. No new dependencies or sanitization feature.

## Impact

Affected capability: markdown. Source files: remark.ts and html-postprocess.ts, with focused tests. Preserve trusted raw HTML, existing image mapping and URI suffix semantics. Evidence: plans/2026-10-05-code-review/pass-01/markdown-boundary-reproduction.json.
