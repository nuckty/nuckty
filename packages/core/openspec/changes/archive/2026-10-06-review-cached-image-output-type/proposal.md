# Require usable cached image output files

## Why

Completed conversion cache accepts a directory as an existing WebP variant and returns success without encoding. Empty files also falsely satisfy output presence.

## What Changes

Count only nonempty regular files as cached outputs. Regenerate stale outputs and preserve directories/originals on failed replacement.

## Impact

Affected capability: ext-command-convert-images. No new dependency or option.
