# nuckty — ext-command-deploy-ftp spec (1.0.0)

## Purpose

Specify `@nuckty/ext-command-deploy-ftp`, the command extension that publishes a built artifact over FTP/FTPS using manifest-based synchronization. In normal mode it uploads changed files and deletes remote orphans; force re-uploads every local file while retaining orphan deletion. SSH, rsync and Git on the server are not required. The core does not depend on basic-ftp.

## Requirements

### Requirement: deploy-ftp command
The extension SHALL add the command `nuckty deploy-ftp [target] [--force] [--allow-mass-delete] [--dry-run]` via `env.commands`. `target` selects one target from `config-nuckty.ts`; with no argument the FIRST declared target is used (unlike build without a target, which builds all declared targets); an explicit unknown target name is a hard error before any connection is opened. `--force` re-uploads every local file without comparing hashes; `--allow-mass-delete` lifts the mass-deletion guard; neither implies the other, and deletions are planned from the actual server listing in every mode; `--dry-run` reports what would be uploaded or deleted without acting.

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
The command SHALL read and verify the local manifest and recursively list server files. Without force, it SHALL download and validate the server manifest when present; an absent server manifest SHALL cause all local files to be uploaded. Force SHALL skip the server-manifest download and upload all local files. Normal comparison SHALL use actual LIST sizes and compare manifest hashes only when sizes match. Orphan detection SHALL use the actual listing in every mode. Initial upload failures SHALL abort before deletions. The command SHALL attempt MFMT without failing on unsupported timestamp restoration, verify remote presence and sizes after transfer, retry missing or mismatched files, and upload manifest.json last only after successful operations and a repeated local artifact check.

#### Scenario: Only changed files are uploaded
- **WHEN** `nuckty deploy-ftp` runs after a build that changed two pages
- **THEN** only those files and their compressed copies are uploaded
- **AND** remote files absent from the local manifest are deleted
- **AND** manifest.json is uploaded last after verification succeeds

#### Scenario: Force ignores server-manifest hashes
- **WHEN** force runs against a server with an existing manifest
- **THEN** the command does not download that manifest
- **AND** it plans every local file for upload and still derives deletions from LIST

### Requirement: Mass-deletion guard
The deploy-ftp command SHALL stop and suggest `--allow-mass-delete` when the share of files to delete exceeds a threshold (default 30%), to protect against an accidental wipe.

#### Scenario: Large deletion is blocked without --force
- **WHEN** a deploy would delete more than 30% of remote files
- **THEN** the command stops and points to `--force`
- **AND** `--force` proceeds with the deletion

#### Scenario: Force does not lift the guard
- **WHEN** `nuckty deploy-ftp --force` would delete more than 30% of remote files
- **THEN** the command stops before any change and suggests `--allow-mass-delete`

### Requirement: Passive FTP and FTPS, credentials from config or env
Deployment SHALL support passive plain FTP and explicit FTPS through basic-ftp, with no SSH dependency in the core. Consumers SHALL exclude `config/auth-ftp.json` from version control. Credentials SHALL come from that file or `FTP_HOST`, `FTP_USER`, `FTP_PASSWORD` (legacy `FTP_PASS`), `FTP_PATH` and `FTP_PORT` environment values, with environment credentials preferred in CI. `FTP_SECURE=true` SHALL request TLS; a TLS connection SHALL use normal certificate and hostname verification and retries SHALL not downgrade it silently. Plain FTP remains an explicit supported mode.

#### Scenario: Environment selects passive FTPS
- **WHEN** the FTP credential variables and `FTP_SECURE=true` are set
- **THEN** the command uses passive FTPS with certificate verification
- **AND** basic-ftp is a dependency of the extension, not the core

#### Scenario: Plain FTP is selected explicitly
- **WHEN** the configuration selects plain FTP
- **THEN** the command does not describe the connection as TLS-protected

### Requirement: FTP target declares valid output
The FTP command SHALL reject missing, non-string and empty selected-target output paths before invoking deployment. It SHALL NOT substitute an implicit site directory. Valid custom paths and first-target default selection SHALL remain supported.

#### Scenario: Malformed target output
- **WHEN** a selected target has an absent, numeric, null or empty outDir
- **THEN** the command returns an error without invoking the FTP implementation

### Requirement: Manifest diff owns filename keys
The public FTP comparison helper SHALL use own dictionary keys for local manifest presence, server sizes and remote hashes. Prototype-like filenames SHALL behave like ordinary filenames; inherited entries SHALL NOT represent files.

#### Scenario: Prototype-like orphan and new file
- **WHEN** constructor or another inherited object name is absent from the own local/server records
- **THEN** orphan deletion and new-file classification remain correct

### Requirement: Interrupted deploy invalidates the server manifest
Before the first upload or deletion, a non-dry-run deploy SHALL remove an existing server manifest. A deploy interrupted before the new manifest is uploaded SHALL therefore leave no manifest, and the next deploy SHALL upload every local file instead of trusting stale hashes.

#### Scenario: Same-size file after an interrupted deploy
- **WHEN** a deploy fails after changing the server and a server file now has the local size but different bytes
- **THEN** no server manifest remains
- **AND** the next deploy uploads that file
