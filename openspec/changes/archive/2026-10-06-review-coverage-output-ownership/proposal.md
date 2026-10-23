# Validate coverage-output ownership before cleanup

## Why

filter-coverage checks only identical input/output strings. In a synthetic copy, using the project root as output deleted both input reports and a source sentinel before failing. Existing unrelated output contents and symlink aliases also need preflight ownership checks before recursive cleanup.

## What Changes

Resolve existing path ancestors, reject outputs overlapping coverage inputs or protected project paths, and refuse output directories containing anything other than regular coverage reports. Preserve arbitrary dedicated coverage directories and ordinary repeat processing. Test the real CLI through temporary copies; no real source cleanup.

## Impact

Affected capability: release-audit. Config coverage script and regression tests only. No new dependency or package/runtime behavior.
