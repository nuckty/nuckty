## MODIFIED Requirements

### Requirement: FTP over passive TLS, credentials from config or env
Deployment SHALL support passive plain FTP and explicit FTPS through basic-ftp, with no SSH dependency in the core. Credentials SHALL come from ignored `config/auth-ftp.json` or `FTP_HOST`, `FTP_USER`, `FTP_PASSWORD` (legacy `FTP_PASS`), `FTP_PATH` and `FTP_PORT` environment values, with environment credentials preferred in CI. `FTP_SECURE=true` SHALL request TLS; a TLS connection SHALL use normal certificate and hostname verification and retries SHALL not downgrade it silently. Plain FTP remains an explicit supported mode.

#### Scenario: Environment selects passive FTPS
- **WHEN** the FTP credential variables and `FTP_SECURE=true` are set
- **THEN** the command uses passive FTPS with certificate verification
- **AND** basic-ftp is a dependency of the extension, not the core

#### Scenario: Plain FTP is selected explicitly
- **WHEN** the configuration selects plain FTP
- **THEN** the command does not describe the connection as TLS-protected
