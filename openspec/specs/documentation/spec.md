# documentation Specification

## Purpose
Specify the documentation source contract that consumers rely on: page coverage in both languages and the published reading order.

## Requirements

### Requirement: Reading order manifest
The documentation SHALL provide `pages.json`, an array of page paths relative to the documentation root without the `.md` or `.ru.md` suffix, in reading order. Every Markdown page outside `scripts/` in either language, except `README`, `AGENTS` and `CLAUDE`, SHALL be listed exactly once, and every listed page SHALL exist in English and Russian. `scripts/check-pages.mjs` SHALL report each violation and exit nonzero, and CI SHALL run it.

#### Scenario: Page added without the manifest
- **WHEN** a new page `how/example.md` and `how/example.ru.md` are added but `pages.json` is unchanged
- **THEN** the check reports that `how/example.md` is not listed and fails

#### Scenario: Listed page missing a language
- **WHEN** `pages.json` lists a page whose Russian file does not exist
- **THEN** the check reports the missing file and fails
