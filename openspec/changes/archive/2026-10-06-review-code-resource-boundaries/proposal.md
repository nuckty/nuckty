# Keep build resources in the declared consumer and parse CSS URLs correctly

## Why

A nested consumer without its own package.json builds configuration, content and templates from cwd, but images, static assets, CSS and JS rediscover a parent package root. A reproduction selects parent-shadow resources in all four stages; a control with its own package.json passes. CSS URL rewriting also leaves valid parentheses and uppercase image extensions unmodified after Lightning CSS, producing references to files absent from the hashed artifact.

## What Changes

Bind resource stages to BuildContext.cwd without changing standalone directory-discovery helpers. Rewrite real CSS URL tokens, including quoted/escaped names and case-insensitive source extensions, preserving unrelated CSS strings, comments, URL suffixes and external/data URLs. Add behavior regressions and verify actual artifact contents. Preserve dynamic CLI import types rather than erase and reconstruct them through inline assertions. Correct only misleading context/extension lifecycle comments.

## Impact

Affected capabilities: core, assets. Public function signatures and configured input ownership remain unchanged. No dependencies, publication or deployment are added. Research, baseline and reproductions live in plans/2026-10-05-code-review at the enclosing workspace root. Fixes are authorized by the user’s code-review goal and earlier instruction to fix all findings.

