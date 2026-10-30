---
"@nuckty/core": patch
"@nuckty/ext-block-grid": patch
---

Directive handlers receive the directive form as `type`; leaf and text `grid` directives fall back to plain content instead of failing the build.
