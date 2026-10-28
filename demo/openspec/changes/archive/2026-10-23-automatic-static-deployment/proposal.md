# Automatic static deployment

## Why
Publish the four approved domains from CI without publishing npm packages or building on the VM.

## What Changes
Deploy only verified main artifacts over a restricted SSH key; validate manifests and atomically switch each language pair. Preserve the existing proxy configuration.

## Impact
GitHub CI, dedicated server users, static nginx hosts and TLS; no npm publication.
