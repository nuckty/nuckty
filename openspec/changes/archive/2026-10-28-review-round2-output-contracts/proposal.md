# Preserve output contracts found in a new release review

## Why
A fresh source review reproduced malformed SVG data URLs, lost reference suffixes, prototype-based modifier matches, wildcard mismatches, overwritten target names and lost hidden enumerated values.

## What Changes
Preserve these declared values and constrain SVG inlining to owned hash URLs.

## Impact
Core CSS, matcher, targets and HTML serialization; no dependency/publication changes.
