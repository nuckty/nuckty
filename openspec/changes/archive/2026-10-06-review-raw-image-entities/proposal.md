# Decode raw image HTML attribute entities

## Why

Valid numeric and named entity spellings of raw img src miss image mapping because only amp is decoded.

## What Changes

Use the declared exact entities HTML attribute decoder, preserve unmatched original bytes and escape a rewritten URL once. Add behavioral cases for numeric/named, ambiguous ampersands, URI suffixes and literal regions.

## Impact

Affected capability: markdown. Add entities7.0.0 as an exact runtime dependency; review license and package exports.
