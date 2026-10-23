## MODIFIED Requirements

### Requirement: Targets in config
Targets SHALL be declared in config/config-nuckty.ts with configDir and outDir and MAY include lang, host, group and consumer data. The first levels.json entry SHALL select the content root, defaulting to content/. Build with a name SHALL select that target; without a name it SHALL build all declared targets. lang SHALL provide language metadata, not translate Markdown or select a language-specific file. Each target’s sitemap SHALL select its actual sources.

#### Scenario: One repo builds many sites
- **WHEN** a consumer declares `site-ru` and `site-en` with disjoint outputs
- **THEN** `nuckty build` produces both artifacts using each target's config and content
- **AND** `nuckty build site-ru` builds only that target

