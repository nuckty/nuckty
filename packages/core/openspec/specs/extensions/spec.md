# nuckty — extensions spec (1.0.0)

## Purpose

Specify the single extension contract: `register(env)` with five entry points. Extensions are the only mechanism for adding capability to nuckty. Official extensions use `@nuckty/ext-<type>-<name>` npm names in independent `nuckty-ext-<type>-<name>` repositories; a consumer may also load a local module; the core depends on none of them.

## Requirements

### Requirement: register(env) is the only extension mechanism
An extension SHALL be a package or local module exporting `register(env)` that registers capabilities through the supplied NucktyEnv facades. Extensions SHALL be listed in `config-nuckty.ts` under `ext` (npm package name or local path); the core resolves each and calls `register(env)`. Additional engine capabilities SHALL use the extension facades. Consumer block modules SHALL be discovered separately through configured levels and bundle declarations. One package MAY combine several types in one `register`.

#### Scenario: Consumer composes extensions
- **WHEN** `config-nuckty.ts` lists `ext: ['@nuckty/ext-block-root', './ext/local.ts']`
- **THEN** the core loads each, calls `register(env)`, and uses the union
- **AND** extensions receive the same public facades and execute with the build process’s permissions rather than in a sandbox

#### Scenario: One package combines types
- **WHEN** an extension's `register` calls `env.levels.add`, `env.markdown.use`, and `env.pipeline.after` in one function
- **THEN** all three capabilities are added by the single package

### Requirement: Extension entry points
The env SHALL expose exactly five entry points: `env.pipeline` (pipeline type — build stages/hooks), `env.markdown` (markdown type — Markdown → BEMJSON transforms), `env.levels` (block type — a set of BEM blocks), `env.commands` (command type — CLI commands), and `env.document` (document construction from engine-prepared data).

#### Scenario: Each type has its entry point
- **WHEN** extensions use every entry point
- **THEN** the pipeline type uses `env.pipeline`, markdown uses `env.markdown`, block uses `env.levels`, command uses `env.commands`, and document construction uses `env.document`
- **AND** no other extension entry points exist

### Requirement: document entry point
`env.document.register(handler)` SHALL register one handler that receives `DocumentData`: page metadata, content, asset maps, sitemap, target data, language, and alternates. The handler SHALL return the BEMJSON tree serialized as the document. The core SHALL NOT choose a block name or document structure. A missing handler and a second registration SHALL fail clearly.

#### Scenario: Consumer chooses the document block
- **WHEN** a handler returns `{ block: 'site-document' }`
- **THEN** the HTML stage serializes that tree unchanged
- **AND** the core does not substitute `root`, `page`, or another block name

#### Scenario: Missing handler fails
- **WHEN** the HTML stage builds a page without a registered document handler
- **THEN** the build fails with an error explaining that a handler is required

#### Scenario: Duplicate handler fails
- **WHEN** a second handler is registered
- **THEN** registration fails instead of silently replacing the document implementation

### Requirement: pipeline entry point
`env.pipeline` SHALL provide `before(stage, fn)`, `after(stage, fn)`, and `registerStage(name, fn, { phase })`. `Stage` is `(ctx: BuildContext) => void | Promise<void>` reading/writing the build context.

#### Scenario: Pipeline extension adds a stage
- **WHEN** an extension calls `env.pipeline.registerStage('search', fn, { phase: 'emit' })`
- **THEN** the stage runs in the emit phase for every build

### Requirement: Directive authoring syntax
Directive-based constructs SHALL be authored as generic directives (`:name` / `::name` / `:::name` with `[label]` and `{attributes}`).

#### Scenario: A construct is authored as a directive
- **WHEN** a `.md` contains `:::name[label]{key=value}`
- **THEN** the parser produces name, attributes and mdast children representing the label

### Requirement: env.markdown.directive(name, map)
`env.markdown.directive(name, map)` SHALL pass the directive’s name, parsed attributes and unconverted mdast children to a handler. Label content SHALL be represented by children rather than a separate label property. The handler SHALL return a BemNode-like record or null for ordinary fallback; it SHALL convert child content explicitly rather than assign mdast nodes directly to BEMJSON content. The bridge is mdast → BEMJSON, without a hast hName/hProperties layer.

#### Scenario: Markdown extension maps a directive
- **WHEN** an extension calls `env.markdown.directive('callout', map)`
- **THEN** `:::callout` in any `.md` becomes the `BEMTree` node returned by `map`
- **AND** without it the directive renders as plain content

### Requirement: env.markdown.use(plugin)
`env.markdown.use(plugin)` SHALL register an arbitrary remark plugin as a low-level escape hatch.

