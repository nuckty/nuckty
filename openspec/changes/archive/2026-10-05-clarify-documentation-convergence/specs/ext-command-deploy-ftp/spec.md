## REMOVED Requirements

### Requirement: FTP over passive TLS, credentials from config or env
**Reason**: Rename an inaccurate heading without changing implemented behavior.
**Migration**: Use the corresponding clarified requirement in this change.

## ADDED Requirements

### Requirement: Passive FTP and FTPS, credentials from config or env
Deployment SHALL support passive plain FTP and explicit FTPS through basic-ftp, with no SSH dependency in the core. Consumers SHALL exclude `config/auth-ftp.json` from version control. Credentials SHALL come from that file or `FTP_HOST`, `FTP_USER`, `FTP_PASSWORD` (legacy `FTP_PASS`), `FTP_PATH` and `FTP_PORT` environment values, with environment credentials preferred in CI. `FTP_SECURE=true` SHALL request TLS; a TLS connection SHALL use normal certificate and hostname verification and retries SHALL not downgrade it silently. Plain FTP remains an explicit supported mode.

#### Scenario: Environment selects passive FTPS
- **WHEN** the FTP credential variables and `FTP_SECURE=true` are set
- **THEN** the command uses passive FTPS with certificate verification
- **AND** basic-ftp is a dependency of the extension, not the core

#### Scenario: Plain FTP is selected explicitly
- **WHEN** the configuration selects plain FTP
- **THEN** the command does not describe the connection as TLS-protected

## MODIFIED Requirements

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

