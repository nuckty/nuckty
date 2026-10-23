# Validate loading policy within each gallery

## Why

The gallery producer intentionally leaves the first image eager in every gallery. The consumer artifact checker instead treats all page images as one list and rejects a valid page with two galleries. A synthetic actual helper call returned an error for two independently valid galleries.

## What Changes

Track gallery container scope while inspecting complete div/img markup tokens. Validate eager-first/lazy-rest separately per container, retaining standalone fragment checks. Preserve unrelated images and literal markup regions. Add positive/negative multi-gallery tests against the real checker.

## Impact

Affected capability: release-audit. Consumer test helper and tests only; no real content or output access, no runtime gallery behavior change.

