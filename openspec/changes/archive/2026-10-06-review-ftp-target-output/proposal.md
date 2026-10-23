# Reject malformed FTP target output

## Why

A non-string target outDir silently substitutes site/ and invokes FTP, potentially selecting another artifact.

## What Changes

Require an explicit nonempty output path in the selected target before FTP import/invocation; preserve valid/default target selection. Add no-call malformed-config regression.

## Impact

Affected capability: ext-command-deploy-ftp. No network or credentials needed.

