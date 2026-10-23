# Preserve bundle keys and contain source reads

## Why

A __proto__ bundle silently loses dependencies, CSS and JS because loadBlocks assigns it through an ordinary object setter. A Markdown symlink can emit source bytes from outside the selected content root despite the existing lexical containment check. Both failures were reproduced using synthetic files and runBuild.

## What Changes

Use a prototype-free bundle dependency dictionary. Resolve source and content-root real paths before reading Markdown, preserving allowed symlinks within the selected root and explicitly configured symlink roots. Retain logical source paths for links and use the actual file for source timestamp metadata. Add build-level regressions for normal/special bundle keys and source boundary cases.

## Impact

Affected capability: core. No new dependency, input option or external action. Evidence: pass-01/input-boundary-reproduction.json. Private source files and real outputs were not accessed.

