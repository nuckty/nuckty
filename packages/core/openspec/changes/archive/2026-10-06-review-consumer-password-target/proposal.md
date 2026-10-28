# Read consumer password from captured target content

## Why

The password-title hook uses global levels instead of captured target content, prepending data from the wrong source.

## What Changes

Use typed stage context and getBuildConfig contentDir; verify target isolation and snapshot ownership with synthetic inputs. Preserve optional absence/invalid password fallback.

## Impact

Affected capability: pipeline consumer hook. No private content read.
