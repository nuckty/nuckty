## MODIFIED Requirements

### Requirement: Passive FTP and FTPS, credentials from config or env
Deployment SHALL use passive explicit FTPS through basic-ftp by default, with no SSH dependency in the core. Consumers SHALL exclude `config/auth-ftp.json` from version control. Credentials SHALL come from that file or `FTP_HOST`, `FTP_USER`, `FTP_PASSWORD` (legacy `FTP_PASS`), `FTP_PATH` and `FTP_PORT` environment values, with environment credentials preferred in CI. A TLS connection SHALL use normal certificate and hostname verification and retries SHALL not downgrade it silently. Plain FTP SHALL be selected only by `secure: false` or `FTP_SECURE=false`, and the command SHALL warn before connecting without TLS. The port SHALL default to 21 and SHALL be rejected unless it is an integer from 1 to 65535.

#### Scenario: Environment selects passive FTPS
- **WHEN** the FTP credential variables are set without `FTP_SECURE`
- **THEN** the command uses passive FTPS with certificate verification
- **AND** basic-ftp is a dependency of the extension, not the core

#### Scenario: Plain FTP is selected explicitly
- **WHEN** the configuration sets `secure: false`
- **THEN** the command warns that the password and files are sent unencrypted
- **AND** it does not describe the connection as TLS-protected

#### Scenario: Invalid port
- **WHEN** the configuration sets `port` to `0`, `70000` or `"21a"`
- **THEN** loading the configuration fails before any connection
