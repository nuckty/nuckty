# nuckty — ext-command-validate-vnu spec (1.0.0)

## Purpose

Specify optional validation of built HTML through W3C Nu Html Checker (vnu.jar), requiring Java. This provides a concrete document-structure check alongside exact serializer unit tests; neither minimization nor unit tests alone certify arbitrary consumer markup. No comparative claim about all other validators is made.

## Requirements

### Requirement: validate command via vnu
The extension SHALL add `nuckty validate [target]` via env.commands. It SHALL recursively validate HTML under the selected target’s outDir/html, choosing the first declared target when omitted. Unknown targets, unsupported flags, absent directories, empty file sets or validation failures SHALL yield a nonzero exit code. The command SHALL use Nu Html Checker; conforming optional-tag omission and unquoted attributes SHALL be accepted.

#### Scenario: Target selection picks the right artifact
- **WHEN** `nuckty validate b` runs in a project with targets `a` and `b` with
  different outDirs
- **THEN** only `b`'s HTML files are validated
- **AND** an invalid file in `a`'s artifact does not fail the run

#### Scenario: Minimal output validates clean
- **WHEN** `nuckty validate` runs on a conforming artifact with permitted optional-tag omissions and unquoted attrs
- **THEN** vnu reports zero errors
- **AND** superhtml is not used

### Requirement: Persistent HTTP daemon, parallel, cached
One validator instance SHALL start its own vnu.jar process lazily, validate files with bounded concurrent HTTP requests and cache results by file content while that instance lives. The command SHALL stop and await its owned process when its validation run ends, including after a failure. Spawn failure, premature child exit, timeout and malformed protocol response SHALL fail the run. A worker failure SHALL stop scheduling new files and wait for in-flight work before cleanup.

#### Scenario: Process is reused within a validation run
- **WHEN** one validator instance checks several pages and validates unchanged input again
- **THEN** it can reuse its owned process and cached result during that run
- **AND** completion stops and awaits the process

#### Scenario: Failure is not reported as a valid page
- **WHEN** startup, HTTP protocol or one worker fails
- **THEN** the command reports failure rather than an empty valid result
- **AND** no later work is scheduled after failure while in-flight work settles

### Requirement: Optional, JVM-gated
The extension SHALL be optional and require java on PATH (JVM 17+). Startup and validation time depend on JVM, hardware and file count; no fixed or instant duration is promised. The core SHALL NOT require a JVM. Engine unit tests cover individual minimization transformations; consumer document validation remains a separate check.

#### Scenario: Core needs no JVM
- **WHEN** a consumer does not install `validate-vnu`
- **THEN** builds run with no JVM requirement
- **AND** the 30-rule minimization remains covered by engine unit tests

### Requirement: Unknown option presence
The command SHALL reject every unsupported option key, including an empty key, before accessing cwd or invoking filesystem/runtime operations. Supported argument behavior SHALL remain unchanged.

#### Scenario: Empty unknown key
- **WHEN** flags contains an unsupported empty-string key
- **THEN** the command reports an option error before cwd access

