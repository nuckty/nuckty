## MODIFIED Requirements

### Requirement: serve command
The extension SHALL add `nuckty serve [target] [--port N]` via `env.commands`. It SHALL reject an unknown target and a port outside 1–65535, require the selected target's built artifact, and use the core hosting generator for `.build/serve/<target>/nginx.conf`. The selected `listen` port SHALL appear inside the server block. Nginx SHALL be started in the foreground with the PID and logs in the same target directory.

#### Scenario: Serve uses the selected artifact and port
- **WHEN** `nuckty serve target-b --port 8088` runs after the selected build
- **THEN** it serves only target-b from a configuration with `listen 8088` in the server block
- **AND** missing artifacts, unknown targets and invalid ports fail before starting nginx

#### Scenario: Two targets are served at once
- **WHEN** `nuckty serve ru --port 8091` and `nuckty serve en --port 8093` run in one project
- **THEN** each target uses its own configuration, PID and logs under `.build/serve/<target>/`
- **AND** a rebuild keeps both runtime directories

### Requirement: stop targets only this project's nuckty daemon
The extension SHALL add `nuckty stop [target]`. With a target it SHALL use `.build/serve/<target>/nginx.pid`; without one it SHALL do so for every declared target. It SHALL check the available process identity against nginx and the target's configuration before signalling. It SHALL distinguish absent, successfully signalled, failed and unrelated-process outcomes; failed signalling SHALL not be reported as success or erase a live PID record. It SHALL never use a global process-name kill.

#### Scenario: Stop signals only an owned nginx
- **WHEN** the PID file refers to an unrelated or unverifiable process
- **THEN** no signal is sent and the command reports the condition

#### Scenario: Two projects are isolated
- **WHEN** two consumers/worktrees serve their artifacts
- **THEN** each uses a separate project PID and configuration
- **AND** stopping one does not signal the other's nginx

#### Scenario: Stop selects a target
- **WHEN** previews of `ru` and `en` run and `nuckty stop en` is invoked
- **THEN** only the `en` preview receives a signal

### Requirement: Generated preview configuration
Serving SHALL use the core nginx generator’s compression, image negotiation and flat-URL rules. It SHALL generate its own runtime configuration, so hooks that customize the build’s nginx.conf or Apache .htaccess SHALL NOT be assumed to run for serve. The extension requires nginx on PATH and MAY be installed as a devDependency; CI that exercises native serving SHALL install it explicitly.

#### Scenario: Preview uses the core generator
- **WHEN** the site is served locally
- **THEN** its separate runtime configuration uses the core generator’s negotiation and flat-URL rules
- **AND** build-file hooks and arbitrary production settings are not implicitly imported
- **AND** the extension requires `nginx` in `PATH`
