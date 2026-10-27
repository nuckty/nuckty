# Isolate package build output

## Why
The first real beta2 release failed before publication because prepack build output contaminated the npm pack JSON stream.

## What Changes
Build explicitly, then pack without lifecycle scripts and parse only npm's archive metadata.

## Impact
All eleven package release workflows and their shared release helper copies.
