# nuckty — ext-command-content-external spec (1.0.0)

## Purpose

Specify explicit Git repository preparation from the global `config/external.json` into `external/`. The build consumes prepared files and does not invoke clone/fetch itself. Offline behavior requires prepared inputs and extensions without network access; reproducibility requires fixed inputs, tools and metadata. The core may query Git for source commit timestamps and uses null when unavailable.

## Requirements

### Requirement: content-external command reads external.json
The extension SHALL add `nuckty content-external [--dry-run]` via `env.commands`. It SHALL read only the global `config/external.json`, an array whose entries are repository URL strings or objects `{ url, ref?, path? }`, rather than a target’s configDir. `ref` SHALL be a tag or commit name and `path` a relative subdirectory without `.` or `..` segments; unknown fields and malformed values SHALL fail before any repository work. It SHALL reject positional target names and unsupported flags. A missing file or empty array SHALL produce no repository work.

#### Scenario: Command resolves repos from external.json
- **WHEN** `external.json` lists two repo URLs and `nuckty content-external` runs
- **THEN** those two repositories are resolved as the set to aggregate
- **AND** an empty array results in no work

#### Scenario: Malformed object entry fails before work
- **WHEN** an entry has an unknown field, a ref starting with `-`, or a path with a `..` segment
- **THEN** the command reports the entry and exits nonzero without cloning or updating

### Requirement: Clone or update into external/
The command SHALL clone each repository into `external/<repo>/` (dir name = repo name without `.git`) on first run and update the working copy on later runs. The destination directory name SHALL be a plain directory segment — `.`/`..`, path separators, and duplicate destinations from same-basename URLs are hard errors before any runner executes. A clone goes to a temporary sibling first and is renamed on success, so an interrupted clone never leaves a partial directory at the final path. A repository with uncommitted local changes is REFUSED with the reason (never silently deleted and re-cloned); a failed LFS fetch on an LFS-using repository is a reported error, not a silent skip. An entry with `ref` SHALL be checked out detached at that ref, and later runs SHALL fetch and move the copy to the configured ref; an entry with `path` SHALL keep only that subdirectory in a sparse working copy without top-level files, and removing `path` SHALL restore the full tree. A detached copy whose entry has no `ref` SHALL be refused with an error instead of pulled. `--dry-run` SHALL report what would be cloned, updated, or refused, including the configured ref and path. The `external/` directory is a working copy, not part of the site repo's own git.

#### Scenario: First run clones, later runs update
- **WHEN** the command runs against an empty `external/`
- **THEN** each repository is cloned into `external/<repo>/`
- **AND** a later run updates the working copies
- **AND** `--dry-run` reports the plan without changing disk

#### Scenario: Local changes are never destroyed
- **WHEN** a planned repository exists with uncommitted changes
- **THEN** the command refuses that repository with the stated reason
- **AND** the working copy is left untouched

#### Scenario: Duplicate destination is rejected
- **WHEN** the config lists two URLs whose repo names are equal
- **THEN** the command fails before cloning anything

#### Scenario: Pinned partial source
- **WHEN** an entry sets `ref` to a tag and `path` to `docs`
- **THEN** `external/<repo>/` contains only `docs/` at that tag
- **AND** a later run with a new commit as `ref` moves the copy to that commit

### Requirement: Build stays offline and deterministic
The core build SHALL NOT clone or fetch repositories automatically. The command SHALL prepare files explicitly, analogous to convert-images. Build stages SHALL read the selected target’s levels and external.json; preparation SHALL read the global list. Consumers SHALL keep these lists consistent. The command requires Git, and the core MAY use Git for commit metadata without managing repositories.

#### Scenario: Build does not touch the network
- **WHEN** `nuckty build` runs after `external/` is populated
- **THEN** the core reads prepared content from its selected levels without invoking clone/fetch; loaded extensions retain their own behavior
- **AND** Git is required for preparation; unavailable core commit metadata becomes null
