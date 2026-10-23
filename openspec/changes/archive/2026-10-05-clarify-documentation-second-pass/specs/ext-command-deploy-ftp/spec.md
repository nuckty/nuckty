## MODIFIED Requirements

### Requirement: deploy-ftp command
The extension SHALL add the command `nuckty deploy-ftp [target] [--force] [--dry-run]` via `env.commands`. `target` selects one target from `config-nuckty.ts`; with no argument the FIRST declared target is used (unlike build without a target, which builds all declared targets); an explicit unknown target name is a hard error before any connection is opened. `--force` re-uploads every local file AND bypasses the mass-deletion guard — deletions are planned from the actual server listing in every mode; `--dry-run` reports what would be uploaded or deleted without acting.

#### Scenario: Command runs a target deploy
- **WHEN** `nuckty deploy-ftp site-ru --dry-run` runs
- **THEN** it reports the planned uploads and deletions without changing the server
- **AND** without `--dry-run` it performs the sync

#### Scenario: Unknown target fails before connecting
- **WHEN** `nuckty deploy-ftp typo-target` runs
- **THEN** the command fails with the known target names listed
- **AND** no FTP connection is opened

#### Scenario: --force keeps the delete plan
- **WHEN** `nuckty deploy-ftp --force` runs against a server holding orphaned files
- **THEN** every local file is re-uploaded
- **AND** server files absent from the local artifact are still deleted

### Requirement: Manifest-driven diff and minimal operations
The command SHALL read the artifact's `manifest.json`, fetch the server's `manifest.json`, list the server recursively (`LIST` → path→size map), and compute new/changed/deleted files (comparing hashes only when sizes match). It SHALL upload only changed files, delete files absent from the new artifact (without touching the remote `manifest.json` during the sync), attempt to restore file mtimes via `MFMT` (unsupported MFMT is nonfatal), verify with a second `LIST`, retry failed uploads, and upload `manifest.json` last.

#### Scenario: Only changed files are uploaded
- **WHEN** `nuckty deploy-ftp` runs after a build that changed two pages
- **THEN** only those files (and their `brotli/`/`gzip/` copies) are uploaded
- **AND** files absent from the new manifest are deleted from the remote root
- **AND** `manifest.json` is uploaded only after all files transfer successfully

### Requirement: Mass-deletion guard
The deploy-ftp command SHALL stop and suggest `--force` when the share of files to delete exceeds a threshold (default 30%), to protect against an accidental wipe.

#### Scenario: Large deletion is blocked without --force
- **WHEN** a deploy would delete more than 30% of remote files
- **THEN** the command stops and points to `--force`
- **AND** `--force` proceeds with the deletion

