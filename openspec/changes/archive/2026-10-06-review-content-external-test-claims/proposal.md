# Verify external repository separator rejection

## Why

A test claims separator rejection but never supplies a separator-containing derived name.

## What Changes

Add the real backslash-name rejection assertion and remove the false fixture explanation. Implementation remains unchanged.

## Impact

Content-external regression test only.

