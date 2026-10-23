# Reject unknown empty option keys

## Why

serve and validate test a found option name by truthiness; an empty unknown key bypasses validation and reaches target/filesystem handling.

## What Changes

Distinguish undefined from an empty key and assert refusal before cwd access or runtime startup. Core parser and supported options unchanged.

## Impact

Affected capabilities: ext-command-serve, ext-command-validate-vnu.

