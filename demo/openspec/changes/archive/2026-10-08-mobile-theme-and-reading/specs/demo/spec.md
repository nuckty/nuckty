## ADDED Requirements

### Requirement: Discoverable persistent theme control
The enhanced consumer SHALL expose a recognizable theme button with a touch target of at least 40 CSS pixels in each dimension on mobile and desktop. A visitor choice SHALL persist in localStorage on the same origin across navigation and reload. Mobile header controls SHALL remain reachable alongside the prominent wordmark.

#### Scenario: Return to a selected theme
- **WHEN** a visitor selects a theme and navigates to another page or reloads it
- **THEN** the selected theme and button state are restored
- **AND** the button remains visible at phone widths

### Requirement: Compact readable article entry
The consumer SHALL show an ancestor breadcrumb trail without duplicating the current article heading. Breadcrumbs and section controls SHALL use readable fluid interface type. The mobile parent link and section toggle SHALL share one compact navigation band above the heading when space permits and wrap with enlarged text. Desktop SHALL retain the full ancestor trail. Both layouts SHALL preserve complete labels and section navigation.

#### Scenario: Read a deeply nested article on a phone
- **WHEN** a nested page opens on a narrow viewport
- **THEN** the ancestor trail wraps without clipping or repeating the article title
- **AND** the section toggle remains usable without excessive space above the article

