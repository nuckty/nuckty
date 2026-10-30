---
"@nuckty/core": patch
---

The Markdown bridge drops an unreachable block-level text-directive branch; table cells trim edge whitespace, including no-break spaces, with `\s`. The output is unchanged.
