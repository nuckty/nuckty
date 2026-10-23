## MODIFIED Requirements

### Requirement: Bundles by dependencies
CSS and JS SHALL be collected from the explicit block declaration of each bundle listed in site.json. Blocks absent from that declaration SHALL NOT contribute assets; rendered page content SHALL NOT add them automatically. All configured bundles SHALL be built for the target. The standard root SHALL include all supplied CSS/JS URLs on each page; page-specific selection MAY be supplied by the consumer document handler or root template.

#### Scenario: Bundle collects deps assets only
- **WHEN** `bundles` lists `docs-layout` and its deps include `menu`
- **THEN** the bundle includes `menu.css`/`menu.js`
- **AND** blocks not in the deps are not bundled
