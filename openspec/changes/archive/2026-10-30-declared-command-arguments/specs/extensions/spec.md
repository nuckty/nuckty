## MODIFIED Requirements

### Requirement: commands entry point
`env.commands` SHALL provide `add(name, description, handler, options?)`. The core knows only `build`; any other command is a command-extension. `options.flags` SHALL declare each accepted option as `'boolean'` or `'string'`, and `options.maxPositionals` SHALL bound the positional arguments. Before calling the handler the CLI SHALL reject an undeclared option, a boolean option with a value other than `true` or `false`, a string option without a value and extra positional arguments, with exit code 1. `handler` receives `args.positional`, `args.flags` with boolean options as booleans, the already loaded `args.config` and the project-root `args.cwd`, and returns an exit code (`0` success, non-zero error) that the core passes to the process.

#### Scenario: Command extension adds a command
- **WHEN** an extension calls `env.commands.add('deploy-ftp', '...', handler, { flags: { force: 'boolean' }, maxPositionals: 1 })`
- **THEN** `nuckty deploy-ftp site-ru --force` invokes the handler with `positional = ['site-ru']` and `flags.force = true`
- **AND** the handler's exit code becomes the process exit code

#### Scenario: Undeclared option
- **WHEN** a user runs `nuckty deploy-ftp --forse`
- **THEN** the CLI reports `unknown option --forse` and exits with 1 without calling the handler
