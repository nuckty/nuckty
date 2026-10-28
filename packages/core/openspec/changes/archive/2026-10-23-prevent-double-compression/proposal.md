# Prevent double compression

## Why
Inherited nginx gzip can compress precompressed artifacts again, producing conflicting Content-Encoding headers and unreadable pages.

## What Changes
Disable dynamic gzip in the generated server and exercise real HTTP negotiation with gzip enabled in the parent context.

## Impact
Generated nginx configuration and native hosting regression tests.
