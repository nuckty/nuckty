# Static code highlighting

## Why
Simple snippets need readable syntax colors without browser dependencies.

## What Changes
Use TanStack Highlight during build for fenced code and static source examples. Theme colors use application CSS; omit line wrappers and numbering. Preserve code text and copy controls.

## Impact
Build-only dependency, consumer extension, templates and CSS. Live playground remains plain text.