#### Scenario: Arbitrary remark plugin is registered
- **WHEN** an extension calls `env.markdown.use(plugin)`
- **THEN** the plugin transforms mdast before the mdast → BEMJSON bridge

### Requirement: levels entry point
`env.levels` SHALL provide `add(dir)`, adding the extension's `blocks/` dir as a level. The engine loads blocks from it by deps, and a site can override them by placing its version on a later level.

#### Scenario: Block extension adds a level
- **WHEN** an extension imports fileURLToPath from node:url and calls `env.levels.add(fileURLToPath(new URL('./blocks/', import.meta.url)))`
- **THEN** its blocks are loadable by deps alongside the site's blocks
- **AND** a later site level overrides them

Block modules SHALL NOT receive `env`. Each `.nu.ts` module SHALL export default `templates()`, import `block` from `@nuckty/core`, and declare only its own block.

### Requirement: commands entry point
`env.commands` SHALL provide `add(name, description, handler)`. The core knows only `build`; any other command is a command-extension. `handler` receives parsed `args.positional` and `args.flags` plus the already loaded `args.config` and project-root `args.cwd` and returns an exit code (`0` success, non-zero error) that the core passes to the process.

#### Scenario: Command extension adds a command
- **WHEN** an extension calls `env.commands.add('deploy-ftp', '...', handler)`
- **THEN** `nuckty deploy-ftp site-ru --force` invokes the handler with those args
- **AND** the handler's exit code becomes the process exit code

### Requirement: Extensions are independent packages
Each independently packaged extension SHALL live in its own repository `nuckty-ext-<type>-<name>` with its own history, dependencies, and release cycle, and an `AGENTS.md` linking `nuckty-codestyle`. The package name derives from the docs path (`/ext/block/root` → `@nuckty/ext-block-root`). The core SHALL NOT depend on any extension or its dependencies (basic-ftp, vnu, sharp, nginx).

#### Scenario: Core carries no extension dependency
- **WHEN** the core's dependencies are inspected
- **THEN** basic-ftp, vnu, and sharp are absent
- **AND** each lives only in its respective extension

### Requirement: Local directory conditional entries
Local directory extensions SHALL resolve nested conditional exports using active Node ESM conditions in declaration order. A matching explicit null target SHALL block resolution. Main-only local packages and direct file modules SHALL retain their existing loading behavior.

#### Scenario: Nested Node import entry
- **WHEN** local exports contains node with an import entry followed by default
- **THEN** the nested import module registers its capabilities

#### Scenario: Earlier default condition
- **WHEN** default precedes import in local conditional exports
- **THEN** the default module registers its capabilities

#### Scenario: Inactive require condition
- **WHEN** require precedes import in local conditional exports
- **THEN** the import entry is selected and require is ignored

### Requirement: Invalid local export targets
Local extension exports SHALL reject invalid targets and SHALL skip invalid target alternatives in an export array before selecting its valid fallback. Targets SHALL remain relative to the package directory.

#### Scenario: Invalid array alternative
- **WHEN** an export array contains ../outside.mjs followed by ./index.mjs
- **THEN** the local extension selects index.mjs

#### Scenario: Invalid conditional value
- **WHEN** an active condition selects a numeric target
- **THEN** loading fails rather than selecting a later default

### Requirement: Local export URL identity
Local extension export targets SHALL preserve URL query and fragment identity and resolve encoded path characters as Node ESM package targets. Target containment validation SHALL apply to the pathname rather than query text.

#### Scenario: Encoded filename with module query
- **WHEN** a local export selects a percent-encoded filename with query and fragment
- **THEN** the module loads and observes the original query and fragment

### Requirement: Independent extension environments

Each NucktyEnv instance SHALL retain its own command, document, Markdown, level and pending pipeline registrations.

#### Scenario: Registrations stay with their build environment

- **WHEN** an extension registers behavior in one of two independently created environments
- **THEN** the second environment has no corresponding registration, and registering different behavior there does not change the first environment's observable results

### Requirement: External command separator rejection regression

The content-external regression suite SHALL exercise a derived repository name containing a backslash when claiming separator rejection.

#### Scenario: Backslash in repository name

- **WHEN** getRepoName receives a URL whose last component contains a backslash
- **THEN** the regression verifies an unsafe-name error rather than asserting only ordinary URL parsing

### Requirement: Observable startup cancellation fixture

The validator startup cancellation regression SHALL synchronize stop with an observed pending health request rather than a fixed wall-clock delay.

#### Scenario: Stop during readiness request

