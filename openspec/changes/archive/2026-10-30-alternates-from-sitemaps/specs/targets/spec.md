## MODIFIED Requirements

### Requirement: Sibling targets and alternates
The engine SHALL provide an alternates map only for targets in the same explicit nonempty `group` that have language and host metadata and a language different from the current target. Language-tag comparison SHALL ignore ASCII letter case while preserving authored tags in the returned map. It SHALL omit the current target and use each sibling's host with the same route. During a build the engine SHALL read each sibling's `sitemap.yml`: a route missing there SHALL get no alternate, and an existing page SHALL supply its title. A sibling without a `sitemap.yml` SHALL be linked with an empty title.

#### Scenario: Resolver returns explicit group siblings
- **WHEN** `site-ru` and `site-en` share a group and both sitemaps contain `/catalog`
- **THEN** the alternates of `/catalog` in `site-ru` contain the `site-en` URL with the `site-en` page title
- **AND** an ungrouped target adds no alternate

#### Scenario: Missing sibling page
- **WHEN** `/only-ru` exists in `site-ru` but not in the `site-en` sitemap
- **THEN** `/only-ru` gets no `en` alternate

#### Scenario: Title dictionary owns target keys
- **WHEN** no own page entry is supplied for a sibling named constructor, toString or __proto__
- **THEN** its alternate title is empty rather than an inherited property
- **AND** an explicitly supplied own page title remains supported

#### Scenario: Language tag case does not create a different language
- **WHEN** the current tag is en-US and a sibling tag is EN-us
- **THEN** that sibling is excluded as the same language tag
- **AND** en-GB remains eligible as a distinct regional tag
