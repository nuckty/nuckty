# Consume published npm packages

## Why
The website and demo must verify and use the public scoped npm release rather than sibling package sources or local tarball fallbacks.

## What Changes
Pin consumer dependencies to exact registry versions, use the compiled browser renderer, and remove package-source checkouts from consumer CI. Keep canonical documentation as a separate content input. Deliver starters with exact registry dependencies and verify clean registry installation.

## Impact
Website and demo manifests, lockfiles, browser imports, CI, clean-install and starter verification, and installation guidance.
