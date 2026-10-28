# nuckty — ext-command-content-external spec (1.0.0)

## Purpose

Specify explicit Git repository preparation from the global `config/external.json` into `external/`. The build consumes prepared files and does not invoke clone/fetch itself. Offline behavior requires prepared inputs and extensions without network access; reproducibility requires fixed inputs, tools and metadata. The core may query Git for source commit timestamps and uses null when unavailable.

## Requirements

### Requirement: content-external command reads external.json
The extension SHALL add `nuckty content-external [--dry-run]` via `env.commands`. It SHALL read only the global `config/external.json`, an array of repository URL strings, rather than a target’s configDir. It SHALL reject positional target names and unsupported flags. A missing file or empty array SHALL produce no repository work.

#### Scenario: Command resolves repos from external.json
- **WHEN** `external.json` lists two repo URLs and `nuckty content-external` runs
- **THEN** those two repositories are resolved as the set to aggregate
- **AND** an empty array results in no work

### Requirement: Clone or update into external/
The command SHALL clone each repository into `external/<repo>/` (dir name = repo name without `.git`) on first run and update the working copy on later runs. The destination directory name SHALL be a plain directory segment — `.`/`..`, path separators, and duplicate destinations from same-basename URLs are hard errors before any runner executes. A clone goes to a temporary sibling first and is renamed on success, so an interrupted clone never leaves a partial directory at the final path. A repository with uncommitted local changes is REFUSED with the reason (never silently deleted and re-cloned); a failed LFS fetch on an LFS-using repository is a reported error, not a silent skip. `--dry-run` SHALL report what would be cloned, updated, or refused. The `external/` directory is a working copy, not part of the site repo's own git.

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

### Requirement: Build stays offline and deterministic
The core build SHALL NOT clone or fetch repositories automatically. The command SHALL prepare files explicitly, analogous to convert-images. Build stages SHALL read the selected target’s levels and external.json; preparation SHALL read the global list. Consumers SHALL keep these lists consistent. The command requires Git, and the core MAY use Git for commit metadata without managing repositories.

#### Scenario: Build does not touch the network
- **WHEN** `nuckty build` runs after `external/` is populated
- **THEN** the core reads prepared content from its selected levels without invoking clone/fetch; loaded extensions retain their own behavior
- **AND** Git is required for preparation; unavailable core commit metadata becomes null
