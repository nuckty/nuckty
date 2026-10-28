# Replace selector and output-mode values without retaining stale state

## Why

The public API reproduces two stale-value errors. Refining a valued modifier with a new unvalued modifier keeps the previous value and fails to match a boolean modifier. Output callbacks returning undefined retain the source content, mix and JavaScript params instead of clearing them. Both conflict with replacement semantics and leave existing behavioral tests green because those inputs are absent.

## What Changes

Clear the previous modVal/elemModVal when refining that selector kind without a value, preserving the immutable original selector. Make a selected output callback’s undefined result remove the resolved field instead of retaining its own value. Keep the distinct behavior of an omitted mode, which adds no setter. Add red/green public-render regressions and verify existing mode composition and sibling isolation.

## Impact

Affected capability: templates. No new API or dependency. Research and reproductions are in plans/2026-10-05-code-review. Local fixes are authorized; publication and deployment remain outside this task.
