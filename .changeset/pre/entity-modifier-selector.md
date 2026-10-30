---
"@nuckty/core": minor
---

`.mod()` in a template selector now refines the selected entity: a block modifier on a block selector and an element modifier after `.elem()`. Previously `block('menu').elem('item').mod('active')` was accepted but never matched. `.elemMod()` is removed, and `.elem()` after `.mod()` is rejected.
