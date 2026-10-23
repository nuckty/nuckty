# Omit optional paragraph end tags

## Why
The real card example retains a paragraph end tag that HTML permits omitting. The serializer follows a legacy byte-output policy rather than using the paragraph omission rules.

## What Changes
Apply the HTML Standard paragraph end-tag conditions using resolved sibling tags and the immediate parent. Retain closures for inline/text/opaque raw successors, excluded or unknown parents and foreign content. Preserve document-formatting newlines outside a trailing body paragraph. Update exact-output tests, canonical bilingual documentation and both generated consumers.

## Impact
Intentional HTML byte-output change; conforming paragraph structure and text remain unchanged. No public API, dependency or list policy changes.
