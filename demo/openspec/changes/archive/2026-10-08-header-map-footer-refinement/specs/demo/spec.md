## ADDED Requirements

### Requirement: Unframed theme and animated burger
The consumer SHALL retain the theme touch target without a border. The burger SHALL morph its existing lines into a cross with a 0.3 second transition, remain rendered during the transition, and honor reduced-motion preferences.

#### Scenario: Open mobile navigation
- **WHEN** the mobile toggle opens navigation
- **THEN** its existing lines visibly converge and rotate into a cross

### Requirement: Stable footer links
Footer text and links SHALL share consistent baselines and spacing, including narrow wrapped layouts. Documentation page source links SHALL appear inside the footer rather than beneath the article.

#### Scenario: Read a documentation footer
- **WHEN** the reader reaches the footer on a phone or desktop
- **THEN** the page source link belongs to its navigation and shares its type and alignment

