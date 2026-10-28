# Retry unavailable public verification reads

## Why
The real beta2 root publication succeeded, but one HTTP 503 during public verification failed its workflow and prevented its automatic consumer callback until a verification-only rerun.

## What Changes
Treat HTTP 503 on post-publication metadata and archive reads as pending within the existing bounded verification loop. Keep pre-publication, authentication and integrity failures strict.

## Impact
The eleven release helper copies and focused release regressions; no package version or published tag changes.
