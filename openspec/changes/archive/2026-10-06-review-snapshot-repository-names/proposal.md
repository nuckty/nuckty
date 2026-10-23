# Reject inherited snapshot repository names

## Why

REPOSITORIES prototype keys allow unsupported constructor names to reach Git runner.

## What Changes

Require own configured repository keys in all snapshot operations before filesystem or runner access. Add adversarial regressions.

## Impact

Consumer snapshot script and synthetic tests only.

