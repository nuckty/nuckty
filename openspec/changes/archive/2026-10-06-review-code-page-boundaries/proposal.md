# Keep page input and output contracts consistent

## Why

Source review and synthetic reproductions show three gaps hidden by existing tests. The indentation parser silently drops empty list entries and page-like lines missing a dash. Entity stringification ignores elemMods despite accepting them in BemEntity. HTML emission pre-renders and maps only array-shaped content, so a valid single BEMTree raw node reaches the document handler with unresolved image paths.

## What Changes

Reject unsupported non-comment/non-header sitemap lines and empty entries before producing partial navigation. Honor element modifiers when stringifying an element, retaining one selected modifier and established block behavior. Pre-render every BEMTree content shape consistently before document construction; preserve empty-content behavior. Remove demonstrably unused/unreachable title bookkeeping without changing current title output. Add red/green behavior regressions.

## Impact

Affected capabilities: sitemap, bemjson, html-output. No new API, dependencies, network or publication. Research and source copies are in plans/2026-10-05-code-review.
