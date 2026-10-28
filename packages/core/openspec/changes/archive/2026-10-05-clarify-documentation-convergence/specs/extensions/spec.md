## MODIFIED Requirements

### Requirement: Directive authoring syntax
Directive-based constructs SHALL be authored as generic directives (`:name` / `::name` / `:::name` with `[label]` and `{attributes}`).

#### Scenario: A construct is authored as a directive
- **WHEN** a `.md` contains `:::name[label]{key=value}`
- **THEN** the parser produces name, attributes and mdast children representing the label

### Requirement: Extension entry points
The env SHALL expose exactly five entry points: `env.pipeline` (pipeline type — build stages/hooks), `env.markdown` (markdown type — Markdown → BEMJSON transforms), `env.levels` (block type — a set of BEM blocks), `env.commands` (command type — CLI commands), and `env.document` (document construction from engine-prepared data).

#### Scenario: Each type has its entry point
- **WHEN** extensions use every entry point
- **THEN** the pipeline type uses `env.pipeline`, markdown uses `env.markdown`, block uses `env.levels`, command uses `env.commands`, and document construction uses `env.document`
- **AND** no other extension entry points exist

### Requirement: Extensions are independent packages
Each independently packaged extension SHALL live in its own repository `nuckty-ext-<type>-<name>` with its own history, dependencies, and release cycle, and an `AGENTS.md` linking `nuckty-codestyle`. The package name derives from the docs path (`/ext/block/root` → `nuckty-ext-block-root`). The core SHALL NOT depend on any extension or its dependencies (basic-ftp, vnu, sharp, nginx).

#### Scenario: Core carries no extension dependency
- **WHEN** the core's dependencies are inspected
- **THEN** basic-ftp, vnu, and sharp are absent
- **AND** each lives only in its respective extension

### Requirement: commands entry point
`env.commands` SHALL provide `add(name, description, handler)`. The core knows only `build`; any other command is a command-extension. `handler` receives parsed `args.positional` and `args.flags` plus the already loaded `args.config` and project-root `args.cwd` and returns an exit code (`0` success, non-zero error) that the core passes to the process.

#### Scenario: Command extension adds a command
- **WHEN** an extension calls `env.commands.add('deploy-ftp', '...', handler)`
- **THEN** `nuckty deploy-ftp site-ru --force` invokes the handler with those args
- **AND** the handler's exit code becomes the process exit code

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

### Requirement: env.markdown.directive(name, map)
`env.markdown.directive(name, map)` SHALL pass the directive’s name, parsed attributes and unconverted mdast children to a handler. Label content SHALL be represented by children rather than a separate label property. The handler SHALL return a BemNode-like record or null for ordinary fallback; it SHALL convert child content explicitly rather than assign mdast nodes directly to BEMJSON content. The bridge is mdast → BEMJSON, without a hast hName/hProperties layer.

#### Scenario: Markdown extension maps a directive
- **WHEN** an extension calls `env.markdown.directive('callout', map)`
- **THEN** `:::callout` in any `.md` becomes the `BEMTree` node returned by `map`
- **AND** without it the directive renders as plain content

### Requirement: levels entry point
`env.levels` SHALL provide `add(dir)`, adding the extension's `blocks/` dir as a level. The engine loads blocks from it by deps, and a site can override them by placing its version on a later level.

#### Scenario: Block extension adds a level
- **WHEN** an extension imports fileURLToPath from node:url and calls `env.levels.add(fileURLToPath(new URL('./blocks/', import.meta.url)))`
- **THEN** its blocks are loadable by deps alongside the site's blocks
- **AND** a later site level overrides them

Block modules SHALL NOT receive `env`. Each `.nu.ts` module SHALL export default `templates()`, import `block` from `nuckty`, and declare only its own block.

### Requirement: pipeline entry point
`env.pipeline` SHALL provide `before(stage, fn)`, `after(stage, fn)`, and `registerStage(name, fn, { phase })`. `Stage` is `(ctx: BuildContext) => void | Promise<void>` reading/writing the build context.

#### Scenario: Pipeline extension adds a stage
- **WHEN** an extension calls `env.pipeline.registerStage('search', fn, { phase: 'emit' })`
- **THEN** the stage runs in the emit phase for every build

### Requirement: register(env) is the only extension mechanism
An extension SHALL be a package or local module exporting `register(env)` that registers capabilities through the supplied NucktyEnv facades. Extensions SHALL be listed in `config-nuckty.ts` under `ext` (npm package name or local path); the core resolves each and calls `register(env)`. Additional engine capabilities SHALL use the extension facades. Consumer block modules SHALL be discovered separately through configured levels and bundle declarations. One package MAY combine several types in one `register`.

#### Scenario: Consumer composes extensions
- **WHEN** `config-nuckty.ts` lists `ext: ['nuckty-ext-block-root', './ext/local.ts']`
- **THEN** the core loads each, calls `register(env)`, and uses the union
- **AND** extensions receive the same public facades and execute with the build process’s permissions rather than in a sandbox

#### Scenario: One package combines types
- **WHEN** an extension's `register` calls `env.levels.add`, `env.markdown.use`, and `env.pipeline.after` in one function
- **THEN** all three capabilities are added by the single package
