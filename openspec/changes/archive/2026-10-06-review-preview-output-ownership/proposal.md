# Guard preview output destinations

## Why

serve follows linked nginx-serve.conf and can overwrite outside bytes.

## What Changes

Guard build/config/PID/log destinations before access or launch; preserve symbolic consumer roots.

## Impact

Serve command and synthetic regressions.
