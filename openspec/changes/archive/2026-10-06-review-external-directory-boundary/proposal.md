# Refuse external repository directory traversal

## Why

A configured external URL ending in .. resolves its repository directory to the consumer root. The assets stage then copies project PDFs into published output.

## What Changes

Validate derived repository directory names in captured build configuration before cleanup or resource scanning. Preserve ordinary configured URLs and absent-list discovery. Add synthetic preservation and mapping regressions.

## Impact

Affected capability: assets. No dependency or network access.
