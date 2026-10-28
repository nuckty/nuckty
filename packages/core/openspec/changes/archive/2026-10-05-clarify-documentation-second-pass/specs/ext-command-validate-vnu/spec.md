## MODIFIED Requirements

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

### Requirement: Optional, JVM-gated
The extension SHALL be optional and require java on PATH (JVM 17+). Startup and validation time depend on JVM, hardware and file count; no fixed or instant duration is promised. The core SHALL NOT require a JVM. Engine unit tests cover individual minimization transformations; consumer document validation remains a separate check.

#### Scenario: Core needs no JVM
- **WHEN** a consumer does not install `validate-vnu`
- **THEN** builds run with no JVM requirement
- **AND** the 30-rule minimization remains covered by engine unit tests
