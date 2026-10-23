# Distinguish explicit target from omitted target

## Why

runBuild treats an explicitly supplied empty target as omitted, building and cleaning all targets instead of resolving the requested name.

## What Changes

Only undefined means all targets; explicit values use resolveTarget, including empty names. Verify unknown empty name fails before cleaning output sentinels.

## Impact

Affected capability: targets. No new option or dependency.

