# Verify environment isolation through behavior

## Why

The environment wiring test only asserts that properties exist. It does not verify that independent builds retain independent extension registrations.

## What Changes

Replace the existence-only test with observable command, Markdown, level, document and pipeline isolation across two environments. Keep implementation and public API unchanged.

## Impact

Affected capability: extensions. Tests only; no dependency or runtime changes.
