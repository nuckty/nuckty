# Complete HTML optional-tag minimization

## Why
Several optional tags and list end tags remain explicit despite HTML allowing omission. Exact output alone does not verify parsed structure.

## What Changes
Apply contextual start/end omission to all optional HTML tags, preserving emitted attributes, sibling boundaries, whitespace, comments and foreign namespaces. Use a development-only HTML5 parser to compare minimized output against the independent explicit serializer. Remove list-specific omission policies; retain the legacy tightList input field for compatibility. Update the bilingual canonical reference.

## Impact
HTML serialization and output fixtures, dev-only parse5 dependency, specs and documentation. No HTML parser is added to runtime.
