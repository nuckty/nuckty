# Preserve block ownership lint across imports

## Why

Consumer ESLint block-owner forgets the block identifier when a subsequent nuckty import does not import block. A normal type-only import disables ownership and top-level checks.

## What Changes

Keep the imported block binding across unrelated imports and verify actual ESLint diagnostics with synthetic source.

## Impact

Affected capability: blocks. Consumer lint tooling only; no document runtime change.

