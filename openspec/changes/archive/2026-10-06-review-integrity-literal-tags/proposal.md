# Ignore literal fake tags in integrity checks

## Why

Comment/script text creates fake IDs that hide broken links.

## What Changes

Tokenize actual opening tags with quoted values and skip comments/raw-text bodies while retaining their real element attributes. Add behavioral false-success regressions.

## Impact

Consumer artifact checker and synthetic tests only.

