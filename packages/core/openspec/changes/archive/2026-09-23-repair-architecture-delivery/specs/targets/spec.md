## MODIFIED Requirements

### Requirement: Targets in config
Targets SHALL be declared in `config-nuckty.ts` under `targets`. Each target names a `configDir` and `outDir` and MAY declare `lang`, `host`, `group` and consumer `data`. Its first `levels.json` entry selects the content root, defaulting to `content/` when levels are absent. `nuckty build <target>` builds one selected target; `nuckty build` without an argument builds all selected targets.

#### Scenario: One repo builds many sites
- **WHEN** a consumer declares `site-ru` and `site-en` with disjoint outputs
- **THEN** `nuckty build` produces both artifacts using each target's config and content
- **AND** `nuckty build site-ru` builds only that target

### Requirement: Sibling targets and alternates
The engine SHALL provide an alternates map only for targets in the same explicit nonempty `group` that have language and host metadata. It SHALL omit the current target and use each sibling's host with the same route. The optional title comes from a caller-provided title map and is empty if no translated title is provided. The current resolver does not inspect another target's sitemap to prove that route exists; consumers requiring only real sibling pages SHALL verify or filter the final URLs.

#### Scenario: Resolver returns explicit group siblings
- **WHEN** `site-ru` and `site-en` share a group and the resolver receives `/catalog` for `site-ru`
- **THEN** it returns the `site-en` host and route, with its title if supplied
- **AND** an ungrouped target adds no alternate

### Requirement: group separates independent sites
A nonempty `group` SHALL opt targets into one language family. Targets with another group or no group SHALL not be matched. Without group there are no alternates, avoiding links between unrelated sites that happen to share one repository.

#### Scenario: Different groups do not cross-match
- **WHEN** `main-ru`/`main-en` share `group: 'main'` and `event` has another group
- **THEN** only `main-*` match one another
- **AND** without an explicit group no alternates are generated
