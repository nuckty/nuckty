# nuckty — targets spec (1.0.0)

## Purpose

Specify multi-target builds: one repository builds several sites (typically language versions on different domains), and the engine resolves hreflang alternates across sibling targets. The engine provides the alternates data; the consumer's block emits the markup.

## Requirements

### Requirement: Targets in config
Targets SHALL be declared in config/config-nuckty.ts with configDir and outDir and MAY include lang, host, group and consumer data. The first levels.json entry SHALL select the content root, defaulting to content/. Build with a name SHALL select that target; without a name it SHALL build all declared targets. lang SHALL provide language metadata, not translate Markdown or select a language-specific file. Each target’s sitemap SHALL select its actual sources.

#### Scenario: One repo builds many sites
- **WHEN** a consumer declares `site-ru` and `site-en` with disjoint outputs
- **THEN** `nuckty build` produces both artifacts using each target's config and content
- **AND** `nuckty build site-ru` builds only that target

### Requirement: Sibling targets and alternates
The engine SHALL provide an alternates map only for targets in the same explicit nonempty `group` that have language and host metadata and a language different from the current target. Language-tag comparison SHALL ignore ASCII letter case while preserving authored tags in the returned map. It SHALL omit the current target and use each sibling's host with the same route. The optional title comes from a caller-provided title map and is empty if no translated title is provided. The current resolver does not inspect another target's sitemap to prove that route exists; consumers requiring only real sibling pages SHALL verify or filter the final URLs.

#### Scenario: Resolver returns explicit group siblings
- **WHEN** `site-ru` and `site-en` share a group and the resolver receives `/catalog` for `site-ru`
- **THEN** it returns the `site-en` host and route, with its title if supplied
- **AND** an ungrouped target adds no alternate

#### Scenario: Title dictionary owns target keys
- **WHEN** no own title entry is supplied for a sibling named constructor, toString or __proto__
- **THEN** its alternate title is empty rather than an inherited property
- **AND** an explicitly supplied own translated title remains supported

#### Scenario: Language tag case does not create a different language
- **WHEN** the current tag is en-US and a sibling tag is EN-us
- **THEN** that sibling is excluded as the same language tag
- **AND** en-GB remains eligible as a distinct regional tag

### Requirement: group separates independent sites
A nonempty `group` SHALL opt targets into one language family. Targets with another group or no group SHALL not be matched. Without group there are no alternates, avoiding links between unrelated sites that happen to share one repository.

#### Scenario: Different groups do not cross-match
- **WHEN** `main-ru`/`main-en` share `group: 'main'` and `event` has another group
- **THEN** only `main-*` match one another
- **AND** without an explicit group no alternates are generated

### Requirement: Engine provides data, block emits markup
The engine SHALL NOT emit `<link rel=alternate>` itself. It SHALL provide alternates in DocumentData to the registered document handler. The standard root makes those data available through props; custom handlers decide how to expose and render them. `hreflang="x-default"` and per-page title translation are the block's responsibility.

#### Scenario: Engine does not emit hreflang itself
- **WHEN** a page is rendered and no block consumes `alternates`
- **THEN** no hreflang tags appear in the output
- **AND** a block reading `alternates` can emit `<link rel=alternate hreflang=... href=...>`

### Requirement: Explicit target selection
Build setup SHALL distinguish an omitted target from an explicitly supplied name. Only undefined SHALL select all targets; an explicit name SHALL use normal target resolution before output cleanup.

#### Scenario: Unknown empty target
- **WHEN** build receives an empty target name that is not configured
- **THEN** it fails as an unknown target and preserves existing outputs

#### Scenario: Omitted target
- **WHEN** build receives no target value
- **THEN** it retains all-target build behavior
