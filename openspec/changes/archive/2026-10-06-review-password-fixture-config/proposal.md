# Complete synthetic password hook fixture

## Why

Successful synthetic password test warns about missing site.json unrelated to its optional password input.

## What Changes

Provide normal site config in the fixture and retain missing/malformed password assertions.

## Impact

Test setup only, no runtime change.

