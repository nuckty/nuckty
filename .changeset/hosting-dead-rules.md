---
"@nuckty/core": patch
---

The generated `.htaccess` no longer contains `FilesMatch` blocks for `_i…` names, which Apache never matches after rewriting to the stored image file, or environment flags that no rule reads. Headers are unchanged.
