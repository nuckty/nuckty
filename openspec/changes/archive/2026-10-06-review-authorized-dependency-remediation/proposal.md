# Remediate authorized dependency audit findings

## Why

Fresh authorized audits confirm critical simple-git findings, outdated vnu and vulnerable lint/spec-tool chains. Previous local gates did not include real dependency advisories.

## What Changes

Update confirmed fixable dependencies to exact patched versions, refresh locks in isolation, and preserve documented command/native/lint/spec contracts. Investigate unpatched braces without ignoring advisory or blindly forcing old tooling. Repeat all13lock audits and appropriate current behavior gates.

## Impact

Affected manifests/locks and any explicitly documented maintained compatibility repair. No deployment, publication or VCS mutation.
