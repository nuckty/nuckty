## ADDED Requirements

### Requirement: Coverage output ownership
Coverage filtering SHALL validate resolved input/output ownership before recursive output cleanup. It SHALL reject output paths containing the input or project root, paths overlapping protected project directories, and existing outputs containing non-report files or symlinks. Valid dedicated report directories SHALL remain reusable, with stale owned reports removed before new reports are written. A rejected request SHALL preserve all existing inputs and source files.

#### Scenario: Output aliases project or input data
- **WHEN** output is the project root, an ancestor of the input, or a symlink alias to an input/protected path
- **THEN** filtering fails before cleanup and preserves source and input bytes

#### Scenario: Output contains unrelated content
- **WHEN** an existing output directory contains non-coverage files
- **THEN** filtering refuses to remove them

#### Scenario: Dedicated output is reused
- **WHEN** an existing output contains only regular coverage reports
- **THEN** filtering replaces stale reports and retains the selected source-range data

