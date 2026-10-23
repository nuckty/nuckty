# Observe CLI value forwarding

## Why

The value flag integration test ignores its flag in the synthetic command, so it cannot detect lost values.

## What Changes

Have the fixture observe the named flag and assert the output for both separated and equals forms. Runtime CLI remains unchanged. Correct a CSS test description that claims deduplication without checking it.

## Impact

Affected capability: core regression evidence.