- **WHEN** the owned validator has entered its pending readiness request and stop is called
- **THEN** validation rejects with the stopped reason and the test verifies owned child termination

### Requirement: Owned preview output destinations

Serve SHALL reject symbolic links in its build directory, preview config, PID and generated log destinations before output access or nginx launch. Symbolic consumer roots SHALL remain supported through their canonical root.

#### Scenario: Linked runtime output

- **WHEN** a preview output destination contains a symbolic link
- **THEN** serve refuses without modifying outside bytes or launching nginx

### Requirement: Accurate CI schedule reporting

CI schedule comments SHALL describe day-of-month steps accurately. Cache metrics SHALL NOT predict the next execution from a fixed elapsed-day interval when the configured cron does not provide it.

#### Scenario: Monthly step schedule

- **WHEN** cron selects every fifth or sixth day-of-month value
- **THEN** comments explain its monthly reset and metrics omit unsupported next-run predictions

### Requirement: Literal-safe artifact link checks

Artifact link checking SHALL ignore tag-shaped text in comments and raw-text element bodies, retain real opening-element attributes, decode their HTML character references, and tokenize quoted greater-than characters correctly.

#### Scenario: Fake anchor identifier

- **WHEN** a linked ID appears only in a comment or script string
- **THEN** the checker reports a missing anchor

#### Scenario: Named attribute reference

- **WHEN** an actual element ID contains `&copy;` and a link names the corresponding percent-encoded Unicode character
- **THEN** the checker compares the decoded attribute values and accepts the existing anchor

### Requirement: Explicit snapshot repository names

Snapshot resolve, prepare and verify SHALL accept only own configured repository names and reject unsupported inherited keys before filesystem access or Git runner invocation.

#### Scenario: Prototype-looking repository name

- **WHEN** an operation receives constructor, toString or __proto__ as a repository name
- **THEN** it fails with unsupported-name error before accessing a directory or invoking Git

### Requirement: Complete raw-text regions in artifact checks

Link and gallery checkers SHALL treat iframe, xmp, noembed, noframes and plaintext bodies as literal text, in addition to script, style, textarea and title. Raw-text names SHALL match complete tag names. Real opening-tag IDs SHALL remain visible to link checking.

#### Scenario: Raw-text fake ID

- **WHEN** a linked ID appears only inside a raw-text body
- **THEN** link checking reports the missing anchor

#### Scenario: Similar custom tag name

- **WHEN** an ordinary element name starts with a raw-text name followed by a hyphen
- **THEN** its descendant elements remain visible to link checking

### Requirement: Complete password hook synthetic configuration

The synthetic password-hook fixture SHALL supply normal target site configuration and test missing/malformed optional password inputs independently, without unrelated successful-run configuration warnings.

#### Scenario: Normal synthetic configuration

- **WHEN** the password hook tests optional values
- **THEN** site.json exists and missing-password checks remain observable

### Requirement: Verified dependency audit remediation

Maintained package and consumer dependencies SHALL use verified patched versions for confirmed audit findings while retaining their documented CLI, native runtime, lint and specification behavior. Remediation SHALL NOT hide advisories or substitute a narrower behavior contract to obtain a green audit.

#### Scenario: Patched Git command dependency

- **WHEN** the content preparation Git dependency is updated for command-execution advisories
- **THEN** clean/origin/clone/LFS/refusal contracts continue passing meaningful tests and its lockfile audit has no unresolved finding

#### Scenario: Unpatched transitive package

- **WHEN** upstream has no patched release
- **THEN** the review records that fact and verifies an actual compatible remediation rather than ignoring the advisory or claiming success from an unchanged version

### Requirement: Compatible maintained brace traversal repair

A maintained local brace-expansion repair SHALL preserve the published API and ordinary pattern outputs while avoiding call-stack exhaustion on deeply nested patterns within the existing input-length contract. Remediation SHALL use iterative traversal rather than lowering accepted pattern depth solely to pass the audit. Fork provenance, license and the security repair SHALL be explicit.

#### Scenario: Deep supported pattern

- **WHEN** compile, stringify or expand processes a deeply nested pattern below the existing character limit
- **THEN** it completes without a native recursion overflow and ordinary brace outputs remain compatible

### Requirement: Installed CLI package version
The CLI SHALL print the installed `@nuckty/core` package manifest version for both `--version` and `-v`, independently of the consumer working directory.

#### Scenario: Versioned package release
- **WHEN** a consumer invokes either version flag after installing a new core release
- **THEN** stdout contains `nuckty <package.json version>` and a newline with exit code zero
