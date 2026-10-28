# Clarify documentation contracts against 1.0.0 code

## Why

The second editorial pass found stale promises and unusable examples in prose and canonical specs: file override versus declaration composition, props serialization, built-in GFM, document ownership, target input selection and preparation commands. Current code and isolated public-package scenarios establish the actual behavior.

## What Changes

Correct the existing specs and paired guides to describe implemented 1.0.0 behavior. Preserve requirement and scenario names, replacing contradictory claims with verified conditions. Clarify Purpose sections as well as requirements. Correct inaccurate public source comments only; no runtime behavior changes.

## Impact

Affected capabilities: assets, targets, bemjson, compression, core, ext-block-gallery, ext-block-grid, ext-block-root, ext-command-content-external, ext-command-convert-images, ext-command-deploy-ftp, ext-command-serve, ext-command-validate-vnu, ext-markdown-typography-ru, ext-markdown-video, hosting, html-output, images, markdown, templates. Research and before/after artifacts live in plans/2026-10-05-documentation-second-pass at the workspace root. Local documentation authority comes from the user’s request to fix all findings. No publication, commit or deployment is included.
