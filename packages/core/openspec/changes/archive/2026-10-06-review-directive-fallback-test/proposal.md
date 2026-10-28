# Verify directive fallback labels

## Why

An old leaf-directive test claims a known label-loss gap but only checks an article wrapper. Runtime and newer preservation tests already preserve labels. The stale test does not prove its stated contract.

## What Changes

Assert unknown and declining leaf directive labels survive rendering and that no directive-specific block is emitted. Remove obsolete gap comments; runtime remains unchanged.

## Impact

Affected capability: markdown test evidence.
