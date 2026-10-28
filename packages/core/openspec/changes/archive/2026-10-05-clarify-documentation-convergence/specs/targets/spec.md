## MODIFIED Requirements

### Requirement: Engine provides data, block emits markup
The engine SHALL NOT emit `<link rel=alternate>` itself. It SHALL provide alternates in DocumentData to the registered document handler. The standard root makes those data available through props; custom handlers decide how to expose and render them. `hreflang="x-default"` and per-page title translation are the block's responsibility.

#### Scenario: Engine does not emit hreflang itself
- **WHEN** a page is rendered and no block consumes `alternates`
- **THEN** no hreflang tags appear in the output
- **AND** a block reading `alternates` can emit `<link rel=alternate hreflang=... href=...>`

### Requirement: Sibling targets and alternates
The engine SHALL provide an alternates map only for targets in the same explicit nonempty `group` that have language and host metadata and a language different from the current target. It SHALL omit the current target and use each sibling's host with the same route. The optional title comes from a caller-provided title map and is empty if no translated title is provided. The current resolver does not inspect another target's sitemap to prove that route exists; consumers requiring only real sibling pages SHALL verify or filter the final URLs.

#### Scenario: Resolver returns explicit group siblings
- **WHEN** `site-ru` and `site-en` share a group and the resolver receives `/catalog` for `site-ru`
- **THEN** it returns the `site-en` host and route, with its title if supplied
- **AND** an ungrouped target adds no alternate
