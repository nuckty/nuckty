## ADDED Requirements

### Requirement: Bilingual demo
The demo SHALL build Russian and English targets with translated pages, examples and interactive controls on demo.nuckty.ru and demo.nuckty.com.

#### Scenario: Requested behavior
- **WHEN** both demo targets are built
- **THEN** each target has five pages, the correct language, canonical origin and alternate-language links

### Requirement: Declares two language targets
The demo SHALL declare Russian default and English en targets with separate configuration directories, output roots and hosts. Russian SHALL retain site/; English SHALL use site-en/.

#### Scenario: Two language targets
- **WHEN** config/config-nuckty.ts is inspected
- **THEN** default and en share demo blocks and generate separate Russian and English outputs

## REMOVED Requirements

### Requirement: Declares one build target
**Reason**: The approved demo now has Russian and English versions.
**Migration**: The default Russian target and site/ output remain; English adds en and site-en/.

