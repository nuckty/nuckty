# Check scanned image kinds by path

## Why

The helper scan test sorts only basenames but checks kinds using the original array positions, assuming filesystem enumeration order.

## What Changes

Assert path-to-kind associations without imposing an enumeration order on the scanner. Runtime remains unchanged.

## Impact

Affected capability: ext-command-convert-images test evidence.

