# Report the package version

## Why
The beta2 release checks reproduce that CLI version flags still print a hardcoded beta1 version.

## What Changes
Read the installed package manifest for the CLI version response.

## Impact
CLI version output; existing child-process version regressions.
