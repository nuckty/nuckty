# Require full lockfile vulnerability audit in release CI

## Why
The complete audit found dev-only brace-expansion and nested esbuild entries missed by runtime-only checks.

## What Changes
Require public-registry audit of production, development and optional lockfile entries in package and demo CI, failing on low or greater severity.

## Impact
Registry unavailability is a failed gate; no silent offline fallback. Scoped tsup override and a compatible brace-expansion lock update remove the current findings. Linux execution still requires committed pinned sources.
