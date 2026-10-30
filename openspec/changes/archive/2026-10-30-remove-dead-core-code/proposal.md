# Remove dead core code

## Why

The core still carries modules and exports that no build path uses: directory accessors, configuration getters, naming presets and parsers, store helpers, a placeholder stage, a no-op `tightList` field and a fixed GMT+03 timestamp formatter. Tests kept them alive without protecting any behavior.

## What Changes

- Remove the unused modules, exports and fields together with the tests that only exercised them.
- Load `site.json` from the target configuration directory without project-root discovery.
- **BREAKING** `page.lastUpdated` becomes Unix seconds; templates format it.
