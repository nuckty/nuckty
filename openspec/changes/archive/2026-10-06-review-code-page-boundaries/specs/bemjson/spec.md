## ADDED Requirements

### Requirement: Entity stringification respects modifier ownership
Stringification of a BemEntity element SHALL select its element modifiers rather than block modifiers. Block entities SHALL retain block-modifier selection. A chosen false, null or undefined modifier SHALL be skipped while selecting the first supported modifier for the single entity string.

#### Scenario: An element modifier survives stringification
- **WHEN** an entity has block menu, element item and an active element modifier
- **THEN** stringification returns menu__item_active
- **AND** supplying unrelated block modifiers does not substitute them for the element’s modifier
