# nuckty — ext-command-serve spec (1.0.0)

## Purpose

Specify local nginx serving of the selected built artifact. The extension checks the built configuration, then generates project-scoped nginx-serve.conf through the core generator. This tests the generator’s routing and negotiation behavior; it does not certify an arbitrary production server or consumer hosting customization.

## Requirements

### Requirement: serve command
The extension SHALL add `nuckty serve [target] [--port N]` via `env.commands`. It SHALL reject an unknown target and a port outside 1–65535, require the selected target's built artifact and nginx configuration, and use the core hosting generator for a project-scoped `nginx-serve.conf`. The selected `listen` port SHALL appear inside the server block. Nginx SHALL be started in the foreground with project-scoped PID and logs.

#### Scenario: Serve uses the selected artifact and port
- **WHEN** `nuckty serve target-b --port 8088` runs after the selected build
- **THEN** it serves only target-b from a configuration with `listen 8088` in the server block
- **AND** missing artifacts, unknown targets and invalid ports fail before starting nginx

### Requirement: stop targets only this project's nuckty daemon
The extension SHALL add `nuckty stop` using the project's `<buildDir>/nginx.pid`. It SHALL check the available process identity against nginx and this project's configuration before signalling. It SHALL distinguish absent, successfully signalled, failed and unrelated-process outcomes; failed signalling SHALL not be reported as success or erase a live PID record. It SHALL never use a global process-name kill.

#### Scenario: Stop signals only an owned nginx
- **WHEN** the PID file refers to an unrelated or unverifiable process
- **THEN** no signal is sent and the command reports the condition

#### Scenario: Two projects are isolated
- **WHEN** two consumers/worktrees serve their artifacts
- **THEN** each uses a separate project PID and configuration
- **AND** stopping one does not signal the other's nginx

### Requirement: Generated preview configuration
Serving SHALL use the core nginx generator’s compression, image negotiation and flat-URL rules. It SHALL generate a separate nginx-serve.conf, so hooks that customize the build’s nginx.conf or Apache .htaccess SHALL NOT be assumed to run for serve. The extension requires nginx on PATH and MAY be installed as a devDependency; CI that exercises native serving SHALL install it explicitly.

#### Scenario: Preview uses the core generator
- **WHEN** the site is served locally
- **THEN** its separate runtime configuration uses the core generator’s negotiation and flat-URL rules
- **AND** build-file hooks and arbitrary production settings are not implicitly imported
- **AND** the extension requires `nginx` in `PATH`

### Requirement: Unknown option presence
The command SHALL reject every unsupported option key, including an empty key, before accessing cwd or invoking filesystem/runtime operations. Supported argument behavior SHALL remain unchanged.

#### Scenario: Empty unknown key
- **WHEN** flags contains an unsupported empty-string key
- **THEN** the command reports an option error before cwd access

