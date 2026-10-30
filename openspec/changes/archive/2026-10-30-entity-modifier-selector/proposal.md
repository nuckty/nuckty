# One modifier selector for the selected entity

## Why

`block('menu').elem('item').mod('active')` registered without error and never matched, and `block('menu').elemMod('active')` without an element also never matched. Template authors could not express element variants with the obvious form.

## What Changes

- **BREAKING** `.mod()` selects a block modifier on a block selector and an element modifier after `.elem()`; `.elemMod()` is removed.
- `.elem()` after `.mod()` is rejected at declaration time.
