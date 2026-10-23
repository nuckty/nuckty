# Repair architecture delivery regressions

## Why

The A–F delivery review reproduced data-loss paths, incorrect renderer composition, incomplete target isolation, command error handling, and false-green verification. Passing existing tests does not cover these failures.

## What Changes

- Preserve build inputs and existing image outputs on failures and dry runs.
- Repair attribute/tree semantics and preserve literal Markdown content.
- Resolve build configuration per target, support consumer ESM extensions, and finalize consumer hosting changes before the manifest.
- Make FTP planning, filesystem identity, and command outcomes reflect actual successful operations.
- Restore meaningful type checking, consumer regressions, package smoke checks, and accurate documentation.

## Impact

Core, command and block extensions, site-nuckty, demo, tests and documentation. No publication, repository history changes, new framework, or unrelated refactoring.

## Execution

The user authorized implementation on 2026-09-22. This change is applied for implementation; tasks remain open until their regression and integration checks pass. Detailed evidence and acceptance criteria: `plans/2026-09-22/2026-09-22-af-verification-follow-up-plan.md`.
