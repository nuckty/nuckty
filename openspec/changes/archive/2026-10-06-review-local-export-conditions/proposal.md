# Resolve local extension conditions in declaration order

## Why

Local directory extensions ignore nested node/import conditions and impose import/default/require priority, selecting a different entry than the same installed package.

## What Changes

Resolve local conditional exports recursively in declaration order using Node ESM conditions. Preserve file paths and main-only directory packages. Test actual registration from selected modules.

## Impact

Affected capability: extensions. No dependency or public option added.

